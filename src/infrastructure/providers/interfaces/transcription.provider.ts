// Synchronous: a 30 to 60 second clip returns in one call, so there is no
// vendor task to resume. Switch to submit/poll (shared.types.ts) if long files
// need it. See docs/ai.md#transcription.

export type TranscriptionInput = {
  audioUrl: string;
  language: string;
  // Hint for diarization when the number of speakers is known.
  numSpeakers?: number;
};

// Spoken words only: adapters drop spacing and audio-event tokens.
export type TranscriptWord = {
  text: string;
  startMs: number;
  endMs: number;
  speaker: string;
};

export type TranscriptionOutput = {
  words: TranscriptWord[];
  // Language the vendor detected or used.
  languageCode?: string;
  // Model name, so results can be traced to the model.
  model: string;
};

export interface TranscriptionProvider {
  transcribe(input: TranscriptionInput): Promise<TranscriptionOutput>;
}

export const TRANSCRIPTION_PROVIDER = Symbol("TRANSCRIPTION_PROVIDER");
