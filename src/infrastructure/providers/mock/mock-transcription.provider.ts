import { Injectable } from "@nestjs/common";
import {
  TranscriptionInput,
  TranscriptionOutput,
  TranscriptionProvider,
} from "../interfaces/transcription.provider.js";
import { SCENE_WORDS } from "./fixtures/scene.fixture.js";

@Injectable()
export class MockTranscriptionProvider implements TranscriptionProvider {
  async transcribe(input: TranscriptionInput): Promise<TranscriptionOutput> {
    return {
      words: [...SCENE_WORDS],
      languageCode: input.language,
      model: "mock-transcription",
    };
  }
}
