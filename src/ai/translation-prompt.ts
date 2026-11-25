import { z } from "zod";
import type {
  DubbingSpeaker,
  TranslationInput,
  TranslatedLine,
} from "../infrastructure/providers/interfaces/translation.provider.js";
import { spokenLength } from "./char-budget.js";

// Prompt and response check for the LLM translation adapter. Vendor-free:
// any chat model gets { system, user } and must answer with RESPONSE_SCHEMA.
// docs/ai.md#translation.

// Bump on any change to the prompt text, so results can be traced to it.
export const TRANSLATION_PROMPT_VERSION = 2;

// projects.target_lang holds a bare language code ("ar"). The product dubs
// into Egyptian colloquial Arabic, so "ar" means that variety until the schema
// has a dialect field.
const TARGETS: Record<string, string> = {
  ar: "spoken Egyptian colloquial Arabic",
};

const languageName = (code: string): string =>
  new Intl.DisplayNames(["en"], { type: "language" }).of(code) ?? code;

const system = (source: string, target: string): string =>
  `You are a dubbing adapter. You rewrite ${source} film dialogue as ${target} that an actor will perform over the original picture.

Rules, in priority order:
1. Length. Each line has maxChars, counted on the Arabic text without diacritics. Never exceed it. A shorter natural line beats a complete literal one.
2. Meaning and intent. Keep what the line does in the scene (asks, accuses, comforts, orders). Drop filler before meaning.
3. Gender agreement. Arabic verbs, pronouns and adjectives agree with the speaker and with the person spoken to. The speaker's gender is given; when it is "unknown", choose wording that works for either. The listener is not given: work it out from the surrounding lines when they make it clear (for example two characters talking to each other), and use that character's gender. Otherwise choose wording that works for either (avoid second-person feminine or masculine endings, use a noun, a plural, or rephrase). Never fall back to masculine.
4. Emotion. Each line has one of: neutral, happy, sad, angry, fearful, surprised. Let the wording carry it: neutral plain, happy light, sad soft, angry short and sharp, fearful hesitant, surprised broken.
5. Register. Everyday Egyptian colloquial as people speak it, not Modern Standard Arabic and not slang that dates quickly. Arabic script only. No diacritics. Keep names as they are, written in Arabic letters.
6. Continuity. Read the context lines for who is who and what happened. Do not translate them and do not repeat them.

Example of rule 4. English "Are you serious?":
- angry: «إنت بتتكلم جد دلوقتي؟!»
- surprised: «إنت... بجد؟!»
- sad: «بجد يعني؟...»

Answer with JSON only, no prose, in this shape:
{"lines":[{"segmentId":"<id>","translatedText":"<Egyptian Arabic>"}]}
One entry per input line, same order, same segmentId.`;

const who = (s: DubbingSpeaker): string => `${s.characterId} (${s.gender})`;

export const buildTranslationPrompt = (
  input: TranslationInput,
): { system: string; user: string } => {
  const target = TARGETS[input.targetLanguage];
  if (target === undefined) {
    throw new Error(
      `No dubbing prompt for target_lang "${input.targetLanguage}"; supported: ${Object.keys(TARGETS).join(", ")}`,
    );
  }
  const context = input.context.length
    ? input.context
        .map(
          (c) =>
            `- [${c.speakerCharacterId}] ${c.sourceText}${
              c.translatedText ? ` => ${c.translatedText}` : ""
            }`,
        )
        .join("\n")
    : "(none)";

  const lines = input.lines
    .map((l) =>
      JSON.stringify({
        segmentId: l.segmentId,
        speaker: who(l.speaker),
        emotion: l.emotion,
        seconds: Math.round(l.durationMs / 100) / 10,
        maxChars: l.maxChars,
        english: l.sourceText,
      }),
    )
    .join("\n");

  return {
    system: system(languageName(input.sourceLanguage), target),
    user: `Source language: ${input.sourceLanguage}. Target: ${input.targetLanguage}.

Context (do not translate):
${context}

Lines to adapt (JSON, one per line):
${lines}`,
  };
};

export const RESPONSE_SCHEMA = z.object({
  lines: z.array(
    z.object({
      segmentId: z.string(),
      translatedText: z.string().min(1),
    }),
  ),
});

export type TranslationIssue =
  | { kind: "missing"; segmentId: string }
  | { kind: "unexpected"; segmentId: string }
  | {
      kind: "too_long";
      segmentId: string;
      length: number;
      maxChars: number;
    };

export type ParsedTranslation = {
  lines: TranslatedLine[];
  issues: TranslationIssue[];
};

// Reads the model's answer. Throws only when it is not the JSON shape at all;
// missing, extra and too-long lines come back as issues for the caller.
export const parseTranslationResponse = (
  raw: string,
  input: TranslationInput,
): ParsedTranslation => {
  // Models sometimes wrap JSON in a code fence.
  const json = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```$/, "");
  const parsed = RESPONSE_SCHEMA.parse(JSON.parse(json));

  const byId = new Map(parsed.lines.map((l) => [l.segmentId, l]));
  const wanted = new Set(input.lines.map((l) => l.segmentId));
  const issues: TranslationIssue[] = [];
  const lines: TranslatedLine[] = [];

  for (const line of input.lines) {
    const got = byId.get(line.segmentId);
    if (!got) {
      issues.push({ kind: "missing", segmentId: line.segmentId });
      continue;
    }
    const translatedText = got.translatedText.trim();
    const length = spokenLength(translatedText);
    if (length > line.maxChars) {
      issues.push({
        kind: "too_long",
        segmentId: line.segmentId,
        length,
        maxChars: line.maxChars,
      });
    }
    lines.push({ segmentId: line.segmentId, translatedText });
  }
  for (const l of parsed.lines) {
    if (!wanted.has(l.segmentId)) {
      issues.push({ kind: "unexpected", segmentId: l.segmentId });
    }
  }
  return { lines, issues };
};
