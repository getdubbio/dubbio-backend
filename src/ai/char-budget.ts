// How many characters a translated line may have, from its duration.
// docs/ai.md#translation.

// Characters per second of Egyptian Arabic speech with the cloned voices.
// PLACEHOLDER: replaced by the week-4 measurement (plan, phase 3). Change it
// only together with that measurement; it feeds every translate input_hash.
export const DEFAULT_CHARS_PER_SECOND = 14;

// Fewer than this and nothing natural fits; the line is flagged by synthesis
// if it still runs long.
export const MIN_CHARS = 4;

// Short vowel marks (tashkeel) and tatweel take no speaking time.
const SILENT = /[ً-ْٰـ]/g;

const graphemes = new Intl.Segmenter("ar", { granularity: "grapheme" });

// Length as spoken: what maxChars is compared against.
export const spokenLength = (text: string): number => {
  let n = 0;
  for (const _ of graphemes.segment(text.replace(SILENT, "").trim())) n++;
  return n;
};

export const maxChars = (
  durationMs: number,
  charsPerSecond: number = DEFAULT_CHARS_PER_SECOND,
): number =>
  Math.max(MIN_CHARS, Math.floor((durationMs / 1000) * charsPerSecond));

// A shorter budget for the next re-translation after synthesis ran long:
// scale by how much too long the audio was, then take 10% more off.
export const shorterBudget = (
  previousMaxChars: number,
  targetMs: number,
  generatedMs: number,
): number =>
  Math.max(
    MIN_CHARS,
    Math.min(
      previousMaxChars - 1,
      Math.floor(previousMaxChars * (targetMs / generatedMs) * 0.9),
    ),
  );
