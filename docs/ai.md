# AI stages

Contracts and rules for the stages that call AI vendors: `analyze_video`, `transcribe`, `separate_stems`, `segmentize`, `translate`, `synthesize`, and `voice.clone`.
Source of truth: this file for AI behavior. Jobs, payloads and the stage sequence stay in [queue.md](queue.md); table rules in [schema-notes.md](schema-notes.md).

## Providers

Every vendor sits behind an interface in `src/infrastructure/providers/interfaces/`. `PROVIDERS_MODE` picks the adapters; `mock` is the only mode today.

| Token                        | Interface                  | Call style      | Vendor (planned)       | Queue         |
| ---------------------------- | -------------------------- | --------------- | ---------------------- | ------------- |
| `TRANSCRIPTION_PROVIDER`     | `TranscriptionProvider`    | one call        | ElevenLabs Scribe      | `stt`         |
| `VIDEO_ANALYSIS_PROVIDER`    | `VideoAnalysisProvider`    | `submit`/`poll` | TwelveLabs Pegasus     | `vision`      |
| `SOURCE_SEPARATION_PROVIDER` | `SourceSeparationProvider` | one call        | demucs on a GPU worker | `gpu`         |
| `TRANSLATION_PROVIDER`       | `TranslationProvider`      | one call        | LLM, picked in week 5  | `translation` |
| `TTS_PROVIDER`               | `TtsProvider`              | one call        | ElevenLabs             | `tts`         |
| `VOICE_CLONE_PROVIDER`       | `VoiceCloneProvider`       | one call        | ElevenLabs IVC         | `voice`       |

- **`submit`/`poll`** is for vendors that run a background task. The worker writes `VendorTask.requestId` to `stage_runs.vendor_request_id` right after `submit`, then polls. A restarted worker finds the id and polls instead of submitting again (schema-notes.md, Resume).
- **One call** is used where a 30 to 60 second clip returns within the job timeout. If long files need it, the interface moves to `submit`/`poll`.
- Every output that comes from a model carries a `model` string. It goes into `input_hash`, so a model change re-runs the stage, and into evaluation results.

## Shared values

Defined once in `interfaces/shared.types.ts`.

| Name        | Values                                                         | Stored in                                                  |
| ----------- | -------------------------------------------------------------- | ---------------------------------------------------------- |
| `Emotion`   | `neutral`, `happy`, `sad`, `angry`, `fearful`, `surprised`     | `segments.emotion`, `segment_versions.emotion` (`varchar`) |
| `Gender`    | `male`, `female`, `unknown`                                    | `characters.gender` (`gender` enum)                        |
| `Intensity` | number, 0 to 1; absent = the vendor's default for that emotion | not stored yet (see [Open](#open))                         |

`isEmotion()` validates a string before it is written to the `varchar` columns.

## Video analysis

`analyze_video` returns hints, not facts. It is non-blocking (queue.md): without it, characters get `gender = unknown` and segments `emotion = neutral`.

```ts
type VideoAnalysisOutput = {
  speakers: { label: string; gender: Gender; description?: string }[];
  moments: {
    startMs: number;
    endMs: number;
    speakerLabel: string | null;
    addresseeLabel: string | null; // null: a group, the audience, or unknown
    emotion: Emotion;
    intensity?: Intensity;
  }[];
};
```

- Stored as the `analysis` asset (JSON).
- **Labels are the video model's.** They do not match the transcript's speaker ids. `segmentize` maps each analysis label to the transcript speaker it overlaps most in time.
- The prompt asks for JSON that matches this type. The adapter validates it with zod and drops moments it cannot parse, rather than failing the stage.

## Transcription

- Input is the `extracted_audio` asset. `numSpeakers` is passed when known.
- The adapter returns spoken words only. Vendor tokens for spacing and audio events are dropped.
- Stored as the `transcript` asset (JSON). Word timings live only there, not in the database.

## Source separation

- Input is the `extracted_audio` asset. Output is the `dialogue_track` and `background_track` assets.
- Off the critical path: only `project.export` needs it (queue.md).

## Segmentize

Pure code, no vendor. Turns transcript words into `characters` and `segments`.

- One character per transcript speaker (`characters.provider_speaker_id`).
- A segment ends at a speaker change, a pause longer than the pause threshold, sentence-final punctuation once the segment is longer than the minimum length, or the maximum segment length.
  > OPEN: the thresholds. Tuned on the test set in week 3.
- Gender: from the analysis speaker mapped to this character; otherwise `unknown`.
- Emotion: from the analysis moment that overlaps the segment most; otherwise `neutral`.
- Addressee: from the same moment, mapped to a character. Needs a column (see [Open](#open)).

## Translation

One call translates a batch of lines with their context. Plain sentence-by-sentence translation is not enough for dubbing.

| Field per line | Why                                                                                   |
| -------------- | ------------------------------------------------------------------------------------- |
| `maxChars`     | Keeps the line speakable within `durationMs`. See below.                              |
| `speaker`      | Arabic verbs and pronouns agree with the speaker's gender.                            |
| `addressee`    | They also agree with the listener's gender: «إنت كنت فين؟» vs «إنتي كنتي فين؟».       |
| `emotion`      | Wording changes with delivery: an angry and a sarcastic «Are you serious?» differ.    |
| `context`      | Lines around the batch, with their translation when one exists, for meaning and tone. |

- `targetLanguage` is a BCP 47 tag of the variety, for example `ar-EG`.
- **Gender `unknown`:** neutral phrasing where the language allows; never default to male (schema-notes.md).
- **Approved segments** are never sent as `lines`, only as `context`.
- **`maxChars`** = `floor(durationMs / 1000 × charsPerSecond)`.
  > OPEN: `charsPerSecond` for Egyptian Arabic with the cloned voices. Measured in week 4.
- **Too long after synthesis:** `segment.regenerate` re-translates with a lower `maxChars` (queue.md).

## Synthesis

- Input per segment: the current version's text, the character's voice, `emotion`, optional `intensity`, `seed`.
- `durationMs` comes back from the provider and is stored in `segment_versions.duration_ms`.
- Small overrun: time-stretch. Large overrun: `segment.regenerate` (queue.md).
  > OPEN: the largest stretch that still sounds natural. Measured by listening in week 7.

## Input hash

`stage_runs.input_hash` = `inputHash(inputs)` from `src/infrastructure/queue/input-hash.ts`: sha256 of canonical JSON, keys sorted, `undefined` dropped. Answers the OPEN in [queue.md](queue.md#jobs).

| Stage            | Inputs                                                                                                                            |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `analyze_video`  | `source_video` r2 key, `projects.source_lang`, prompt version, model                                                              |
| `transcribe`     | `extracted_audio` r2 key, `projects.source_lang`, `numSpeakers`, model                                                            |
| `separate_stems` | `extracted_audio` r2 key, model                                                                                                   |
| `segmentize`     | `transcript` r2 key, `analysis` r2 key or null, rules version                                                                     |
| `translate`      | per line sent: segment id, `source_text`, `maxChars`, speaker and addressee gender, emotion; `target_lang`, prompt version, model |
| `synthesize`     | per segment: current version id, voice id, seed; model                                                                            |

- A cast change alters the genders in `translate`'s inputs, so only the affected batch re-runs.
- **The r2 key must change when the file changes.** Proposed: keys include the stage run id, for example `projects/{project_id}/{kind}/{stage_run_id}.{ext}`.
  > OPEN: agree on the key format with the backend.

## Open

- **Addressee column.** Proposed: `segments.addressee_character_id uuid null`, FK `characters.id`, `on delete set null`. A character merge also moves addressees to the kept character.
- **Intensity column.** Proposed: `emotion_intensity smallint null` (0 to 100) on `segments` and `segment_versions`, or defer and state it in the report.
- **`voices.error text`:** why a clone failed. `stage_runs` cannot hold it, because voice jobs have no run row.
- **`stage_runs` output.** Job results live in Redis and expire. For `translate` and `synthesize` the reused output is found from `segment_versions`; a `stage_runs.output jsonb` would make it explicit.
