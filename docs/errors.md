# Error codes

Every error code the API returns or a worker records, and what the client should do.
Source of truth: this file. `api.md` (not written yet) and [queue.md](queue.md) reference these codes.

## Response shape

Proposed; may change when the API contract is agreed.

```json
{
  "error": {
    "code": "VOICE_NOT_ASSIGNABLE",
    "message": "Voice must be ready and belong to this studio.",
    "details": { "voiceId": "…" }
  }
}
```

| Field     | Type             | Notes                                                                       |
| --------- | ---------------- | --------------------------------------------------------------------------- |
| `code`    | string           | Stable; one of the codes below. Clients branch on this, never on `message`. |
| `message` | string           | Human-readable English. May change at any time.                             |
| `details` | object, optional | Code-specific data (field errors, limits, conflicting ids).                 |

## HTTP errors

| Code                     | HTTP | When                                                                                                                                                              | What the client should do                          |
| ------------------------ | ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| `VALIDATION_FAILED`      | 400  | Request body, query or params fail validation. `details.fields` lists the problems.                                                                               | Fix the input and resend.                          |
| `UNAUTHENTICATED`        | 401  | No valid session cookie.                                                                                                                                          | Send the user to sign-in.                          |
| `FORBIDDEN`              | 403  | The user's `studio_members.role` does not allow the action.                                                                                                       | Hide or disable the action.                        |
| `NOT_FOUND`              | 404  | The resource does not exist, is soft-deleted, or belongs to another studio.                                                                                       | Remove it from the UI; refresh the list.           |
| `INVALID_PROJECT_STATUS` | 409  | The action is not allowed in the current `projects.status` (for example, confirming the cast outside `awaiting_cast`). `details.status` holds the current status. | Refresh the project and show the allowed actions.  |
| `UPLOAD_ALREADY_PENDING` | 409  | The project already has a `pending` upload (`uploads_one_pending_uq`).                                                                                            | Resume the existing upload instead.                |
| `UPLOAD_EXPIRED`         | 410  | The upload passed `uploads.expires_at` (status `expired`).                                                                                                        | Start a new upload.                                |
| `QUOTA_EXCEEDED`         | 422  | The upload pre-check (size, duration) exceeds the studio quota. `details` holds the limit and the actual value.                                                   | Show the limit; ask for a shorter or smaller file. |
| `VOICE_NOT_ASSIGNABLE`   | 422  | The voice is not `ready`, is soft-deleted, or belongs to another studio.                                                                                          | Pick a `ready` voice from this studio.             |
| `CAST_INCOMPLETE`        | 422  | Cast confirm while a character has no voice. `details.characterIds` lists them.                                                                                   | Assign a voice to each listed character.           |
| `VOICE_IN_USE`           | 409  | Voice soft-delete while characters still use it.                                                                                                                  | Reassign those characters, then delete.            |
| `RENDER_BLOCKED`         | 409  | Render requested while a segment is `flagged`. `details.segmentIds` lists them.                                                                                   | Resolve the flagged segments, then render.         |
| `EXPORT_IN_PROGRESS`     | 409  | Render requested while an export is `rendering` (`exports_one_rendering_uq`).                                                                                     | Wait for the current export to finish.             |
| `INTERNAL_ERROR`         | 500  | Unexpected server error.                                                                                                                                          | Retry later; report if it persists.                |

> OPEN: 403 or 404 for a resource in another studio. Proposed: 404, so ids from other studios are not revealed.

> OPEN: soft-deleting a voice in use either returns `VOICE_IN_USE` or clears `characters.voice_id` itself ([schema-notes.md](schema-notes.md#deletes)). Keep `VOICE_IN_USE` only if blocking is chosen.

> OPEN: quota limits (max size, max duration).

## Stage failure codes

Workers record these in `stage_runs.error` when a stage fails. The project goes to `failed`.

Proposed format: `<CODE>: <message>`.

| Code             | Stage            | When                                                                                  | What the client should do |
| ---------------- | ---------------- | ------------------------------------------------------------------------------------- | ------------------------- |
| `MEDIA_INVALID`  | `validate`       | ffprobe cannot read the file, it is not a supported video, or it has no audio stream. | Ask for a different file. |
| `QUOTA_EXCEEDED` | `validate`       | The measured duration exceeds the quota.                                              | Ask for a shorter video.  |
| `VENDOR_ERROR`   | any vendor stage | The vendor call still fails after all retries.                                        | Offer retry.              |
| `STAGE_TIMEOUT`  | any              | The run passed its timeout ([queue.md](queue.md#jobs)); set by the stuck-run sweeper. | Offer retry.              |

- A segment that is still too long after 2 re-translations is not an error: the segment becomes `flagged`.
- A failed segment synthesis is not a stage failure: the version becomes `failed` and the segment shows up in review.
