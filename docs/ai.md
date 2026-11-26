# AI provider contracts

The interfaces between the pipeline and the AI vendors, what each one takes and returns, and the mocks behind them.
Jobs, payloads and the stage sequence stay in [queue.md](queue.md); table rules in [schema-notes.md](schema-notes.md).

## Providers

Every vendor sits behind an interface in `src/infrastructure/providers/interfaces/`. `PROVIDERS_MODE` picks the adapters; `mock` is the only mode today.

| Token                        | Interface                  | Call style      | Vendor (planned)       | Queue         |
| ---------------------------- | -------------------------- | --------------- | ---------------------- | ------------- |
| `TRANSCRIPTION_PROVIDER`     | `TranscriptionProvider`    | one call        | ElevenLabs Scribe      | `stt`         |
| `VIDEO_ANALYSIS_PROVIDER`    | `VideoAnalysisProvider`    | `submit`/`poll` | TwelveLabs Pegasus     | `vision`      |
| `SOURCE_SEPARATION_PROVIDER` | `SourceSeparationProvider` | one call        | demucs on a GPU worker | `gpu`         |
| `TRANSLATION_PROVIDER`       | `TranslationProvider`      | one call        | LLM, not chosen yet    | `translation` |
| `TTS_PROVIDER`               | `TtsProvider`              | one call        | ElevenLabs             | `tts`         |
| `VOICE_CLONE_PROVIDER`       | `VoiceCloneProvider`       | one call        | ElevenLabs IVC         | `voice`       |

- **`submit`/`poll`** is for vendors that run a background task. The worker writes `VendorTask.requestId` to `stage_runs.vendor_request_id` right after `submit`, then polls. A restarted worker finds the id and polls instead of submitting again (schema-notes.md, Resume).
- **One call** is used where a 30 to 60 second clip returns within the job timeout. If long files need it, the interface moves to `submit`/`poll`.
- Outputs that come from a model carry a `model` string, so results can be traced to the model that made them.

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
- **Labels are the video model's.** They do not match the transcript's speaker ids; a later stage joins them to transcript speakers by time overlap.
- The adapter validates the vendor's JSON with zod and drops moments it cannot parse, rather than failing the stage.

## Transcription

- Input is the `extracted_audio` asset (an agreed but not yet added `asset_kind` value, schema-notes.md §0). `numSpeakers` is passed when known.
- The adapter returns spoken words only. Vendor tokens for spacing and audio events are dropped.
- Stored as the `transcript` asset (JSON). Word timings live only there, not in the database.

## Source separation

- Input is the `extracted_audio` asset. Output is the `dialogue_track` and `background_track` assets.
- Off the critical path: only `project.export` needs it (queue.md).

## Translation

One call translates a batch of lines with their context. Plain sentence-by-sentence translation is not enough for dubbing.

| Field      | Why                                                                                   |
| ---------- | ------------------------------------------------------------------------------------- |
| `maxChars` | Keeps the line speakable within `durationMs`.                                         |
| `speaker`  | Arabic verbs and pronouns agree with the speaker's gender.                            |
| `emotion`  | Wording changes with delivery: an angry and a surprised «Are you serious?» differ.    |
| `context`  | Lines around the batch, with their translation when one exists, for meaning and tone. |

- `sourceLanguage` and `targetLanguage` are `projects.source_lang` and `projects.target_lang` as stored, for example `en` and `ar`.
- **Gender `unknown`:** neutral phrasing where the language allows; never default to male (schema-notes.md).
- **Approved segments** are never sent as `lines`, only as `context`.

## Test scene

`src/infrastructure/providers/mock/fixtures/scene.fixture.ts`: a 28 s, two-character scene written for Dubbio, in the shape of the MVP clip. The transcription and video analysis mocks return it, so the pipeline runs on realistic data without vendor keys. It has two traps for later stages: same-speaker lines 200 ms apart, and analysis labels (`A`, `B`) that differ from transcript ids.
