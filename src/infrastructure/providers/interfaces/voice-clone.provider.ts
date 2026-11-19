export type VoiceCloneInput = {
  name: string;
  sampleUrl: string;
};

export type VoiceCloneOutput = {
  providerVoiceId: string;
};

export interface VoiceCloneProvider {
  clone(input: VoiceCloneInput): Promise<VoiceCloneOutput>;
}

export const VOICE_CLONE_PROVIDER = Symbol("VOICE_CLONE_PROVIDER");
