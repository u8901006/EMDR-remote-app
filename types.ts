
export enum SessionRole {
  THERAPIST = 'THERAPIST',
  CLIENT = 'CLIENT',
  NONE = 'NONE'
}

export enum MovementPattern {
  LINEAR = 'LINEAR',
  SINE = 'SINE',
  FIGURE_EIGHT = 'FIGURE_EIGHT',
  RANDOM = 'RANDOM',
  VERTICAL = 'VERTICAL',
  ALTERNATED = 'ALTERNATED'
}

export enum VisualTheme {
  STANDARD = 'STANDARD',
  STARFIELD = 'STARFIELD',
  BREATHING_FOREST = 'BREATHING_FOREST',
  BREATHING_OCEAN = 'BREATHING_OCEAN',
  GOLDEN_HOUR = 'GOLDEN_HOUR',
  AURORA = 'AURORA',
  CUSTOM_IMAGE = 'CUSTOM_IMAGE'
}

export enum AudioMode {
  NONE = 'NONE',
  BINAURAL = 'BINAURAL',
  RAIN = 'RAIN',
  OCEAN = 'OCEAN'
}

export enum DualAttentionMode {
  NONE = 'NONE',
  COLOR_NAMING = 'COLOR_NAMING', // Ball changes color randomly
  NUMBERS = 'NUMBERS' // Random numbers 1-9 appear inside ball
}

export enum AIProvider {
  CLOUD = 'CLOUD', // Google Gemini
  LOCAL = 'LOCAL'  // Ollama + Whisper
}

// Zen / Gesture Mode Types
export enum ZenShape {
  SPHERE = 'SPHERE',
  HEART = 'HEART',
  SATURN = 'SATURN',
  FLOWER = 'FLOWER',
  DONUT = 'DONUT',
  PYRAMID = 'PYRAMID'
}

export interface ZenSettings {
  active: boolean;
  shape: ZenShape;
  colorHex: string; // Core Frequency
  scale: number; // 0.1 - 2.0
  density: number; // 1000 - 10000
  luminance: number; // 0.0 - 1.0
}

export type Language = 'en' | 'zh-TW';

export type EmotionType = 'JOY' | 'SADNESS' | 'FEAR' | 'CALM';

export interface EmotionData {
  primary: EmotionType;
  confidence: number;
}

export interface EMDRSettings {
  isPlaying: boolean;
  speed: number; // 1-100
  size: number; // 10-200 px
  color: string;
  backgroundColor: string;
  pattern: MovementPattern;
  depthEnabled: boolean; // 3D effect toggle
  dualAttentionMode: DualAttentionMode; // Cognitive Interweave
  
  // Visual Themes
  theme: VisualTheme;
  customImageUrl: string; // URL or Base64
  themeOpacity: number; // 0-1 (For custom image dimming)

  // Audio
  soundEnabled: boolean;
  soundVolume: number; // 0-1
  audioMode: AudioMode; // Background sound layer
  
  // Haptics (Gamepad)
  therapistVibrationEnabled: boolean;
  clientVibrationEnabled: boolean;

  durationSeconds: number; // 0 for infinite (Manual/Passes mode)
  targetPasses: number; // 0 for infinite (Manual/Timer mode)
  freezeSensitivity: number; // 0-100
  
  // AI Configuration
  aiProvider: AIProvider;
  ollamaUrl: string; // e.g., http://localhost:11434
  ollamaModel: string; // e.g., llama3
  whisperUrl: string; // e.g., http://localhost:8000/v1/audio/transcriptions
  
  // LiveKit Configuration
  liveKitUrl: string;
  liveKitTherapistToken: string;
  liveKitClientToken: string;

  // Zen Mode
  zen: ZenSettings;
}

export interface ClientStatus {
  isCameraActive: boolean;
  isFrozen: boolean;
  motionScore: number; // 0-100
  emotion?: EmotionData;
  lastUpdate: number;
}

export type MetricType = 'SUD' | 'VOC';

export interface SessionMetric {
  id: string;
  type: MetricType;
  value: number;
  timestamp: number;
}

export interface SessionBookmark {
  id: string;
  timestamp: number;
  note: string;
}

export interface HandPoint {
  x: number; 
  y: number;
}

export interface SessionMessage {
  type: 'SYNC_SETTINGS' | 'REQUEST_SYNC' | 'SESSION_END' | 'CLIENT_STATUS' | 'REQUEST_METRIC' | 'SUBMIT_METRIC' | 'ZEN_HANDS';
  payload?: Partial<EMDRSettings>;
  clientStatus?: ClientStatus;
  metricType?: MetricType; 
  metric?: SessionMetric; 
  zenHands?: HandPoint[]; // Therapist hands broadcast to client
  timestamp: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
}