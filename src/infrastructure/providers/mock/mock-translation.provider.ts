import { Injectable } from "@nestjs/common";
import {
  TranslationInput,
  TranslationOutput,
  TranslationProvider,
} from "../interfaces/translation.provider.js";

@Injectable()
export class MockTranslationProvider implements TranslationProvider {
  async translate(input: TranslationInput): Promise<TranslationOutput> {
    return {
      // Honors maxChars, so the too-long retry loop can be exercised.
      lines: input.lines.map((line) => ({
        segmentId: line.segmentId,
        translatedText: `[${input.targetLanguage}] ${line.sourceText}`.slice(
          0,
          line.maxChars,
        ),
      })),
      model: "mock-translation",
    };
  }
}
