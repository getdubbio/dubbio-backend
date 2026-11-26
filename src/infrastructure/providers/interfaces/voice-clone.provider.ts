export type VoiceCloneInput = {
  name: string;
  sampleUrl: string;
};

export type VoiceCloneOutput = {
  providerVoiceId: string;
  // `verification_required` maps to the voice_status value of the same name.
  status: "ready" | "verification_required";
};

export interface VoiceCloneProvider {
  clone(input: VoiceCloneInput): Promise<VoiceCloneOutput>;
}

export const VOICE_CLONE_PROVIDER = Symbol("VOICE_CLONE_PROVIDER");
