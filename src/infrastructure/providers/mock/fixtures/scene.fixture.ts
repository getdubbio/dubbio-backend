import type { Emotion, Gender } from "../../interfaces/shared.types.js";
import type { TranscriptWord } from "../../interfaces/transcription.provider.js";
import type { VideoAnalysisOutput } from "../../interfaces/video-analysis.provider.js";

// A 28-second, two-character scene written for Dubbio's tests and mock mode.
// Shaped like the MVP clip in the handover: English source, two speakers,
// escalating emotion. The transcription and video analysis mocks return it.
//
// Traps on purpose:
// - lines 5/6 and 9/10: same speaker, 200 ms apart (split on punctuation)
// - analysis labels ("A", "B") differ from transcript ids ("speaker_0", ...)

type SceneLine = {
  speaker: "speaker_0" | "speaker_1";
  startMs: number;
  endMs: number;
  text: string;
  emotion: Emotion;
  intensity?: number;
};

export const SCENE_LINES: readonly SceneLine[] = [
  {
    speaker: "speaker_1",
    startMs: 0,
    endMs: 2100,
    text: "Where were you all night?",
    emotion: "angry",
    intensity: 0.5,
  },
  {
    speaker: "speaker_0",
    startMs: 2600,
    endMs: 4800,
    text: "I told you, I was at the studio.",
    emotion: "neutral",
  },
  {
    speaker: "speaker_1",
    startMs: 5300,
    endMs: 6900,
    text: "Until four in the morning?",
    emotion: "angry",
    intensity: 0.7,
  },
  {
    speaker: "speaker_0",
    startMs: 7400,
    endMs: 10000,
    text: "The deadline is tomorrow. You know that.",
    emotion: "neutral",
  },
  {
    speaker: "speaker_1",
    startMs: 10800,
    endMs: 12200,
    text: "You always say that.",
    emotion: "sad",
    intensity: 0.6,
  },
  {
    speaker: "speaker_0",
    startMs: 13000,
    endMs: 14400,
    text: "Hey. Look at me.",
    emotion: "sad",
    intensity: 0.3,
  },
  {
    speaker: "speaker_0",
    startMs: 14600,
    endMs: 16600,
    text: "I'm doing this for both of us.",
    emotion: "sad",
    intensity: 0.4,
  },
  {
    speaker: "speaker_1",
    startMs: 17400,
    endMs: 19900,
    text: "Then why does it feel like I'm alone?",
    emotion: "sad",
    intensity: 0.8,
  },
  {
    speaker: "speaker_0",
    startMs: 20600,
    endMs: 21800,
    text: "You're not alone.",
    emotion: "sad",
    intensity: 0.5,
  },
  {
    speaker: "speaker_1",
    startMs: 22300,
    endMs: 23400,
    text: "Are you serious?",
    emotion: "surprised",
    intensity: 0.5,
  },
  {
    speaker: "speaker_1",
    startMs: 23600,
    endMs: 25200,
    text: "Get out of here right now!",
    emotion: "angry",
    intensity: 0.9,
  },
  {
    speaker: "speaker_0",
    startMs: 26000,
    endMs: 27500,
    text: "Fine. I'm going.",
    emotion: "angry",
    intensity: 0.4,
  },
];

export const SCENE_GENDERS: Record<SceneLine["speaker"], Gender> = {
  speaker_0: "male",
  speaker_1: "female",
};

const WORD_GAP_MS = 40;

// Spreads each line's words evenly over its span, 40 ms apart.
const wordsOf = (line: SceneLine): TranscriptWord[] => {
  const tokens = line.text.split(" ");
  const step = (line.endMs - line.startMs) / tokens.length;
  return tokens.map((text, i) => ({
    text,
    startMs: Math.round(line.startMs + i * step),
    endMs: Math.round(
      line.startMs + (i + 1) * step - (i < tokens.length - 1 ? WORD_GAP_MS : 0),
    ),
    speaker: line.speaker,
  }));
};

export const SCENE_WORDS: readonly TranscriptWord[] =
  SCENE_LINES.flatMap(wordsOf);

// The video model calls the woman "A" and the man "B".
const LABEL = { speaker_0: "B", speaker_1: "A" } as const;
const OTHER = { speaker_0: "A", speaker_1: "B" } as const;

export const SCENE_ANALYSIS: VideoAnalysisOutput = {
  speakers: [
    { label: "A", gender: "female", description: "woman by the door" },
    { label: "B", gender: "male", description: "man at the desk" },
  ],
  moments: SCENE_LINES.map((line) => ({
    startMs: line.startMs,
    endMs: line.endMs,
    speakerLabel: LABEL[line.speaker],
    addresseeLabel: OTHER[line.speaker],
    emotion: line.emotion,
    ...(line.intensity === undefined ? {} : { intensity: line.intensity }),
  })),
};
