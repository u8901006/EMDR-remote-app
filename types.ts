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

export interface EMDRSettings {
  isPlaying: boolean;
  speed: number; // 1-100
  size: number; // 10-200 px
  color: string;
  backgroundColor: string;
  pattern: MovementPattern;
  
  // Audio
  soundEnabled: boolean;
  soundVolume: number; // 0-1
  
  // Haptics (Gamepad)
  therapistVibrationEnabled: boolean;
  clientVibrationEnabled: boolean;

  durationSeconds: number; // 0 for infinite
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
  lastUpdate: number;
}

export interface SessionMessage {
  type: 'SYNC_SETTINGS' | 'REQUEST_SYNC' | 'SESSION_END' | 'CLIENT_STATUS';
  payload?: Partial<EMDRSettings>;
  clientStatus?: ClientStatus;
  timestamp: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
}