export const QUEUES = {
  PIPELINE: "pipeline",
  MEDIA: "media",
  GPU: "gpu",
  TTS: "tts",
  STT: "stt",
  VISION: "vision",
  TRANSLATION: "translation",
  RENDER: "render",
  VOICE: "voice",
  MAINTENANCE: "maintenance",
} as const;

export type QueueName = (typeof QUEUES)[keyof typeof QUEUES];

export const JOBS = {
  TEST_PING: "test.ping", // TEMP
  VOICE_CLONE: "voice.clone",
  VOICE_DELETE: "voice.delete",
  SEGMENT_REGENERATE: "segment.regenerate",
  PROJECT_EXPORT: "project.export",
} as const;

export type JobName = (typeof JOBS)[keyof typeof JOBS];
