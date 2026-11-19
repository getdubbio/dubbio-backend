export type TranslationInput = {
  text: string;
  sourceLanguage: string;
  targetLanguage: string;
};

export type TranslationOutput = {
  translatedText: string;
};

export interface TranslationProvider {
  translate(input: TranslationInput): Promise<TranslationOutput>;
}

export const TRANSLATION_PROVIDER = Symbol("TRANSLATION_PROVIDER");
