export type BaseVoiceName = 'Puck' | 'Charon' | 'Kore' | 'Fenrir' | 'Zephyr';

export interface VoiceProfile {
  id: string;
  name: string;
  nativeName?: string;
  gender: 'male' | 'female' | 'neutral';
  baseVoice: BaseVoiceName;
  description: string;
  isCloned?: boolean;
  isAiGenerated?: boolean;
  avatarColor: string;
  tags: string[];
  // Cloned & synthesized acoustics
  pitchShift?: number; // -12 to +12
  timbreDescription?: string;
  vocalTraits?: string[];
  cadence?: string;
  accentDialect?: string;
  steeringPrompt?: string;
  previewAudioBase64?: string | null;
  createdAt?: string;
}

export interface VoiceGeneratorParams {
  prompt?: string;
  name?: string;
  gender?: 'male' | 'female' | 'neutral';
  ageGroup?: 'young' | 'adult' | 'senior';
  timbreStyle?: string;
  language?: string;
  presetTheme?: string;
}

export interface EmotionPreset {
  id: string;
  label: string;
  urduLabel: string;
  description: string;
  directive: string;
  icon: string;
}

export interface LanguageOption {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
  isRtl?: boolean;
  sampleUrduOrNative: string;
}

export interface GenerationHistoryItem {
  id: string;
  text: string;
  language: string;
  voiceName: string;
  isClonedVoice?: boolean;
  emotion: string;
  pitch: number;
  speed: number;
  durationSeconds: number;
  audioBase64: string;
  mimeType: string;
  chunksCount: number;
  timestamp: number;
}

export interface VideoScene {
  sceneIndex: number;
  startTime: number;
  endTime: number;
  visualDescription: string;
  script: string;
  emotion?: string;
  recommendedSpeed?: number;
  audioBase64?: string | null;
  sceneDuration?: number;
}

export interface VideoAlignmentResult {
  videoSummary: string;
  scenes: VideoScene[];
  masterAlignedAudioBase64: string;
  masterDuration: number;
  language: string;
  voice: string;
  detectedSpeakerVoice?: VoiceProfile | null;
  videoTranscription?: string | null;
  alignmentMode?: 'voice-cloned-from-video' | 'selected-persona';
}

