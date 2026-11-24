import type {
  AnalysisMoment,
  VideoAnalysisOutput,
} from "../infrastructure/providers/interfaces/video-analysis.provider.js";
import type { TranscriptWord } from "../infrastructure/providers/interfaces/transcription.provider.js";
import type {
  Emotion,
  Gender,
} from "../infrastructure/providers/interfaces/shared.types.js";

// Turns transcript words into characters and segments. Pure: no database, no
// vendor. Rules and thresholds: docs/ai.md#segmentize.

// Bump when a rule or default changes; it is part of segmentize's input_hash.
export const SEGMENTIZE_RULES_VERSION = 1;

export type SegmentizeOptions = {
  // A pause longer than this always ends a segment.
  maxPauseMs: number;
  // Sentence-final punctuation followed by a pause of at least
  // minSentencePauseMs ends a segment once it is at least minSegmentMs long.
  // Without the pause, two sentences said in one breath stay together.
  minSegmentMs: number;
  minSentencePauseMs: number;
  // A segment never grows past this length.
  maxSegmentMs: number;
};

// Starting values; tuned on the test set (plan, week 3).
export const DEFAULT_SEGMENTIZE_OPTIONS: SegmentizeOptions = {
  maxPauseMs: 500,
  minSegmentMs: 1000,
  minSentencePauseMs: 150,
  maxSegmentMs: 8000,
};

// Output maps 1:1 to columns that exist today: characters.provider_speaker_id
// and characters.gender; segments.start_ms, end_ms, source_text, emotion.
// Nothing else is produced: there is no column for it.
export type SegmentizedCharacter = {
  providerSpeakerId: string;
  gender: Gender;
};

export type SegmentizedSegment = {
  providerSpeakerId: string;
  startMs: number;
  endMs: number;
  sourceText: string;
  emotion: Emotion;
};

export type SegmentizeResult = {
  characters: SegmentizedCharacter[];
  segments: SegmentizedSegment[];
};

const SENTENCE_END = /[.?!…]["')\]]*$/;

const overlap = (a0: number, a1: number, b0: number, b1: number): number =>
  Math.max(0, Math.min(a1, b1) - Math.max(a0, b0));

// Splits the word stream into runs of one speaker.
const groupWords = (
  words: readonly TranscriptWord[],
  opts: SegmentizeOptions,
): TranscriptWord[][] => {
  const groups: TranscriptWord[][] = [];
  let current: TranscriptWord[] = [];

  for (const word of words) {
    const prev = current.at(-1);
    if (prev) {
      const start = current[0].startMs;
      const breaks =
        word.speaker !== prev.speaker ||
        word.startMs - prev.endMs > opts.maxPauseMs ||
        word.endMs - start > opts.maxSegmentMs ||
        (SENTENCE_END.test(prev.text) &&
          word.startMs - prev.endMs >= opts.minSentencePauseMs &&
          prev.endMs - start >= opts.minSegmentMs);
      if (breaks) {
        groups.push(current);
        current = [];
      }
    }
    current.push(word);
  }
  if (current.length > 0) groups.push(current);
  return groups;
};

// Maps each analysis label to the transcript speaker it overlaps most.
const mapLabels = (
  words: readonly TranscriptWord[],
  moments: readonly AnalysisMoment[],
): Map<string, string> => {
  const totals = new Map<string, Map<string, number>>();
  for (const m of moments) {
    if (m.speakerLabel === null) continue;
    const perSpeaker = totals.get(m.speakerLabel) ?? new Map<string, number>();
    for (const w of words) {
      const ms = overlap(m.startMs, m.endMs, w.startMs, w.endMs);
      if (ms > 0)
        perSpeaker.set(w.speaker, (perSpeaker.get(w.speaker) ?? 0) + ms);
    }
    totals.set(m.speakerLabel, perSpeaker);
  }

  const map = new Map<string, string>();
  for (const [label, perSpeaker] of totals) {
    let best: string | undefined;
    let bestMs = 0;
    for (const [speaker, ms] of perSpeaker) {
      if (ms > bestMs) [best, bestMs] = [speaker, ms];
    }
    if (best !== undefined) map.set(label, best);
  }
  return map;
};

export const segmentize = (
  words: readonly TranscriptWord[],
  analysis: VideoAnalysisOutput | null,
  options: Partial<SegmentizeOptions> = {},
): SegmentizeResult => {
  const opts = { ...DEFAULT_SEGMENTIZE_OPTIONS, ...options };
  const sorted = [...words].sort((a, b) => a.startMs - b.startMs);
  const moments = analysis?.moments ?? [];
  const labelToSpeaker = mapLabels(sorted, moments);

  // Gender: the analysis speaker mapped to this transcript speaker. If two
  // labels map to the same speaker and disagree, the result is unknown.
  const genderOf = new Map<string, Gender>();
  for (const s of analysis?.speakers ?? []) {
    const speaker = labelToSpeaker.get(s.label);
    if (speaker === undefined) continue;
    const seen = genderOf.get(speaker);
    genderOf.set(
      speaker,
      seen === undefined || seen === s.gender ? s.gender : "unknown",
    );
  }

  const characters: SegmentizedCharacter[] = [];
  for (const w of sorted) {
    if (characters.some((c) => c.providerSpeakerId === w.speaker)) continue;
    characters.push({
      providerSpeakerId: w.speaker,
      gender: genderOf.get(w.speaker) ?? "unknown",
    });
  }

  const segments = groupWords(sorted, opts).map((group): SegmentizedSegment => {
    const speaker = group[0].speaker;
    const startMs = group[0].startMs;
    const endMs = group.at(-1)!.endMs;

    // The moment that overlaps most, preferring moments of this speaker.
    let best: AnalysisMoment | undefined;
    let bestScore = 0;
    for (const m of moments) {
      const ms = overlap(startMs, endMs, m.startMs, m.endMs);
      if (ms === 0) continue;
      const own =
        m.speakerLabel !== null &&
        labelToSpeaker.get(m.speakerLabel) === speaker;
      const score = ms * (own ? 2 : 1);
      if (score > bestScore) [best, bestScore] = [m, score];
    }

    return {
      providerSpeakerId: speaker,
      startMs,
      endMs,
      sourceText: group.map((w) => w.text).join(" "),
      emotion: best?.emotion ?? "neutral",
    };
  });

  return { characters, segments };
};
