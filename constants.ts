
import { EMDRSettings, MovementPattern, VisualTheme } from './types';

export const DEFAULT_SETTINGS: EMDRSettings = {
  isPlaying: false,
  speed: 50,
  size: 40,
  color: '#3b82f6', // Blue-500
  backgroundColor: '#020617', // Slate-950
  pattern: MovementPattern.LINEAR,
  depthEnabled: false,
  
  theme: VisualTheme.STANDARD,
  customImageUrl: '',
  themeOpacity: 0.3, // Default dimming for images

  soundEnabled: false,
  soundVolume: 0.5,
  
  therapistVibrationEnabled: false,
  clientVibrationEnabled: false,

  durationSeconds: 0,
  targetPasses: 0,
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

export const EMDR_SCRIPTS = [
  {
    id: 'safe_place',
    title: 'Safe/Calm Place (安全地)',
    content: `I would like you to bring up the image of your Safe or Calm Place.\n\nNotice the colors, the sounds, and the sensations of being there.\n\nAs you focus on that pleasant feeling, let me know when you have it fully in mind.\n\n(Wait for signal)\n\nGood. Focus on that feeling... (Start BLS)`
  },
  {
    id: 'container',
    title: 'Container Exercise (封存技術)',
    content: `Imagine a container that is strong enough to hold all of your disturbing thoughts and feelings.\n\nIt can be anything—a safe, a box, a vault.\n\nNotice what it looks like. How does it lock?\n\nNow, gather up all the disturbance from today and put it into the container. Lock it up tight.\n\nHow does it feel to have that put away for now?`
  },
  {
    id: 'light_stream',
    title: 'Light Stream (光束法)',
    content: `Imagine a beam of healing light coming from above.\n\nIt can be any color you associate with healing or calm.\n\nLet this light enter through the top of your head and flow down through your body.\n\nLet it soothe any tension, washing away the discomfort, pushing it out through the soles of your feet.`
  },
  {
    id: 'spiral',
    title: 'Spiral Technique (螺旋技術)',
    content: `Bring your attention to the disturbing sensation in your body.\n\nIf this feeling had a shape, what would it be? If it had a color, what would it be?\n\nImagine it spinning. Is it spinning clockwise or counter-clockwise?\n\nNow, I want you to gently reverse the direction of the spin. Watch it slow down, stop, and start spinning in the opposite direction.\n\nNotice what happens to the color and the intensity as it spins the other way.`
  },
  {
    id: 'flash',
    title: 'Flash Technique (閃光技術)',
    content: `Identify a Positive Engaging Focus (PEF). This should be something that captures your interest and brings you joy or calm (e.g., a hobby, a vacation spot, a favorite song).\n\nFocus entirely on that PEF. Describe it to me.\n\n(While client focuses on PEF)\n\nNow, when I say 'Flash', I want you to blink your eyes rapidly 3 times, briefly touching on the disturbance, and then immediately return your focus to the PEF.\n\nReady? ... FLASH (Blink, Blink, Blink).\n\nGood. Go right back to the PEF. What are you noticing about it now?`
  },
  {
    id: 'loving_eyes',
    title: 'Loving Eyes Procedure (慈愛眼神)',
    content: `Bring to mind an image of yourself as a child, perhaps around the age the difficulty began.\n\nNow, imagine looking at that child through the eyes of someone who loves them unconditionally (a grandparent, a spiritual figure, or your current adult self).\n\nLook at that child with total acceptance and compassion.\n\nNotice how that child reacts to being seen with such love.\n\nAs you hold that connection, notice what you are feeling in your body.`
  }
];
