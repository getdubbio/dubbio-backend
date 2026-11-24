import type { Emotion } from "./shared.types.js";

// Kept as an alias: schema-notes.md and older code refer to TtsEmotion.
export type TtsEmotion = Emotion;

export type TtsInput = {
  text: string;
  providerVoiceId: string;
  emotion: Emotion;
  seed: number;
  language: string;
};

export type TtsOutput = {
  audio: Buffer;
  contentType: string;
  durationMs: number;
};

export interface TtsProvider {
  synthesize(input: TtsInput): Promise<TtsOutput>;
}

export const TTS_PROVIDER = Symbol("TTS_PROVIDER");
