# Glossary

Project terms, one line each.
Source of truth: this file. Table, column and enum names come from `dubbio.dbml`.

| Term                  | Meaning                                                                                                                                                                 |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Approved              | `review_status = approved`. Also means locked: re-translate and bulk regenerate skip the segment.                                                                       |
| Asset                 | A file in R2 tracked by an `assets` row, classified by `asset_kind`.                                                                                                    |
| Attempts              | `stage_runs.attempts_count`: how many times a run has been tried. Retries reuse the row.                                                                                |
| Background track      | `background_track` asset: the non-dialogue stem. Skips review and goes straight to `mix`.                                                                               |
| Cast                  | The voice and gender given to each character.                                                                                                                           |
| Cast gate             | Human step (G1) where the user renames and merges characters, sets gender and assigns voices. Confirming moves the project to `synthesizing`.                           |
| Character             | A speaker in one project (`characters`), created by `segmentize` from one transcript speaker.                                                                           |
| Coordinator           | The `pipeline.advance` job. It decides which stages run next after every stage finishes.                                                                                |
| Current version       | The segment version that `segments.current_version_id` points at. Changing it resets `review_status` to `pending`.                                                      |
| Dialogue track        | `dialogue_track` asset: the vocals stem from `separate_stems`.                                                                                                          |
| Dubbed track          | `dubbed_track` asset: the mixed target-language audio for one export.                                                                                                   |
| Export                | One render of a project: an `exports` row plus its `export_video` asset. Numbered v1, v2, ... by `created_at`.                                                          |
| Extracted audio       | `extracted_audio` asset: the original audio track from `extract_audio`. Input to `transcribe` and `separate_stems`.                                                     |
| Flagged               | `review_status = flagged`. Needs a human fix: still too long after 2 re-translations, or marked by a reviewer. Blocks render.                                           |
| Gate                  | A step where the pipeline waits for a human: the cast gate or the review gate.                                                                                          |
| Idempotency key       | The BullMQ `jobId` of a job, so the same work is not enqueued twice.                                                                                                    |
| Input hash            | `stage_runs.input_hash`: a hash of a stage's inputs. The same hash means the stage's earlier output can be reused.                                                      |
| Join                  | Synthesis starts only when the project is `synthesizing` and the latest `translate` run has `succeeded`.                                                                |
| Mix                   | Stage `mix`: place segment audio on the timeline, duck the background track, normalize loudness.                                                                        |
| Mock provider         | Fake vendor adapter used when `PROVIDERS_MODE=mock`.                                                                                                                    |
| Mux                   | Stage `mux`: copy the video stream and attach the dubbed audio.                                                                                                         |
| Project               | One dubbing job: one source video, one source language, one target language (`projects`).                                                                               |
| Purge                 | Hard delete of a project: R2 objects first, then the row.                                                                                                               |
| Render                | The `mix` -> `mux` -> `export` stages, run by the `project.export` job.                                                                                                 |
| Review gate           | Human step (G2) where the user listens, edits, regenerates, approves or flags segments.                                                                                 |
| Review status         | `segments.review_status`: `pending`, `approved` or `flagged`.                                                                                                           |
| Segment               | One timed source line spoken by one character (`segments`).                                                                                                             |
| Segment version       | One translation and synthesis of a segment (`segment_versions`). Never edited in place; an edit creates a new row.                                                      |
| Single-instance asset | An asset kind with at most one row per project (`source_video`, `extracted_audio`, `dialogue_track`, `background_track`, `transcript`, `analysis`). Upserted on re-run. |
| Soft delete           | Setting `deleted_at` instead of deleting the row. Used for `projects` and `voices`.                                                                                     |
| Stage                 | One pipeline step, a `pipeline_stage` value (for example `transcribe`).                                                                                                 |
| Stage run             | One execution of a stage for a project (`stage_runs`), with status, error and vendor request id.                                                                        |
| Studio                | The tenant (`studios`). Every project, voice and upload belongs to one.                                                                                                 |
| Studio member         | A user's membership and `member_role` in a studio (`studio_members`).                                                                                                   |
| Too long              | Synthesized audio that does not fit the segment's slot after time-stretch. Triggers a shorter re-translation, at most 2 times.                                          |
| Vendor request id     | `stage_runs.vendor_request_id`: the vendor's task id, so a restarted worker resumes polling instead of paying again.                                                    |
| Voice                 | A cloned voice shared across a studio (`voices`). Only `ready`, non-deleted voices can be assigned.                                                                     |
