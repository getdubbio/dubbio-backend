import { describe, expect, it } from "vitest";
import {
  SCENE_ANALYSIS,
  SCENE_WORDS,
} from "../infrastructure/providers/mock/fixtures/scene.fixture.js";
import {
  maxChars,
  MIN_CHARS,
  shorterBudget,
  spokenLength,
} from "./char-budget.js";
import { segmentize } from "./segmentize.js";
import { toTranslationInput } from "./translation-input.js";
import { EMOTIONS } from "../infrastructure/providers/interfaces/shared.types.js";
import {
  buildTranslationPrompt,
  parseTranslationResponse,
} from "./translation-prompt.js";

describe("char budget", () => {
  it("scales with duration", () => {
    expect(maxChars(2100, 14)).toBe(29);
    expect(maxChars(1000, 14)).toBe(14);
  });

  it("never goes below MIN_CHARS", () => {
    expect(maxChars(50, 14)).toBe(MIN_CHARS);
  });

  it("ignores diacritics and tatweel when counting", () => {
    expect(spokenLength("طبعًا")).toBe(spokenLength("طبعا"));
    expect(spokenLength("جـــد")).toBe(2);
  });

  it("asks for a shorter line after audio ran long", () => {
    // 30 chars took 3.0 s for a 2.5 s slot: 30 * 2.5/3 * 0.9 = 22
    expect(shorterBudget(30, 2500, 3000)).toBe(22);
    // always at least one character shorter, even when the slot grew
    expect(shorterBudget(10, 4000, 3000)).toBe(9);
  });
});

const sceneInput = () => {
  const { characters, segments } = segmentize(SCENE_WORDS, SCENE_ANALYSIS);
  return toTranslationInput(
    segments.map((s, i) => ({ ...s, id: `seg-${i + 1}` })),
    characters,
    { source: "en", target: "ar" },
  );
};

describe("translation input", () => {
  const input = sceneInput();

  it("carries budget, speaker gender and emotion for every line", () => {
    expect(input.lines).toHaveLength(12);
    expect(input.lines[0]).toEqual({
      segmentId: "seg-1",
      sourceText: "Where were you all night?",
      durationMs: 2100,
      maxChars: 29,
      speaker: { characterId: "speaker_1", gender: "female" },
      emotion: "angry",
    });
  });
});

describe("translation prompt", () => {
  const input = sceneInput();
  const { system, user } = buildTranslationPrompt(input);

  it("names the languages from projects.source_lang and target_lang", () => {
    expect(system).toMatch(/rewrite English film dialogue/);
    expect(system).toMatch(/Egyptian colloquial Arabic/);
  });

  it("refuses a target language it has no prompt for", () => {
    expect(() =>
      buildTranslationPrompt({ ...input, targetLanguage: "fr" }),
    ).toThrow(/target_lang "fr"/);
  });

  it("uses only the six emotions the schema stores", () => {
    const examples = [...system.matchAll(/^- (\w+): /gm)].map((m) => m[1]);
    expect(examples.length).toBeGreaterThan(0);
    for (const e of examples) expect(EMOTIONS).toContain(e);
    expect(system).not.toMatch(/intensity/i);
  });

  it("states the rules that matter for dubbing", () => {
    expect(system).toMatch(/maxChars/);
    expect(system).toMatch(/Never fall back to masculine/);
    expect(system).toMatch(/Egyptian/);
  });

  it("lists every line with its budget and genders", () => {
    for (const l of input.lines) {
      expect(user).toContain(`"segmentId":"${l.segmentId}"`);
      expect(user).toContain(`"maxChars":${l.maxChars}`);
    }
    expect(user).toContain("(female)");
    expect(user).toContain("(male)");
  });
});

describe("response parsing", () => {
  const input = sceneInput();
  const answer = (
    lines: Array<{ segmentId: string; translatedText: string }>,
  ) => JSON.stringify({ lines });

  it("accepts a complete answer inside a code fence", () => {
    const raw =
      "```json\n" +
      answer(
        input.lines.map((l) => ({
          segmentId: l.segmentId,
          translatedText: "تمام",
        })),
      ) +
      "\n```";
    const { lines, issues } = parseTranslationResponse(raw, input);
    expect(lines).toHaveLength(12);
    expect(issues).toEqual([]);
  });

  it("reports missing, unexpected and too-long lines", () => {
    const raw = answer([
      { segmentId: "seg-1", translatedText: "ا".repeat(40) },
      { segmentId: "seg-99", translatedText: "زيادة" },
    ]);
    const { issues } = parseTranslationResponse(raw, input);
    expect(issues).toContainEqual({
      kind: "too_long",
      segmentId: "seg-1",
      length: 40,
      maxChars: 29,
    });
    expect(issues).toContainEqual({ kind: "unexpected", segmentId: "seg-99" });
    expect(issues.filter((i) => i.kind === "missing")).toHaveLength(11);
  });

  it("throws when the answer is not the JSON shape", () => {
    expect(() =>
      parseTranslationResponse("sure, here you go", input),
    ).toThrow();
  });
});
