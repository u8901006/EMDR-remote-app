
import { useEffect, useCallback } from 'react';
import { EMDRSettings } from '../types';

interface UseTherapistShortcutsProps {
  settings: EMDRSettings;
  updateSettings: (settings: Partial<EMDRSettings>) => void;
  onBookmark: () => void;
  isEnabled: boolean;
}

export const useTherapistShortcuts = ({ 
  settings, 
  updateSettings, 
  onBookmark,
  isEnabled 
}: UseTherapistShortcutsProps) => {

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!isEnabled) return;

    // Ignore shortcuts if user is typing in an input field
    const target = e.target as HTMLElement;
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable) {
      return;
    }

    switch (e.code) {
      case 'Space':
        e.preventDefault(); // Prevent scrolling
        updateSettings({ isPlaying: !settings.isPlaying });
        break;

      case 'ArrowLeft':
        e.preventDefault();
        // Decrease speed (min 1)
        updateSettings({ speed: Math.max(1, settings.speed - 5) });
        break;

      case 'ArrowRight':
        e.preventDefault();
        // Increase speed (max 100)
        updateSettings({ speed: Math.min(100, settings.speed + 5) });
        break;

      case 'ArrowUp':
        e.preventDefault();
        // Increase size (max 150)
        updateSettings({ size: Math.min(150, settings.size + 5) });
        break;

      case 'ArrowDown':
        e.preventDefault();
        // Decrease size (min 10)
        updateSettings({ size: Math.max(10, settings.size - 5) });
        break;

      case 'KeyM':
        e.preventDefault();
        onBookmark();
        break;
        
      default:
        break;
    }
  }, [settings, updateSettings, onBookmark, isEnabled]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
};
