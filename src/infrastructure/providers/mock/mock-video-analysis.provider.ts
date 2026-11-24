import { Injectable } from "@nestjs/common";
import type {
  VendorTask,
  VendorTaskResult,
} from "../interfaces/shared.types.js";
import {
  VideoAnalysisInput,
  VideoAnalysisOutput,
  VideoAnalysisProvider,
} from "../interfaces/video-analysis.provider.js";

// Lines up with MockTranscriptionProvider: two speakers, one line each.
const OUTPUT: VideoAnalysisOutput = {
  speakers: [
    { label: "A", gender: "male", description: "man on the left" },
    { label: "B", gender: "female", description: "woman on the right" },
  ],
  moments: [
    {
      startMs: 0,
      endMs: 900,
      speakerLabel: "A",
      addresseeLabel: "B",
      emotion: "neutral",
    },
    {
      startMs: 1200,
      endMs: 1600,
      speakerLabel: "B",
      addresseeLabel: "A",
      emotion: "happy",
      intensity: 0.6,
    },
  ],
};

@Injectable()
export class MockVideoAnalysisProvider implements VideoAnalysisProvider {
  async submit(input: VideoAnalysisInput): Promise<VendorTask> {
    return { requestId: `mock-analysis-${input.videoUrl.length}` };
  }

  async poll(
    _requestId: string,
  ): Promise<VendorTaskResult<VideoAnalysisOutput>> {
    return { status: "succeeded", output: OUTPUT };
  }
}
