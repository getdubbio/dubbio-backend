export type TtsEmotion =
  "neutral" | "happy" | "sad" | "angry" | "fearful" | "surprised";

export type TtsInput = {
  text: string;
  providerVoiceId: string;
  emotion: TtsEmotion;
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
