import { createHash } from "node:crypto";
import { Injectable } from "@nestjs/common";
import {
  VoiceCloneInput,
  VoiceCloneOutput,
  VoiceCloneProvider,
} from "../interfaces/voice-clone.provider.js";

@Injectable()
export class MockVoiceCloneProvider implements VoiceCloneProvider {
  async clone(input: VoiceCloneInput): Promise<VoiceCloneOutput> {
    // Deterministic, so the same sample always yields the same voice.
    const hash = createHash("sha256").update(input.sampleUrl).digest("hex");
    return { providerVoiceId: `mock-voice-${hash.slice(0, 16)}` };
  }
}
