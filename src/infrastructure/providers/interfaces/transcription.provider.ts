export type TranscriptionInput = {
  audioUrl: string;
  language: string;
};

export type TranscriptWord = {
  text: string;
  startMs: number;
  endMs: number;
  speaker: string;
};

export type TranscriptionOutput = {
  words: TranscriptWord[];
};

export interface TranscriptionProvider {
  transcribe(input: TranscriptionInput): Promise<TranscriptionOutput>;
}

export const TRANSCRIPTION_PROVIDER = Symbol("TRANSCRIPTION_PROVIDER");
