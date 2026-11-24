// Splits the extracted audio into a dialogue stem and a background stem
// (music, effects, ambience). Runs on the `gpu` queue. See
// docs/ai.md#source-separation.

export type SourceSeparationInput = {
  audioUrl: string;
};

export type AudioStem = {
  audio: Buffer;
  contentType: string;
};

export type SourceSeparationOutput = {
  dialogue: AudioStem;
  background: AudioStem;
  // Model name, for stage_runs.input_hash.
  model: string;
};

export interface SourceSeparationProvider {
  separate(input: SourceSeparationInput): Promise<SourceSeparationOutput>;
}

export const SOURCE_SEPARATION_PROVIDER = Symbol("SOURCE_SEPARATION_PROVIDER");
