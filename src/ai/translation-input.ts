import type {
  DubbingLine,
  DubbingSpeaker,
  TranslationInput,
} from "../infrastructure/providers/interfaces/translation.provider.js";
import type { Gender } from "../infrastructure/providers/interfaces/shared.types.js";
import { DEFAULT_CHARS_PER_SECOND, maxChars } from "./char-budget.js";
import type { SegmentizedSegment } from "./segmentize.js";

// Builds the translate input from segments and their characters. The
// translate processor passes database rows in this shape; the prompt CLI
// passes segmentize output.

export type SegmentForTranslation = SegmentizedSegment & { id: string };

export type CharacterForTranslation = {
  providerSpeakerId: string;
  gender: Gender;
  // Display name, when one is known. characters.name is a pending column.
  name?: string;
};

export const toTranslationInput = (
  segments: readonly SegmentForTranslation[],
  characters: readonly CharacterForTranslation[],
  languages: { source: string; target: string },
  charsPerSecond: number = DEFAULT_CHARS_PER_SECOND,
): TranslationInput => {
  const speakerOf = (providerSpeakerId: string): DubbingSpeaker => {
    const c = characters.find((x) => x.providerSpeakerId === providerSpeakerId);
    return {
      characterId: providerSpeakerId,
      ...(c?.name === undefined ? {} : { name: c.name }),
      gender: c?.gender ?? "unknown",
    };
  };

  const lines: DubbingLine[] = segments.map((s) => ({
    segmentId: s.id,
    sourceText: s.sourceText,
    durationMs: s.endMs - s.startMs,
    maxChars: maxChars(s.endMs - s.startMs, charsPerSecond),
    speaker: speakerOf(s.providerSpeakerId),
    // No addressee column yet (docs/ai.md#open).
    addressee: null,
    emotion: s.emotion,
  }));

  return {
    sourceLanguage: languages.source,
    targetLanguage: languages.target,
    lines,
    context: [],
  };
};
