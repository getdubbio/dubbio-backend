import { Injectable } from "@nestjs/common";
import {
  SourceSeparationInput,
  SourceSeparationOutput,
  SourceSeparationProvider,
} from "../interfaces/source-separation.provider.js";

@Injectable()
export class MockSourceSeparationProvider implements SourceSeparationProvider {
  async separate(
    input: SourceSeparationInput,
  ): Promise<SourceSeparationOutput> {
    return {
      dialogue: {
        audio: Buffer.from(`fake-dialogue:${input.audioUrl}`),
        contentType: "audio/wav",
      },
      background: {
        audio: Buffer.from(`fake-background:${input.audioUrl}`),
        contentType: "audio/wav",
      },
      model: "mock-separation",
    };
  }
}
