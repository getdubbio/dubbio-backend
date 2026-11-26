// Types shared by more than one provider. Values match the database
// (`segments.emotion`, `segment_versions.emotion`, `gender` enum) and
// docs/ai.md.

export const EMOTIONS = [
  "neutral",
  "happy",
  "sad",
  "angry",
  "fearful",
  "surprised",
] as const;

export type Emotion = (typeof EMOTIONS)[number];

export const isEmotion = (value: string): value is Emotion =>
  (EMOTIONS as readonly string[]).includes(value);

// Same values as the `gender` pg enum.
export type Gender = "male" | "female" | "unknown";

// 0 = barely there, 1 = as strong as it gets. Only in the video analysis
// output (stored as the analysis asset); no database column yet.
export type Intensity = number;

// For vendors that run a task in the background. `submit` returns the vendor's
// task id, which the worker stores in `stage_runs.vendor_request_id` before it
// waits, so a restarted worker polls the same task instead of paying twice.
export type VendorTask = { requestId: string };

export type VendorTaskResult<T> =
  | { status: "pending" }
  | { status: "succeeded"; output: T }
  | { status: "failed"; error: string };
