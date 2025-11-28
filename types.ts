

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
  
  // LiveKit Configuration
  liveKitUrl: string;
  liveKitTherapistToken: string;
  liveKitClientToken: string;
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

export interface SessionMessage {
  type: 'SYNC_SETTINGS' | 'REQUEST_SYNC' | 'SESSION_END' | 'CLIENT_STATUS' | 'REQUEST_METRIC' | 'SUBMIT_METRIC';
  payload?: Partial<EMDRSettings>;
  clientStatus?: ClientStatus;
  metricType?: MetricType; // For REQUEST_METRIC
  metric?: SessionMetric;  // For SUBMIT_METRIC
  timestamp: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
}