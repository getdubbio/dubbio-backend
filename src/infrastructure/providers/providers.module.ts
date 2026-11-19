import { Global, Module, Type } from "@nestjs/common";
import { env, type Env } from "../../config/env.js";
import {
  TRANSCRIPTION_PROVIDER,
  TranscriptionProvider,
} from "./interfaces/transcription.provider.js";
import {
  TRANSLATION_PROVIDER,
  TranslationProvider,
} from "./interfaces/translation.provider.js";
import { TTS_PROVIDER, TtsProvider } from "./interfaces/tts.provider.js";
import {
  VOICE_CLONE_PROVIDER,
  VoiceCloneProvider,
} from "./interfaces/voice-clone.provider.js";
import {
  VIDEO_ANALYSIS_PROVIDER,
  VideoAnalysisProvider,
} from "./interfaces/video-analysis.provider.js";
import { MockTranscriptionProvider } from "./mock/mock-transcription.provider.js";
import { MockTranslationProvider } from "./mock/mock-translation.provider.js";
import { MockTtsProvider } from "./mock/mock-tts.provider.js";
import { MockVoiceCloneProvider } from "./mock/mock-voice-clone.provider.js";
import { MockVideoAnalysisProvider } from "./mock/mock-video-analysis.provider.js";

type Adapters = {
  transcription: Type<TranscriptionProvider>;
  translation: Type<TranslationProvider>;
  tts: Type<TtsProvider>;
  voiceClone: Type<VoiceCloneProvider>;
  videoAnalysis: Type<VideoAnalysisProvider>;
};

// One entry per PROVIDERS_MODE value. Real adapters get their own entry later.
const ADAPTERS: Record<Env["PROVIDERS_MODE"], Adapters> = {
  mock: {
    transcription: MockTranscriptionProvider,
    translation: MockTranslationProvider,
    tts: MockTtsProvider,
    voiceClone: MockVoiceCloneProvider,
    videoAnalysis: MockVideoAnalysisProvider,
  },
};

const adapters = ADAPTERS[env.PROVIDERS_MODE];

const providers = [
  { provide: TRANSCRIPTION_PROVIDER, useClass: adapters.transcription },
  { provide: TRANSLATION_PROVIDER, useClass: adapters.translation },
  { provide: TTS_PROVIDER, useClass: adapters.tts },
  { provide: VOICE_CLONE_PROVIDER, useClass: adapters.voiceClone },
  { provide: VIDEO_ANALYSIS_PROVIDER, useClass: adapters.videoAnalysis },
];

@Global()
@Module({
  providers,
  exports: providers.map((p) => p.provide),
})
export class ProvidersModule {}
