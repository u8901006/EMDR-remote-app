
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
    title: {
      en: 'Safe/Calm Place',
      'zh-TW': '安全地 / 平靜地'
    },
    content: {
      en: `I would like you to bring up the image of your Safe or Calm Place.\n\nNotice the colors, the sounds, and the sensations of being there.\n\nAs you focus on that pleasant feeling, let me know when you have it fully in mind.\n\n(Wait for signal)\n\nGood. Focus on that feeling... (Start BLS)`,
      'zh-TW': `我想請您在腦海中浮現那個讓您感到安全或平靜的地方。\n\n注意那裡的顏色、聲音，以及身在其中的感覺。\n\n當您專注於那種舒適的感覺時，一旦影像清晰了，請讓我知道。\n\n(等待信號)\n\n很好。專注於那種感覺... (開始雙側刺激)`
    }
  },
  {
    id: 'container',
    title: {
      en: 'Container Exercise',
      'zh-TW': '容器練習 (封存技術)'
    },
    content: {
      en: `Imagine a container that is strong enough to hold all of your disturbing thoughts and feelings.\n\nIt can be anything—a safe, a box, a vault.\n\nNotice what it looks like. How does it lock?\n\nNow, gather up all the disturbance from today and put it into the container. Lock it up tight.\n\nHow does it feel to have that put away for now?`,
      'zh-TW': `想像一個足夠堅固的容器，可以裝下所有的困擾、想法和感覺。\n\n它可以是任何東西——保險箱、箱子、或金庫。\n\n注意它的樣子。它是如何上鎖的？\n\n現在，將今天所有的困擾收集起來，放進容器裡。把它鎖緊。\n\n現在把它收好了，您的感覺如何？`
    }
  },
  {
    id: 'light_stream',
    title: {
      en: 'Light Stream',
      'zh-TW': '光束法 (Light Stream)'
    },
    content: {
      en: `Imagine a beam of healing light coming from above.\n\nIt can be any color you associate with healing or calm.\n\nLet this light enter through the top of your head and flow down through your body.\n\nLet it soothe any tension, washing away the discomfort, pushing it out through the soles of your feet.`,
      'zh-TW': `想像一道療癒的光束從上方照下來。\n\n它可以是任何您聯想到療癒或平靜的顏色。\n\n讓這道光從您的頭頂進入，流過您的全身。\n\n讓它撫平所有的緊繃，沖刷掉不適，將它們從您的腳底推出去。`
    }
  },
  {
    id: 'spiral',
    title: {
      en: 'Spiral Technique',
      'zh-TW': '螺旋技術 (Spiral)'
    },
    content: {
      en: `Bring your attention to the disturbing sensation in your body.\n\nIf this feeling had a shape, what would it be? If it had a color, what would it be?\n\nImagine it spinning. Is it spinning clockwise or counter-clockwise?\n\nNow, I want you to gently reverse the direction of the spin. Watch it slow down, stop, and start spinning in the opposite direction.\n\nNotice what happens to the color and the intensity as it spins the other way.`,
      'zh-TW': `將注意力集中在身體上那種不舒服的感覺。\n\n如果這種感覺有形狀，它會是什麼樣子？如果有顏色，會是什麼顏色？\n\n想像它在旋轉。是順時針還是逆時針轉？\n\n現在，我要您輕輕地讓它反方向旋轉。看著它慢下來，停住，然後開始往相反的方向轉。\n\n注意當它反轉時，顏色和強度發生了什麼變化。`
    }
  },
  {
    id: 'flash',
    title: {
      en: 'Flash Technique',
      'zh-TW': '閃光技術 (Flash)'
    },
    content: {
      en: `Identify a Positive Engaging Focus (PEF). This should be something that captures your interest and brings you joy or calm (e.g., a hobby, a vacation spot, a favorite song).\n\nFocus entirely on that PEF. Describe it to me.\n\n(While client focuses on PEF)\n\nNow, when I say 'Flash', I want you to blink your eyes rapidly 3 times, briefly touching on the disturbance, and then immediately return your focus to the PEF.\n\nReady? ... FLASH (Blink, Blink, Blink).\n\nGood. Go right back to the PEF. What are you noticing about it now?`,
      'zh-TW': `請找出一個「正向且吸引人的焦點 (PEF)」。這應該是某個能引起您興趣並帶來快樂或平靜的事物（例如：嗜好、度假地點、喜歡的歌）。\n\n全神貫注在這個 PEF 上。請向我描述它。\n\n(當個案專注於 PEF 時)\n\n現在，當我說「閃光」時，我要您快速眨眼 3 次，短暫地觸及那個困擾，然後立刻將注意力轉回 PEF。\n\n準備好了嗎？... 閃光 (眨眼、眨眼、眨眼)。\n\n很好。立刻回到 PEF。您現在注意到什麼？`
    }
  },
  {
    id: 'loving_eyes',
    title: {
      en: 'Loving Eyes Procedure',
      'zh-TW': '慈愛眼神 (Loving Eyes)'
    },
    content: {
      en: `Bring to mind an image of yourself as a child, perhaps around the age the difficulty began.\n\nNow, imagine looking at that child through the eyes of someone who loves them unconditionally (a grandparent, a spiritual figure, or your current adult self).\n\nLook at that child with total acceptance and compassion.\n\nNotice how that child reacts to being seen with such love.\n\nAs you hold that connection, notice what you are feeling in your body.`,
      'zh-TW': `請在腦海中浮現您童年時的影像，或許是困難開始發生時的那個年紀。\n\n現在，想像透過一位無條件愛著這個孩子的人的眼睛來看著他（可以是祖父母、精神信仰的人物，或是現在成年的您自己）。\n\n帶著完全的接納與慈悲看著那個孩子。\n\n注意那個孩子在被如此慈愛的目光注視時，有什麼反應。\n\n當您保持這種連結時，注意您身體裡的感覺。`
    }
  }
];
