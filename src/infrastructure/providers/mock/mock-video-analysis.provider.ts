import { Injectable } from "@nestjs/common";
import {
  VideoAnalysisInput,
  VideoAnalysisOutput,
  VideoAnalysisProvider,
} from "../interfaces/video-analysis.provider.js";

@Injectable()
export class MockVideoAnalysisProvider implements VideoAnalysisProvider {
  async analyze(_input: VideoAnalysisInput): Promise<VideoAnalysisOutput> {
    return { analysis: { mock: true } };
  }
}
