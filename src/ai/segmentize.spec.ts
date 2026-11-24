import { describe, expect, it } from "vitest";
import {
  SCENE_ANALYSIS,
  SCENE_LINES,
  SCENE_WORDS,
} from "../infrastructure/providers/mock/fixtures/scene.fixture.js";
import type { TranscriptWord } from "../infrastructure/providers/interfaces/transcription.provider.js";
import { segmentize } from "./segmentize.js";

const w = (
  text: string,
  startMs: number,
  endMs: number,
  speaker = "speaker_0",
): TranscriptWord => ({ text, startMs, endMs, speaker });

describe("segmentize on the scene fixture", () => {
  const { characters, segments } = segmentize(SCENE_WORDS, SCENE_ANALYSIS);

  it("finds one segment per scripted line, including same-speaker lines 200 ms apart", () => {
    expect(segments.map((s) => s.sourceText)).toEqual(
      SCENE_LINES.map((l) => l.text),
    );
  });

  it("keeps line timing", () => {
    segments.forEach((s, i) => {
      expect(s.startMs).toBe(SCENE_LINES[i].startMs);
      expect(s.endMs).toBe(SCENE_LINES[i].endMs);
      expect(s.endMs).toBeGreaterThan(s.startMs);
    });
  });

  it("maps analysis labels to transcript speakers for gender", () => {
    expect(characters).toEqual([
      { providerSpeakerId: "speaker_1", gender: "female" },
      { providerSpeakerId: "speaker_0", gender: "male" },
    ]);
  });

  it("takes emotion from the overlapping moment", () => {
    segments.forEach((s, i) => {
      expect(s.emotion).toBe(SCENE_LINES[i].emotion);
    });
  });

  it("outputs only fields that have a database column", () => {
    expect(Object.keys(characters[0]).sort()).toEqual([
      "gender",
      "providerSpeakerId",
    ]);
    expect(Object.keys(segments[0]).sort()).toEqual([
      "emotion",
      "endMs",
      "providerSpeakerId",
      "sourceText",
      "startMs",
    ]);
  });
});

describe("segmentize rules", () => {
  it("splits on a speaker change", () => {
    const { segments } = segmentize(
      [w("Hi", 0, 300), w("Hello", 350, 700, "speaker_1")],
      null,
    );
    expect(segments).toHaveLength(2);
  });

  it("splits on a pause longer than maxPauseMs", () => {
    const { segments } = segmentize(
      [w("one", 0, 300), w("two", 900, 1200)],
      null,
    );
    expect(segments.map((s) => s.sourceText)).toEqual(["one", "two"]);
  });

  it("does not split on punctuation before minSegmentMs", () => {
    const { segments } = segmentize(
      [w("Hey.", 0, 300), w("Look", 340, 600), w("here.", 640, 1100)],
      null,
    );
    expect(segments.map((s) => s.sourceText)).toEqual(["Hey. Look here."]);
  });

  it("splits after a sentence and a short pause once past minSegmentMs", () => {
    const { segments } = segmentize(
      [
        w("Are", 0, 300),
        w("you", 340, 700),
        w("serious?", 740, 1100),
        w("Go!", 1300, 1600),
      ],
      null,
    );
    expect(segments.map((s) => s.sourceText)).toEqual([
      "Are you serious?",
      "Go!",
    ]);
  });

  it("keeps two sentences said in one breath together", () => {
    const { segments } = segmentize(
      [
        w("It", 0, 300),
        w("is", 340, 700),
        w("late.", 740, 1100),
        w("Go!", 1140, 1500),
      ],
      null,
    );
    expect(segments.map((s) => s.sourceText)).toEqual(["It is late. Go!"]);
  });

  it("never lets a segment pass maxSegmentMs", () => {
    const words = Array.from({ length: 30 }, (_, i) =>
      w("word", i * 400, i * 400 + 360),
    );
    const { segments } = segmentize(words, null);
    for (const s of segments)
      expect(s.endMs - s.startMs).toBeLessThanOrEqual(8000);
    expect(segments.length).toBeGreaterThan(1);
  });

  it("falls back to unknown gender and neutral emotion without analysis", () => {
    const { characters, segments } = segmentize([w("Hello.", 0, 500)], null);
    expect(characters[0].gender).toBe("unknown");
    expect(segments[0].emotion).toBe("neutral");
  });

  it("sorts words that arrive out of order", () => {
    const { segments } = segmentize(
      [w("world.", 400, 800), w("Hello", 0, 360)],
      null,
    );
    expect(segments[0].sourceText).toBe("Hello world.");
  });

  it("returns nothing for an empty transcript", () => {
    expect(segmentize([], null)).toEqual({ characters: [], segments: [] });
  });
});
