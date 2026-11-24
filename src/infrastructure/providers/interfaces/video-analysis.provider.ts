import type {
  Emotion,
  Gender,
  Intensity,
  VendorTask,
  VendorTaskResult,
} from "./shared.types.js";

// The analysis is a set of hints for segmentize. Its speaker labels are the
// video model's own and do not match the transcript's speaker ids; segmentize
// joins them by time overlap. See docs/ai.md#video-analysis.

export type VideoAnalysisInput = {
  videoUrl: string;
  sourceLanguage: string;
};

export type AnalysisSpeaker = {
  label: string;
  gender: Gender;
  // Short visual description, for example "older man in a grey suit".
  description?: string;
};

export type AnalysisMoment = {
  startMs: number;
  endMs: number;
  speakerLabel: string | null;
  // null: talking to a group, the audience, or not visible.
  addresseeLabel: string | null;
  emotion: Emotion;
  intensity?: Intensity;
};

export type VideoAnalysisOutput = {
  speakers: AnalysisSpeaker[];
  // Sorted by startMs. May overlap when two people talk at once.
  moments: AnalysisMoment[];
};

export interface VideoAnalysisProvider {
  submit(input: VideoAnalysisInput): Promise<VendorTask>;
  poll(requestId: string): Promise<VendorTaskResult<VideoAnalysisOutput>>;
}

export const VIDEO_ANALYSIS_PROVIDER = Symbol("VIDEO_ANALYSIS_PROVIDER");
