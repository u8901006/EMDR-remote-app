
import React, { useRef, useEffect, useState } from 'react';
import { EMDRSettings, MovementPattern, SessionRole, VisualTheme } from '../types';

interface EMDRCanvasProps {
  settings: EMDRSettings;
  role: SessionRole;
  onSessionComplete?: () => void;
}

interface Star {
  x: number;
  y: number;
  z: number;
  size: number;
}

const EMDRCanvas: React.FC<EMDRCanvasProps> = ({ settings, role, onSessionComplete }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>(0);
  const timeRef = useRef<number>(0);
  
  // Logic Refs
  const currentPassesRef = useRef<number>(0);

  // Audio Context Refs
  const audioCtxRef = useRef<AudioContext | null>(null);
  const prevCosRef = useRef<number>(0); // Tracks the derivative to detect peaks

  // Visual Theme Refs
  const starsRef = useRef<Star[]>([]);
  const customImageRef = useRef<HTMLImageElement | null>(null);
  const loadedImageUrlRef = useRef<string>('');

  // Init Stars for Starfield
  useEffect(() => {
      const stars: Star[] = [];
      for (let i = 0; i < 200; i++) {
          stars.push({
              x: Math.random() * window.innerWidth,
              y: Math.random() * window.innerHeight,
              z: Math.random() * 2 + 0.5, // Parallax factor
              size: Math.random() * 2
          });
      }
      starsRef.current = stars;
  }, []);

  // Load Custom Image
  useEffect(() => {
      if (settings.theme === VisualTheme.CUSTOM_IMAGE && settings.customImageUrl) {
          if (loadedImageUrlRef.current !== settings.customImageUrl) {
              const img = new Image();
              img.src = settings.customImageUrl;
              img.onload = () => {
                  customImageRef.current = img;
                  loadedImageUrlRef.current = settings.customImageUrl;
              };
          }
      } else {
          customImageRef.current = null;
          loadedImageUrlRef.current = '';
      }
  }, [settings.theme, settings.customImageUrl]);

  // Reset pass counter when playback starts
  useEffect(() => {
    if (settings.isPlaying) {
      currentPassesRef.current = 0;
    }
  }, [settings.isPlaying]);

  // Initialize Audio Context
  useEffect(() => {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
        audioCtxRef.current = new AudioContextClass();
    }
    return () => {
        void audioCtxRef.current?.close();
        audioCtxRef.current = null;
    };
  }, []);

  // Trigger Gamepad Vibration
  // Side: 'left' or 'right'
  const triggerHaptics = (side: 'left' | 'right') => {
    // Check settings based on role
    if (role === SessionRole.THERAPIST && !settings.therapistVibrationEnabled) return;
    if (role === SessionRole.CLIENT && !settings.clientVibrationEnabled) return;

    // Access Gamepad API
    const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
    
    for (const gp of gamepads) {
        if (!gp || !gp.vibrationActuator) continue;
        
        // Create a "Bilateral" feel using the two motors.
        // Left Motor (StrongMagnitude) is usually the heavy weight (Low Freq).
        // Right Motor (WeakMagnitude) is usually the light weight (High Freq).
        // This gives a distinct physical sensation for Left vs Right.
        try {
            gp.vibrationActuator.playEffect('dual-rumble', {
                startDelay: 0,
                duration: 150, // 150ms pulse
                weakMagnitude: side === 'right' ? 1.0 : 0,   // High freq motor for Right
                strongMagnitude: side === 'left' ? 1.0 : 0   // Low freq motor for Left
            });
        } catch (e) {
            // Ignore errors (e.g. if browser/gamepad doesn't support effect)
        }
    }
  };

  // Play Bilateral Sound
  // Pan: -1 (Left) to 1 (Right)
  const playTone = (pan: number) => {
    if (!settings.soundEnabled || !audioCtxRef.current) return;
    
    const ctx = audioCtxRef.current;
    
    // Resume context if suspended (browsers auto-suspend until user interaction)
    if (ctx.state === 'suspended') {
        void ctx.resume();
    }

    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    const panner = ctx.createStereoPanner();

    // Configure sound
    osc.type = 'sine'; 
    osc.frequency.setValueAtTime(400, ctx.currentTime); // Soft beep (A4 approx 440Hz, lowered slightly)
    
    // Envelope for a soft "tick"
    gainNode.gain.setValueAtTime(0, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(settings.soundVolume * 0.5, ctx.currentTime + 0.02); // Attack
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15); // Decay

    panner.pan.value = pan;

    osc.connect(panner);
    panner.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.2);
  };

  const drawBackground = (ctx: CanvasRenderingContext2D, width: number, height: number, t: number) => {
      let grad;
      let breathe;
      
      switch (settings.theme) {
          case VisualTheme.STANDARD:
              ctx.fillStyle = settings.backgroundColor;
              ctx.fillRect(0, 0, width, height);
              break;

          case VisualTheme.STARFIELD:
              // Dark Void
              ctx.fillStyle = '#020617'; // Slate 950
              ctx.fillRect(0, 0, width, height);
              
              ctx.fillStyle = '#ffffff';
              starsRef.current.forEach(star => {
                  ctx.globalAlpha = 0.6 + Math.sin(t * star.z) * 0.4; // Twinkle
                  // Simple drift
                  const x = (star.x + (t * 20 * star.z)) % width;
                  ctx.beginPath();
                  ctx.arc(x, star.y, star.size, 0, 2 * Math.PI);
                  ctx.fill();
              });
              ctx.globalAlpha = 1.0;
              break;

          case VisualTheme.BREATHING_FOREST:
              breathe = Math.sin(t * 0.5); // Slow breath
              // Gradient center moves slightly
              grad = ctx.createRadialGradient(
                  width / 2, height / 2 + (breathe * 20), 0, 
                  width / 2, height / 2, Math.max(width, height)
              );
              // Deep Green to Dark Slate
              grad.addColorStop(0, '#0f2f21'); // Deep Forest
              grad.addColorStop(0.6 + (breathe * 0.1), '#051f15'); 
              grad.addColorStop(1, '#020617');
              
              ctx.fillStyle = grad;
              ctx.fillRect(0, 0, width, height);
              break;

          case VisualTheme.BREATHING_OCEAN:
              const oceanFlow = Math.sin(t * 0.3);
              grad = ctx.createLinearGradient(0, 0, 0, height);
              grad.addColorStop(0, '#0f172a'); // Deep slate/blue
              grad.addColorStop(0.5 + (oceanFlow * 0.1), '#1e3a8a'); // Blue 900
              grad.addColorStop(1, '#0d9488'); // Teal 600
              
              ctx.fillStyle = grad;
              ctx.fillRect(0, 0, width, height);
              break;

          case VisualTheme.GOLDEN_HOUR:
              // Warm gradient breathing
              const sunPulse = Math.sin(t * 0.2);
              grad = ctx.createLinearGradient(0, 0, 0, height); 
              grad.addColorStop(0, '#4c1d95'); // Violet 900 (Top)
              grad.addColorStop(0.6 + (sunPulse * 0.05), '#be185d'); // Pink 700
              grad.addColorStop(1, '#d97706'); // Amber 600 (Bottom)
              
              ctx.fillStyle = grad;
              ctx.fillRect(0, 0, width, height);
              break;

          case VisualTheme.AURORA:
              // Shifting diagonal gradient with dual modulation for organic feel
              const auroraShift = Math.sin(t * 0.4);
              const auroraShift2 = Math.cos(t * 0.3);
              
              // Move gradient angle slightly
              grad = ctx.createLinearGradient(
                  0 + (auroraShift2 * 50), 0, 
                  width - (auroraShift2 * 50), height
              );
              grad.addColorStop(0, '#312e81'); // Indigo 900
              grad.addColorStop(0.3 + (auroraShift * 0.15), '#10b981'); // Emerald 500
              grad.addColorStop(0.7 - (auroraShift * 0.15), '#8b5cf6'); // Violet 500
              grad.addColorStop(1, '#020617'); // Dark
              
              ctx.fillStyle = grad;
              ctx.fillRect(0, 0, width, height);
              break;

          case VisualTheme.CUSTOM_IMAGE:
              if (customImageRef.current) {
                  // Draw image cover
                  const img = customImageRef.current;
                  const ratio = Math.max(width / img.width, height / img.height);
                  const centerShift_x = (width - img.width * ratio) / 2;
                  const centerShift_y = (height - img.height * ratio) / 2;
                  
                  ctx.drawImage(img, 0, 0, img.width, img.height, centerShift_x, centerShift_y, img.width * ratio, img.height * ratio);
                  
                  // Dark overlay for contrast
                  ctx.fillStyle = `rgba(0,0,0,${settings.themeOpacity})`;
                  ctx.fillRect(0, 0, width, height);
              } else {
                  // Fallback
                  ctx.fillStyle = '#1e293b';
                  ctx.fillRect(0, 0, width, height);
                  ctx.fillStyle = '#64748b';
                  ctx.textAlign = 'center';
                  ctx.font = '14px sans-serif';
                  ctx.fillText('Loading Custom Image...', width / 2, height / 2);
              }
              break;
      }
  };

  const animate = (time: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Resize handling
    if (canvas.width !== window.innerWidth || canvas.height !== window.innerHeight) {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      // Re-init stars if resized drastically
      if (Math.abs(canvas.width - window.innerWidth) > 100) {
           // could re-init stars here
      }
    }

    const width = canvas.width;
    const height = canvas.height;

    // --- TIMING LOGIC ---
    let t = timeRef.current;
    
    // Update time based on speed if playing
    if (settings.isPlaying) {
        // Speed 1 = very slow, Speed 100 = very fast
        // Base frequency approx 0.1 Hz to 3 Hz
        const frequency = 0.1 + (settings.speed / 100) * 2.0; 
        const dt = 0.016; // approx 60fps
        timeRef.current += dt * frequency * (Math.PI * 2);
        t = timeRef.current;
    } else {
        // Even if paused, we advance 't' very slowly for background effects (breathing, stars)
        // unless it's standard theme which is static.
        timeRef.current += 0.005; 
        t = timeRef.current;
    }

    // --- DRAW BACKGROUND ---
    drawBackground(ctx, width, height, t);

    // If Paused, just draw center ball and exit (but background animates)
    if (!settings.isPlaying) {
        const cx = width / 2;
        const cy = height / 2;
        drawBall(ctx, cx, cy, 1, 1);
        requestRef.current = requestAnimationFrame(animate);
        return;
    }
    
    // --- AUDIO & HAPTIC SYNC ---
    const cosT = Math.cos(t);
    const prevCos = prevCosRef.current;

    // Trigger on peak detection
    if (prevCos > 0 && cosT <= 0) {
        playTone(1);
        triggerHaptics('right');
    } else if (prevCos < 0 && cosT >= 0) {
        playTone(-1);
        triggerHaptics('left');
        
        // Pass Counting Logic
        if (settings.targetPasses > 0) {
            currentPassesRef.current += 1;
            if (currentPassesRef.current >= settings.targetPasses) {
                if (onSessionComplete) onSessionComplete();
            }
        }
    }
    prevCosRef.current = cosT;

    // --- BALL POSITION LOGIC ---
    const padding = settings.size + 20;
    const effectiveWidth = width - (padding * 2);
    const effectiveHeight = height - (padding * 2);
    
    let x = width / 2;
    let y = height / 2;

    switch (settings.pattern) {
      case MovementPattern.LINEAR:
        x = (width / 2) + (Math.sin(t) * (effectiveWidth / 2));
        break;
      case MovementPattern.SINE:
        x = (width / 2) + (Math.sin(t) * (effectiveWidth / 2));
        y = (height / 2) + (Math.cos(t * 2) * (height / 10));
        break;
      case MovementPattern.FIGURE_EIGHT:
        x = (width / 2) + (Math.sin(t) * (effectiveWidth / 2));
        y = (height / 2) + (Math.sin(t * 2) * (height / 8));
        break;
      case MovementPattern.VERTICAL:
        x = width / 2;
        y = (height / 2) + (Math.sin(t) * (effectiveHeight / 2));
        break;
      case MovementPattern.ALTERNATED:
        const sign = Math.sin(t) >= 0 ? 1 : -1;
        x = (width / 2) + (sign * (effectiveWidth / 2));
        y = height / 2;
        break;
      case MovementPattern.RANDOM:
        x = (width / 2) + (Math.sin(t) * (effectiveWidth / 2));
        y = (height / 2) + (Math.sin(t * 1.3) * (height / 6));
        break;
    }

    // --- 3D DEPTH LOGIC ---
    let scale = 1;
    let opacity = 1.0;
    
    if (settings.depthEnabled) {
        const depthPhase = Math.cos(t); 
        scale = 1.0 + (depthPhase * 0.4);
        opacity = 0.6 + (0.4 * ((depthPhase + 1) / 2));
    }

    drawBall(ctx, x, y, scale, opacity);

    requestRef.current = requestAnimationFrame(animate);
  };

  const drawBall = (ctx: CanvasRenderingContext2D, x: number, y: number, scale: number, opacity: number) => {
    ctx.save();
    
    const size = settings.size * scale;
    ctx.globalAlpha = opacity;
    
    ctx.beginPath();
    ctx.arc(x, y, size / 2, 0, 2 * Math.PI);
    ctx.fillStyle = settings.color;
    ctx.fill();
    
    // Glow effect
    if (opacity > 0.8) {
        ctx.shadowBlur = 20 * scale;
        ctx.shadowColor = settings.color;
        ctx.fill();
        ctx.shadowBlur = 0; 
    }
    
    ctx.restore();
  };

  useEffect(() => {
    requestRef.current = requestAnimationFrame(animate);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings]);

  return (
    <canvas
      ref={canvasRef}
      className="block absolute top-0 left-0 w-full h-full cursor-none"
    />
  );
};

export default EMDRCanvas;
