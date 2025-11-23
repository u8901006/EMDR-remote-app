import React, { useRef, useEffect } from 'react';
import { EMDRSettings, MovementPattern, SessionRole } from '../types';

interface EMDRCanvasProps {
  settings: EMDRSettings;
  role: SessionRole;
}

const EMDRCanvas: React.FC<EMDRCanvasProps> = ({ settings, role }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>(0);
  const timeRef = useRef<number>(0);
  
  // Audio Context Refs
  const audioCtxRef = useRef<AudioContext | null>(null);
  const prevCosRef = useRef<number>(0); // Tracks the derivative to detect peaks

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

  const animate = (time: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Resize handling
    if (canvas.width !== window.innerWidth || canvas.height !== window.innerHeight) {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }

    // Clear canvas
    ctx.fillStyle = settings.backgroundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (!settings.isPlaying) {
        // Draw center if paused
        const cx = canvas.width / 2;
        const cy = canvas.height / 2;
        drawBall(ctx, cx, cy);
        // Keep loop running to handle resize, but don't increment time
        requestRef.current = requestAnimationFrame(animate);
        return;
    }

    // Update time based on speed
    // Speed 1 = very slow, Speed 100 = very fast
    // Base frequency approx 0.1 Hz to 3 Hz
    const frequency = 0.1 + (settings.speed / 100) * 2.0; 
    const dt = 0.016; // approx 60fps
    timeRef.current += dt * frequency * (Math.PI * 2);

    const t = timeRef.current;
    
    // Sync Logic: Detect peaks for Sound & Haptics
    // We check the derivative (Math.cos). Zero crossing of cos means peak of sin.
    const cosT = Math.cos(t);
    const prevCos = prevCosRef.current;

    // If derivative crosses zero downwards (positive to negative), Sin wave is at Peak (1) -> Right Side
    if (prevCos > 0 && cosT <= 0) {
        playTone(1);
        triggerHaptics('right');
    }
    // If derivative crosses zero upwards (negative to positive), Sin wave is at Trough (-1) -> Left Side
    else if (prevCos < 0 && cosT >= 0) {
        playTone(-1);
        triggerHaptics('left');
    }
    prevCosRef.current = cosT;

    const width = canvas.width;
    const height = canvas.height;
    const padding = settings.size + 20;
    const effectiveWidth = width - (padding * 2);
    const effectiveHeight = height - (padding * 2);
    
    let x = width / 2;
    let y = height / 2;

    // Calculate Position based on Pattern
    switch (settings.pattern) {
      case MovementPattern.LINEAR:
        // Sine wave for x, constant y
        x = (width / 2) + (Math.sin(t) * (effectiveWidth / 2));
        break;
      case MovementPattern.SINE:
        // Sine wave for x, small cosine for y (bobbing)
        x = (width / 2) + (Math.sin(t) * (effectiveWidth / 2));
        y = (height / 2) + (Math.cos(t * 2) * (height / 10));
        break;
      case MovementPattern.FIGURE_EIGHT:
        x = (width / 2) + (Math.sin(t) * (effectiveWidth / 2));
        y = (height / 2) + (Math.sin(t * 2) * (height / 8));
        break;
      case MovementPattern.VERTICAL:
        // Constant X, Sine wave for Y
        x = width / 2;
        y = (height / 2) + (Math.sin(t) * (effectiveHeight / 2));
        break;
      case MovementPattern.ALTERNATED:
        // Discrete Jump Left/Right
        // Math.sign(Math.sin(t)) gives 1 or -1 (or 0)
        // We move fully to one side or the other
        const sign = Math.sin(t) >= 0 ? 1 : -1;
        x = (width / 2) + (sign * (effectiveWidth / 2));
        y = height / 2;
        break;
      case MovementPattern.RANDOM:
        // A bit more complex, using combined sines for pseudo-randomness
        x = (width / 2) + (Math.sin(t) * (effectiveWidth / 2));
        y = (height / 2) + (Math.sin(t * 1.3) * (height / 6));
        break;
    }

    drawBall(ctx, x, y);

    requestRef.current = requestAnimationFrame(animate);
  };

  const drawBall = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
    ctx.beginPath();
    ctx.arc(x, y, settings.size / 2, 0, 2 * Math.PI);
    ctx.fillStyle = settings.color;
    ctx.fill();
    
    // Optional: Add a subtle glow
    ctx.shadowBlur = 20;
    ctx.shadowColor = settings.color;
    ctx.fill();
    ctx.shadowBlur = 0; // reset
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
      style={{ backgroundColor: settings.backgroundColor }}
    />
  );
};

export default EMDRCanvas;