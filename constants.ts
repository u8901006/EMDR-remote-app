import { EMDRSettings, MovementPattern } from './types';

export const DEFAULT_SETTINGS: EMDRSettings = {
  isPlaying: false,
  speed: 50,
  size: 40,
  color: '#3b82f6', // Blue-500
  backgroundColor: '#020617', // Slate-950
  pattern: MovementPattern.LINEAR,
  depthEnabled: false,
  
  soundEnabled: false,
  soundVolume: 0.5,
  
  therapistVibrationEnabled: false,
  clientVibrationEnabled: false,

  durationSeconds: 0,
  freezeSensitivity: 50,
  liveKitUrl: '',
  liveKitTherapistToken: '',
  liveKitClientToken: '',
};

export const BROADCAST_CHANNEL_NAME = 'mindsync-emdr-channel';

export const PRESET_COLORS = [
  '#3b82f6', // Blue
  '#ef4444', // Red
  '#22c55e', // Green
  '#eab308', // Yellow
  '#a855f7', // Purple
  '#ffffff', // White
];

export const PRESET_BG_COLORS = [
  '#020617', // Dark Slate
  '#000000', // Black
  '#1e293b', // Light Slate
  '#334155', // Grey
];