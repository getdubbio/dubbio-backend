import { Injectable } from "@nestjs/common";
import {
  TtsInput,
  TtsOutput,
  TtsProvider,
} from "../interfaces/tts.provider.js";

@Injectable()
export class MockTtsProvider implements TtsProvider {
  async synthesize(input: TtsInput): Promise<TtsOutput> {
    return {
      audio: Buffer.from(`fake-audio:${input.text}`),
      contentType: "audio/mpeg",
      durationMs: Math.max(500, input.text.length * 60),
    };
  }
}
