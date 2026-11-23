# Queue and events

BullMQ queues, jobs, payloads and Redis events shared by the API and the worker.
Source of truth: this file. Names come from `dubbio.dbml` and `src/infrastructure/queue/queue.constants.ts`.

- API process: produces jobs only. Worker process (`src/main.worker.ts`): consumes them.
- Error codes: [errors.md](errors.md). Terms: [glossary.md](glossary.md). Table rules: [schema-notes.md](schema-notes.md).

## Queues

Concurrency is per worker process.

| Queue         | Job names                                                                      | Concurrency |
| ------------- | ------------------------------------------------------------------------------ | ----------- |
| `pipeline`    | `pipeline.advance`, `stage.segmentize`                                         | 5           |
| `media`       | `stage.validate`, `stage.extract_audio`                                        | 2           |
| `vision`      | `stage.analyze_video`                                                          | 5           |
| `stt`         | `stage.transcribe`                                                             | 5           |
| `gpu`         | `stage.separate_stems`                                                         | 1 (per GPU) |
| `translation` | `stage.translate`                                                              | 5           |
| `tts`         | `stage.synthesize`, `segment.regenerate`                                       | 4           |
| `render`      | `project.export`                                                               | 1           |
| `voice`       | `voice.clone`, `voice.delete`                                                  | 3           |
| `maintenance` | > OPEN: job names for project purge, expired-upload cleanup, stuck-run sweeper | 1           |

- `test.ping` on `pipeline` is temporary (`dev-ping.controller.ts`, `test.processor.ts`). It is removed when the `pipeline.advance` processor lands.
- Concurrency, retry, backoff and timeout numbers here and below are proposals. Verify them under real load and vendor rate limits before production.

## Jobs

| Job                    | Queue         | Retry / backoff     | Timeout | Idempotency key (BullMQ `jobId`)                 |
| ---------------------- | ------------- | ------------------- | ------- | ------------------------------------------------ |
| `pipeline.advance`     | `pipeline`    | 5, exponential 1 s  | 30 s    | `pipeline.advance_<project_id>_<stage_run_id>`   |
| `stage.validate`       | `media`       | 3, exponential 5 s  | 2 min   | `stage.validate_<project_id>_<input_hash>`       |
| `stage.extract_audio`  | `media`       | 3, exponential 5 s  | 10 min  | `stage.extract_audio_<project_id>_<input_hash>`  |
| `stage.analyze_video`  | `vision`      | 5, exponential 30 s | 30 min  | `stage.analyze_video_<project_id>_<input_hash>`  |
| `stage.transcribe`     | `stt`         | 5, exponential 30 s | 30 min  | `stage.transcribe_<project_id>_<input_hash>`     |
| `stage.separate_stems` | `gpu`         | 2, exponential 60 s | 60 min  | `stage.separate_stems_<project_id>_<input_hash>` |
| `stage.segmentize`     | `pipeline`    | 3, exponential 5 s  | 5 min   | `stage.segmentize_<project_id>_<input_hash>`     |
| `stage.translate`      | `translation` | 5, exponential 15 s | 15 min  | `stage.translate_<project_id>_<input_hash>`      |
| `stage.synthesize`     | `tts`         | 3, exponential 30 s | 60 min  | `stage.synthesize_<project_id>_<input_hash>`     |
| `segment.regenerate`   | `tts`         | 3, exponential 10 s | 5 min   | `segment.regenerate_<segment_version_id>`        |
| `project.export`       | `render`      | 2, exponential 60 s | 60 min  | `project.export_<export_id>`                     |
| `voice.clone`          | `voice`       | 5, exponential 30 s | 10 min  | `voice.clone_<voice_id>`                         |
| `voice.delete`         | `voice`       | 5, exponential 60 s | 5 min   | `voice.delete_<voice_id>`                        |

- **Separator.** Job ids use `_`, not `:`. BullMQ rejects custom ids that contain `:` (except a legacy 3-part form it plans to drop).
- **The `jobId` stops a double enqueue only while the job is still in Redis.** The real guard is `stage_runs`: before a paid vendor call, the worker reuses a `succeeded` run with the same `(project_id, stage, input_hash)`.
- **`input_hash`** is a hash of everything the stage reads (input asset keys, languages, cast, settings).
  > OPEN: exact inputs hashed per stage.
- **Timeouts** are enforced in the worker, because BullMQ has no per-job timeout. The stuck-run sweeper (`maintenance`) fails `stage_runs` rows left `queued`/`running` past their timeout.
- **Retries.** A retry reuses the same `stage_runs` row and increments `attempts_count`. After the last attempt the stage fails (see [Retry from the failed stage](#retry-from-the-failed-stage)).
- **Voice jobs** have no `stage_runs` row (`stage_runs.project_id` is not null). `voice.clone` skips the vendor call if `voices.provider_voice_id` is already set.

## Payloads and results

`studioId` is in every payload, so workers scope every query by studio.

```ts
type BaseJobPayload = { studioId: string }; // src/infrastructure/queue/queue.types.ts
type StagePayload = BaseJobPayload & { projectId: string; inputHash: string };

// pipeline.advance: decides and enqueues the next stage(s). stageRunId is absent on the first call.
type PipelineAdvancePayload = BaseJobPayload & {
  projectId: string;
  stageRunId?: string;
};
type PipelineAdvanceResult = { enqueued: string[] }; // job names

type ValidatePayload = StagePayload;
type ValidateResult = { durationMs: number }; // also written to projects.duration_ms
// > OPEN: where the cost estimate from validate is returned or stored.

type ExtractAudioPayload = StagePayload;
type ExtractAudioResult = { assetId: string }; // asset_kind extracted_audio

type AnalyzeVideoPayload = StagePayload;
type AnalyzeVideoResult = { assetId: string }; // asset_kind analysis; vendor task id in stage_runs.vendor_request_id

type TranscribePayload = StagePayload;
type TranscribeResult = { assetId: string }; // asset_kind transcript

type SeparateStemsPayload = StagePayload;
type SeparateStemsResult = {
  dialogueAssetId: string;
  backgroundAssetId: string;
};

type SegmentizePayload = StagePayload;
type SegmentizeResult = { characterCount: number; segmentCount: number };

// segmentIds absent: every segment not approved. Present: only these (cast change).
type TranslatePayload = StagePayload & { segmentIds?: string[] };
type TranslateResult = { versionCount: number };

type SynthesizePayload = StagePayload;
type SynthesizeResult = { ready: number; failed: number; flagged: number };

// retranslateCount: auto re-translations already done for this segment (max 2).
type SegmentRegeneratePayload = BaseJobPayload & {
  projectId: string;
  segmentId: string;
  segmentVersionId: string;
  retranslateCount: number;
};
type SegmentRegenerateResult = { status: "ready" | "failed" | "flagged" };

type ProjectExportPayload = BaseJobPayload & {
  projectId: string;
  exportId: string;
};
type ProjectExportResult = { videoAssetId: string }; // exports.video_asset_id

type VoiceClonePayload = BaseJobPayload & { voiceId: string };
type VoiceCloneResult = { providerVoiceId: string }; // voices.provider_voice_id

type VoiceDeletePayload = BaseJobPayload & { voiceId: string };
type VoiceDeleteResult = void;
```

## Events

Workers publish progress on Redis pub/sub. Publishing is best effort: a failed publish is logged and never fails the job.

| Item     | Value                                                                                                |
| -------- | ---------------------------------------------------------------------------------------------------- |
| Channel  | `events:{studio_id}`                                                                                 |
| Envelope | `{ type: string; projectId?: string; data?: unknown }` (`src/infrastructure/events/events.types.ts`) |

| Event                   | Payload                              |
| ----------------------- | ------------------------------------ |
| `test.ping` (temporary) | `{ jobId: string; message: string }` |

> OPEN: event names and payloads for project status, stage progress, segment, voice and export updates.

## Pipeline sequence

Stage names match `pipeline_stage`; statuses match `project_status`. Each stage execution is one `stage_runs` row.

**Coordinator.** Every stage job ends by enqueuing `pipeline.advance`. That job reads the project status and the latest `stage_runs`, then enqueues every stage whose needs are met. Stage jobs never enqueue the next stage themselves.

### Upload to cast

| #   | Job                    | Starts when                      | Produces                                                     | Project status                  |
| --- | ---------------------- | -------------------------------- | ------------------------------------------------------------ | ------------------------------- |
| 1   | (API) create project   | user request                     | `projects` row                                               | `uploading`                     |
| 2   | (API) upload complete  | multipart upload confirmed       | `source_video` asset; enqueues `pipeline.advance`            | `uploading` -> `queued`         |
| 3   | `stage.validate`       | `source_video` exists            | `projects.duration_ms`, quota check                          | `queued` -> `processing`        |
| 4   | `stage.extract_audio`  | 3 succeeded                      | `extracted_audio` asset; video stream untouched              | `processing`                    |
| 5   | `stage.analyze_video`  | 3 succeeded                      | `analysis` asset (gender, emotion, addressee)                | `processing`                    |
| 6   | `stage.transcribe`     | 4 succeeded                      | `transcript` asset (words, timestamps, speakers)             | `processing`                    |
| 7   | `stage.separate_stems` | 4 succeeded                      | `dialogue_track`, `background_track` assets                  | not on the critical path        |
| 8   | `stage.segmentize`     | 6 succeeded (uses 5 if finished) | `characters` (one per speaker), `segments`                   | `processing` -> `awaiting_cast` |
| 9   | `stage.translate`      | 8 succeeded                      | one `segment_versions` row per segment (`pending`, no voice) | `awaiting_cast`                 |

- In parallel: 4 and 5 after 3; 6 and 7 after 4; 9 and the cast gate after 8.
- `stage.analyze_video` is non-blocking (temporary rule, may change). If it is missing or failed, characters get `gender = unknown` and segments get `emotion = neutral`; the user fixes them at the gates.

### Cast gate to review

| #   | Step               | Starts when                                                             | Produces                                                           | Project status                               |
| --- | ------------------ | ----------------------------------------------------------------------- | ------------------------------------------------------------------ | -------------------------------------------- |
| G1  | (API) cast gate    | 8 succeeded                                                             | names, merges, gender, a `ready` voice per character               | `awaiting_cast` -> `synthesizing` on confirm |
| 10  | `stage.synthesize` | status is `synthesizing` **and** the latest `translate` run `succeeded` | per segment: `segment_audio` asset, version `ready`, `duration_ms` | `synthesizing` -> `in_review`                |

- **Join.** The confirm handler and `pipeline.advance` (after translate) both lock the project row (`select ... for update`) and check both conditions. A deterministic `jobId` makes a double enqueue harmless.
- **Cast change after translate.** A gender change or merge enqueues `stage.translate` with `segmentIds` of the affected, non-approved segments. Each re-translation is a new version.
- **Per segment:** TTS -> measure -> time-stretch to fit the slot. If it is still too long, enqueue `segment.regenerate` with `retranslateCount + 1` (re-translate shorter, then synthesize). After 2 re-translations the segment is set to `flagged`.
- A segment failure does not fail the project: the version becomes `failed` and the segment shows up in review.
- The project moves to `in_review` (via `pipeline.advance`) when every segment's current version is `ready` or `failed`, or the segment is `flagged`.

### Review to export

| #   | Step                 | Starts when                 | Produces                                                                                                                          | Project status             |
| --- | -------------------- | --------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | -------------------------- |
| G2  | (API) review gate    | 10 done                     | approved or flagged segments, new versions                                                                                        | `in_review`                |
| 11  | (API) request render | no segment is `flagged`     | `exports` row (`rendering`)                                                                                                       | `in_review` -> `rendering` |
| 12  | `project.export`     | 11 done **and** 7 succeeded | runs `mix`, `mux`, `export` in order (one `stage_runs` row each); `dubbed_track` and `export_video` assets; `exports` row `ready` | `rendering` -> `completed` |

- `mix`: place segment audio on the timeline, duck the background track, loudness-normalize. Output is assumed to be the `dubbed_track` asset (> OPEN: confirm).
- `mux`: copy the video stream (`-c:v copy`) and attach the dubbed audio.
- `export`: store the MP4, set `exports.status = ready` and the project to `completed`.
- Only one render per project at a time (`exports_one_rendering_uq`).

### Retry from the failed stage

1. A stage exhausts its retries: the worker writes `stage_runs.error`, sets the run to `failed` and the project to `failed`.
2. Retry is triggered by the user. TODO(api): endpoint, and the project status set on retry.
3. `pipeline.advance` re-runs the pipeline. Stages that already `succeeded` with the same `input_hash` are skipped, so no vendor call is paid twice.
4. A run left `running` with a `vendor_request_id` resumes polling that vendor task instead of submitting a new one.

### Regeneration after a review edit

1. The user edits text, speaker, emotion or voice, or asks for a regenerate (new `seed`). TODO(api): endpoints.
2. In one transaction the API inserts a new `segment_versions` row, points `segments.current_version_id` at it, and resets `review_status` to `pending`. Versions are never edited in place.
3. The API enqueues `segment.regenerate` (`retranslateCount: 0`). Only that segment is synthesized again; the project stays `in_review`.
4. Approved segments are locked: re-translate and bulk regenerate skip them.

### Re-render after `completed`

1. The user goes back to review: project `completed` -> `in_review`.
2. Edits follow [Regeneration after a review edit](#regeneration-after-a-review-edit). Unchanged segments keep their audio.
3. A new render creates a new `exports` row (v1, v2, ... by `created_at` order).

### Voice jobs

| Job            | Starts when                                        | Effect                                                                                                           |
| -------------- | -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `voice.clone`  | voice sample upload completed and consent recorded | `voices.status` `draft` -> `cloning` -> `ready` (or `failed`, `verification_required`); sets `provider_voice_id` |
| `voice.delete` | voice soft-deleted                                 | removes the voice at the vendor. Assumed: status `deleting` while it runs (> OPEN: confirm)                      |
