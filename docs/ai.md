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

| Name        | Values                                                     | Stored in                                                  |
| ----------- | ---------------------------------------------------------- | ---------------------------------------------------------- |
| `Emotion`   | `neutral`, `happy`, `sad`, `angry`, `fearful`, `surprised` | `segments.emotion`, `segment_versions.emotion` (`varchar`) |
| `Gender`    | `male`, `female`, `unknown`                                | `characters.gender` (`gender` enum)                        |
| `Intensity` | number, 0 to 1                                             | only inside the `analysis` asset (JSON on R2)              |

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

- Input is the `extracted_audio` asset (an agreed but not yet added `asset_kind` value, schema-notes.md §0). `numSpeakers` is passed when known.
- The adapter returns spoken words only. Vendor tokens for spacing and audio events are dropped.
- Stored as the `transcript` asset (JSON). Word timings live only there, not in the database.

## Source separation

- Input is the `extracted_audio` asset. Output is the `dialogue_track` and `background_track` assets.
- Off the critical path: only `project.export` needs it (queue.md).

## Segmentize

Pure code, no vendor. Turns transcript words into `characters` and `segments`.

- One character per transcript speaker (`characters.provider_speaker_id`).
  Code: `src/ai/segmentize.ts` (tests next to it). Defaults in `DEFAULT_SEGMENTIZE_OPTIONS`; `SEGMENTIZE_RULES_VERSION` goes into the input hash.

- A segment ends at:
  - a speaker change;
  - a pause longer than `maxPauseMs` (500 ms);
  - sentence-final punctuation followed by a pause of at least `minSentencePauseMs` (150 ms), once the segment is at least `minSegmentMs` (1 s) long. Two sentences said in one breath stay together;
  - `maxSegmentMs` (8 s).
    > OPEN: the thresholds are starting values, tuned on the test set in week 3.
- Analysis labels map to the transcript speaker they overlap most in time.
- Gender: from the analysis speaker mapped to this character; `unknown` when there is none, or when two labels mapped to it disagree.
- Emotion: from the analysis moment that overlaps the segment most, counting moments of the same speaker double; otherwise `neutral`.
- **Output maps to existing columns only:** characters get `provider_speaker_id` and `gender`; segments get `start_ms`, `end_ms`, `source_text`, `emotion`. Addressee and intensity stay in the `analysis` asset.

## Test scene

`src/infrastructure/providers/mock/fixtures/scene.fixture.ts`: a 28 s, two-character scene written for Dubbio, in the shape of the MVP clip. The transcription and analysis mocks return it, and the segmentize tests run on it. It has two traps: same-speaker lines 200 ms apart, and analysis labels (`A`, `B`) that differ from transcript ids.

## Translation

One call translates a batch of lines with their context. Plain sentence-by-sentence translation is not enough for dubbing.

| Field per line | Why                                                                                   |
| -------------- | ------------------------------------------------------------------------------------- |
| `maxChars`     | Keeps the line speakable within `durationMs`. See below.                              |
| `speaker`      | Arabic verbs and pronouns agree with the speaker's gender.                            |
| `emotion`      | Wording changes with delivery: an angry and a sarcastic «Are you serious?» differ.    |
| `context`      | Lines around the batch, with their translation when one exists, for meaning and tone. |

- `targetLanguage` is a BCP 47 tag of the variety, for example `ar-EG`.
- **Gender `unknown`:** neutral phrasing where the language allows; never default to male (schema-notes.md).
- **Listener's gender:** verbs and pronouns also agree with the person spoken to («إنت كنت فين؟» vs «إنتي كنتي فين؟»). The input does not carry the listener; the prompt asks the model to infer it from the surrounding lines.
- **Approved segments** are never sent as `lines`, only as `context`.
- **`maxChars`** = `floor(durationMs / 1000 × charsPerSecond)`, at least `MIN_CHARS` (4). Counted by `spokenLength()`: graphemes, without tashkeel or tatweel. Code: `src/ai/char-budget.ts`.
  > OPEN: `charsPerSecond` is a placeholder (`DEFAULT_CHARS_PER_SECOND = 14`) until the week-4 measurement with the cloned voices.
- **Too long after synthesis:** `segment.regenerate` re-translates with `shorterBudget()`: the old budget scaled by target ÷ generated duration, minus 10%, and always at least one character lower (queue.md).

### Prompt

`src/ai/translation-prompt.ts`, vendor-free: `buildTranslationPrompt()` returns `{ system, user }` for any chat model; `parseTranslationResponse()` reads its JSON answer and reports `missing`, `unexpected` and `too_long` lines instead of failing. `TRANSLATION_PROMPT_VERSION` goes into the input hash.

Rules in the system prompt, in priority order: length, meaning, gender agreement (speaker given; listener inferred from the surrounding lines; `unknown` never becomes masculine), emotion, Egyptian colloquial register in Arabic script without diacritics, continuity from context lines.

Try it without an API key:

```sh
pnpm ai:prompt print              # prompt for the test scene; paste it into any chat model
pnpm ai:prompt check answer.json  # checks the model's answer: ids and length per line
```

## Synthesis

- Input per segment: the current version's text, the character's voice, `emotion`, `seed`.
- `durationMs` comes back from the provider and is stored in `segment_versions.duration_ms`.
- Small overrun: time-stretch. Large overrun: `segment.regenerate` (queue.md).
  > OPEN: the largest stretch that still sounds natural. Measured by listening in week 7.

## Input hash

`stage_runs.input_hash` = `inputHash(inputs)` from `src/infrastructure/queue/input-hash.ts`: sha256 of canonical JSON, keys sorted, `undefined` dropped. Answers the OPEN in [queue.md](queue.md#jobs).

| Stage            | Inputs                                                                                                              |
| ---------------- | ------------------------------------------------------------------------------------------------------------------- |
| `analyze_video`  | `source_video` r2 key, `projects.source_lang`, prompt version, model                                                |
| `transcribe`     | `extracted_audio` r2 key, `projects.source_lang`, `numSpeakers`, model                                              |
| `separate_stems` | `extracted_audio` r2 key, model                                                                                     |
| `segmentize`     | `transcript` r2 key, `analysis` r2 key or null, `SEGMENTIZE_RULES_VERSION`                                          |
| `translate`      | per line sent: segment id, `source_text`, `maxChars`, speaker gender, emotion; `target_lang`, prompt version, model |
| `synthesize`     | per segment: current version id, voice id, seed; model                                                              |

- A cast change alters the genders in `translate`'s inputs, so only the affected batch re-runs.
- **The r2 key must change when the file changes.** Proposed: keys include the stage run id, for example `projects/{project_id}/{kind}/{stage_run_id}.{ext}`.
  > OPEN: agree on the key format with the backend.
