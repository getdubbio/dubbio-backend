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
import { SCENE_ANALYSIS } from "./fixtures/scene.fixture.js";

@Injectable()
export class MockVideoAnalysisProvider implements VideoAnalysisProvider {
  async submit(input: VideoAnalysisInput): Promise<VendorTask> {
    return { requestId: `mock-analysis-${input.videoUrl.length}` };
  }

  async poll(
    _requestId: string,
  ): Promise<VendorTaskResult<VideoAnalysisOutput>> {
    return { status: "succeeded", output: SCENE_ANALYSIS };
  }
}
