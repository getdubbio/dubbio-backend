import { Injectable } from "@nestjs/common";
import {
  TranslationInput,
  TranslationOutput,
  TranslationProvider,
} from "../interfaces/translation.provider.js";

@Injectable()
export class MockTranslationProvider implements TranslationProvider {
  async translate(input: TranslationInput): Promise<TranslationOutput> {
    return { translatedText: `[${input.targetLanguage}] ${input.text}` };
  }
}
