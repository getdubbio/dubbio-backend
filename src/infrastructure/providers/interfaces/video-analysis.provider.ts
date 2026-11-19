export type VideoAnalysisInput = {
  videoUrl: string;
};

export type VideoAnalysisOutput = {
  analysis: unknown;
};

export interface VideoAnalysisProvider {
  analyze(input: VideoAnalysisInput): Promise<VideoAnalysisOutput>;
}

export const VIDEO_ANALYSIS_PROVIDER = Symbol("VIDEO_ANALYSIS_PROVIDER");
