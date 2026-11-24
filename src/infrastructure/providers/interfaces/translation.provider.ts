import type { Emotion, Gender } from "./shared.types.js";

// Dubbing translation, not plain translation: every line carries its timing
// budget, who says it, to whom, and how. See docs/ai.md#translation.

export type DubbingSpeaker = {
  characterId: string;
  name?: string;
  // `unknown`: use neutral phrasing where the target language allows; never
  // default to male (schema-notes.md).
  gender: Gender;
};

export type DubbingLine = {
  segmentId: string;
  sourceText: string;
  durationMs: number;
  // Upper bound on the translated length, from the duration and the target
  // language's speaking rate. A shorter re-translation passes a lower value.
  maxChars: number;
  speaker: DubbingSpeaker;
  // null: addressed to a group, the audience, or not known. Built at
  // runtime; there is no addressee column yet, so today it is always null
  // (docs/ai.md#open).
  addressee: DubbingSpeaker | null;
  emotion: Emotion;
};

// Lines around the ones being translated, for meaning and continuity only.
// The provider never returns a translation for these.
export type ContextLine = {
  segmentId: string;
  sourceText: string;
  // Present when the line already has a translation (for example, approved).
  translatedText?: string;
  speakerCharacterId: string;
  startMs: number;
};

export type TranslationInput = {
  sourceLanguage: string;
  // BCP 47 tag of the target variety, for example "ar-EG".
  targetLanguage: string;
  // In timeline order.
  lines: DubbingLine[];
  context: ContextLine[];
};

export type TranslatedLine = {
  segmentId: string;
  translatedText: string;
};

export type TranslationOutput = {
  // One entry per input line, same order.
  lines: TranslatedLine[];
  // Model and prompt version, for stage_runs.input_hash and evaluation.
  model: string;
};

export interface TranslationProvider {
  translate(input: TranslationInput): Promise<TranslationOutput>;
}

export const TRANSLATION_PROVIDER = Symbol("TRANSLATION_PROVIDER");
