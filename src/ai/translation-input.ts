import type {
  DubbingLine,
  DubbingSpeaker,
  TranslationInput,
} from "../infrastructure/providers/interfaces/translation.provider.js";
import { DEFAULT_CHARS_PER_SECOND, maxChars } from "./char-budget.js";
import type { SegmentizedCharacter, SegmentizedSegment } from "./segmentize.js";

// Builds the translate input from segments and their characters. The
// translate processor passes database rows in this shape; the prompt CLI
// passes segmentize output.

export type SegmentForTranslation = SegmentizedSegment & { id: string };

export const toTranslationInput = (
  segments: readonly SegmentForTranslation[],
  characters: readonly SegmentizedCharacter[],
  languages: { source: string; target: string },
  charsPerSecond: number = DEFAULT_CHARS_PER_SECOND,
): TranslationInput => {
  const speakerOf = (providerSpeakerId: string): DubbingSpeaker => {
    const c = characters.find((x) => x.providerSpeakerId === providerSpeakerId);
    return {
      characterId: providerSpeakerId,
      name: c?.name,
      gender: c?.gender ?? "unknown",
    };
  };

  const lines: DubbingLine[] = segments.map((s) => ({
    segmentId: s.id,
    sourceText: s.sourceText,
    durationMs: s.endMs - s.startMs,
    maxChars: maxChars(s.endMs - s.startMs, charsPerSecond),
    speaker: speakerOf(s.providerSpeakerId),
    addressee:
      s.addresseeSpeakerId === null ? null : speakerOf(s.addresseeSpeakerId),
    emotion: s.emotion,
    ...(s.intensity === undefined ? {} : { intensity: s.intensity }),
  }));

  return {
    sourceLanguage: languages.source,
    targetLanguage: languages.target,
    lines,
    context: [],
  };
};
