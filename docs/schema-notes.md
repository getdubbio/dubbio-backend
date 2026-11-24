# Schema notes

Database rules `dubbio.dbml` cannot express: partial indexes, CHECK constraints, app-enforced rules, derived values.
Source of truth: `dubbio.dbml` + this file. The Drizzle schema (`src/database/schema/`) implements both; if it disagrees, fix Drizzle.

Check every generated migration against this file.

## 0. Pending schema changes

Agreed, but not yet in `dubbio.dbml` or Drizzle. They land in a separate PR (`feat/database-character-name-extracted-audio`).

| Change                               | Why                                                                    |
| ------------------------------------ | ---------------------------------------------------------------------- |
| `characters.name text`               | The cast gate renames characters.                                      |
| `asset_kind` value `extracted_audio` | Output of `extract_audio`; input to `transcribe` and `separate_stems`. |

> OPEN: `characters.name` nullability and default (for example `Speaker 1` from `segmentize`).

## 1. Partial indexes

Drizzle: `uniqueIndex(...).on(...).where(sql`...`)` or `index(...).on(...).where(sql`...`)`.
None of these exist in Drizzle yet.

```sql
-- One row per project for single-instance asset kinds; a re-run replaces it.
create unique index assets_singleton_kind_uq on assets (project_id, kind)
  where kind not in ('segment_audio', 'export_video', 'dubbed_track');

-- Only one render per project at a time.
create unique index exports_one_rendering_uq on exports (project_id)
  where status = 'rendering';

-- Only one pending video upload per project at a time.
create unique index uploads_one_pending_uq on uploads (project_id)
  where status = 'pending';

-- Sweeper for stuck runs. There is no plain index on stage_runs.status.
create index stage_runs_active_idx on stage_runs (status, updated_at)
  where status in ('queued', 'running');

-- List queries never return soft-deleted rows.
create index projects_studio_created_idx on projects (studio_id, created_at)
  where deleted_at is null;
create index voices_studio_status_idx on voices (studio_id, status)
  where deleted_at is null;
```

- The last two are the dbml's `(studio_id, created_at)` and `(studio_id, status)` indexes, made partial. They replace the plain ones.
- The plain `assets (project_id, kind)` and `uploads (project_id)` indexes stay.

## 2. CHECK constraints

Drizzle: `check('name', sql`...`)`.

```sql
-- An upload's target matches its kind. Name and condition from dubbio.dbml.
alter table uploads add constraint valid_upload check (
  (kind = 'project_video' and voice_id is null) or
  (kind = 'voice_sample'  and project_id is null));

-- Not in Drizzle yet:
alter table segments add constraint segments_time_ck
  check (end_ms > start_ms);

-- A version may lack a voice only while it is translated-only or failed.
alter table segment_versions add constraint versions_voice_ck
  check (status in ('pending', 'failed') or voice_id is not null);
```

- `valid_upload` lets a `voice_sample` upload start with `voice_id` null: the `voices` row is created when the upload completes (see [Voices](#voices)).

## 3. Known drift to fix

| Where                            | Now                                                                          | Should be                                               |
| -------------------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------- |
| `dubbio.dbml` `stage_runs`       | column `attemptsCount`                                                       | `attempts_count` (what Drizzle generates)               |
| `dubbio.dbml` `segment_versions` | index `(t.segmentId, t.version)`                                             | `(segment_id, version) [unique]`                        |
| `dubbio.dbml` `uploads`          | `valid_upload` uses `"project_video"` (double quotes are identifiers in SQL) | single quotes                                           |
| `dubbio.dbml` `stage_runs`       | no unique                                                                    | `(project_id, stage, input_hash) [unique]` (in Drizzle) |
| `dubbio.dbml` `segments`         | no index on `current_version_id`                                             | index (in Drizzle)                                      |
| Drizzle `uploads`                | check named `kind_check`                                                     | `valid_upload`                                          |

## 4. Drizzle specifics

- **Circular reference.** `segments.current_version_id` -> `segment_versions`, and `segment_versions.segment_id` -> `segments`. Annotate one side with `(): AnyPgColumn => ...`.
- **Insert order.** Insert the segment with `current_version_id = null`, insert the version, then set the pointer.
- **`segments.character_id`** keeps the default delete action (no action). Not `restrict`: it would block the project cascade.
- **Timestamps** are `timestamptz` everywhere.

## 5. Rules the application enforces

### Tenancy

- Every query is scoped by `studio_id`, directly or through the project.
- A studio or project id from the client is never trusted without a `studio_members` check.

### Cast and synthesis

- **Cast confirmed is not a column.** Confirming the cast moves the project from `awaiting_cast` to `synthesizing`.
- **Synthesis starts when both are true:** project status is `synthesizing` and the latest `translate` run has `succeeded`. Both the confirm handler and the coordinator check this after `select ... for update` on the project row. The synthesize job id is deterministic.
- **Voice assignment:** the voice belongs to the project's studio, has status `ready`, and `deleted_at` is null.
- **Gender `unknown`:** the translator uses neutral phrasing where the target language allows. It never defaults to male.

### Segments and versions

- **New version = current version.** Creating a version points `segments.current_version_id` at it in the same transaction, which resets `review_status` to `pending`.
- **Approved means locked.** Re-translate and bulk regenerate skip segments with `review_status = approved`. There is no separate lock column.
- **Versions are never edited in place.** A text, emotion or voice change creates a new row.
- **Version number** is stored in `segment_versions.version`, unique per segment.
  > OPEN: how `version` is assigned. Proposed: `max(version) + 1` for the segment, inside the insert transaction.
- **Too-long audio:** the re-translate counter (`retranslateCount`, max 2) lives in the `segment.regenerate` payload. After the limit, the segment is set to `flagged`.
- **Emotion** (`segments.emotion`, `segment_versions.emotion`) is one of `neutral`, `happy`, `sad`, `angry`, `fearful`, `surprised` (`EMOTIONS` in `src/infrastructure/providers/interfaces/shared.types.ts`; see [ai.md](ai.md#shared-values)). Default `neutral` when analysis is missing.

### Voices

- A `voice_sample` upload starts with `voice_id` null. The `voices` row is created when the upload completes, so `r2_sample_key` and `sample_duration_ms` are known and stay NOT NULL (temporary; may be revisited).

### Deletes

- **Projects and voices are soft-deleted** (`deleted_at`). List queries filter it.
- **Soft-deleting a voice** does not fire `set null`. The delete endpoint either blocks while characters use the voice (`VOICE_IN_USE`) or clears `characters.voice_id` itself.
  > OPEN: block or clear.
- **Hard-deleting a project** (purge): delete the R2 objects listed in `assets` first, then the project row. The cascade removes the `assets` rows that hold the keys.

### Workers

- **Idempotency:** before a paid vendor call, look for a `succeeded` `stage_runs` row with the same `(project_id, stage, input_hash)` and reuse its output.
- **Resume:** if a `running` row has a `vendor_request_id`, poll that request instead of submitting a new one.
- **Failure:** write the reason to `stage_runs.error` ([errors.md](errors.md#stage-failure-codes)), then set the project to `failed`.
- **Single-instance assets** (`source_video`, `extracted_audio`, `dialogue_track`, `background_track`, `transcript`, `analysis`) are upserted on re-run.

## 6. Derived, never stored

| Value                  | How to get it                                           |
| ---------------------- | ------------------------------------------------------- |
| Current pipeline stage | Latest `stage_runs` rows for the project                |
| Stage run time         | `updated_at - created_at`                               |
| Export number (vN)     | Row order by `created_at` within the project            |
| Review progress        | Count of `segments` by `review_status`                  |
| Studio usage           | Sum of `projects.duration_ms`                           |
| Subtitles (SRT)        | Generated on request from segments and current versions |
| Files of one export    | R2 key prefix `exports/{export_id}/`                    |

A new column needs a reason this table cannot cover.

## 7. Known limits and decisions

- **One target language per project.** `segment_versions` has no language column; multi-language dubbing needs a restructure.
- **Decided, ADR pending:** `users.id` and every FK to it are `uuid`; better-auth is configured to generate uuid ids.
- **Decided, ADR pending:** better-auth's organization plugin stays off; `studios` + `studio_members` model tenancy.
