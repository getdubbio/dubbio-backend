import { Injectable } from "@nestjs/common";
import {
  TranscriptionInput,
  TranscriptionOutput,
  TranscriptionProvider,
} from "../interfaces/transcription.provider.js";

@Injectable()
export class MockTranscriptionProvider implements TranscriptionProvider {
  async transcribe(_input: TranscriptionInput): Promise<TranscriptionOutput> {
    return {
      words: [
        { text: "Hello", startMs: 0, endMs: 400, speaker: "speaker_0" },
        { text: "there.", startMs: 400, endMs: 900, speaker: "speaker_0" },
        { text: "Hi!", startMs: 1200, endMs: 1600, speaker: "speaker_1" },
      ],
    };
  }
}
