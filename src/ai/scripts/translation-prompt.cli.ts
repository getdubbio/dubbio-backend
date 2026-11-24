import { readFileSync } from "node:fs";
import { argv, exit } from "node:process";
import {
  SCENE_ANALYSIS,
  SCENE_WORDS,
} from "../../infrastructure/providers/mock/fixtures/scene.fixture.js";
import { spokenLength } from "../char-budget.js";
import { segmentize } from "../segmentize.js";
import { toTranslationInput } from "../translation-input.js";
import {
  buildTranslationPrompt,
  parseTranslationResponse,
} from "../translation-prompt.js";

// Try the translation prompt by hand, before any API key exists:
//   pnpm ai:prompt print            -> paste the output into any chat model
//   pnpm ai:prompt check answer.json -> checks ids and length of its answer

const sceneInput = () => {
  const { characters, segments } = segmentize(SCENE_WORDS, SCENE_ANALYSIS);
  return toTranslationInput(
    segments.map((s, i) => ({
      ...s,
      id: `seg-${String(i + 1).padStart(2, "0")}`,
    })),
    characters,
    { source: "en", target: "ar-EG" },
  );
};

const [command, file] = argv.slice(2);
const input = sceneInput();

if (command === "print") {
  const { system, user } = buildTranslationPrompt(input);
  console.log(`===== SYSTEM =====\n${system}\n\n===== USER =====\n${user}`);
} else if (command === "check" && file) {
  const { lines, issues } = parseTranslationResponse(
    readFileSync(file, "utf8"),
    input,
  );
  for (const line of lines) {
    const want = input.lines.find((l) => l.segmentId === line.segmentId)!;
    const len = spokenLength(line.translatedText);
    const mark = len > want.maxChars ? "TOO LONG" : "ok";
    console.log(
      `${line.segmentId}  ${String(len).padStart(3)}/${String(want.maxChars).padEnd(3)} ${mark.padEnd(8)} ${line.translatedText}`,
    );
  }
  console.log(
    issues.length === 0
      ? "\nNo issues."
      : `\nIssues:\n${issues.map((i) => `- ${JSON.stringify(i)}`).join("\n")}`,
  );
  exit(issues.length === 0 ? 0 : 1);
} else {
  console.error(
    "Usage: pnpm ai:prompt print | pnpm ai:prompt check <answer.json>",
  );
  exit(2);
}
