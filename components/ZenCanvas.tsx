import React, { useRef, useEffect } from 'react';
import { ZenSettings, ZenShape, HandPoint } from '../types';

interface ZenCanvasProps {
  settings: ZenSettings;
  hands: HandPoint[]; // Normalized 0-1
  speed: number; // 1-100 for Auto BLS
}

interface Particle {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  // target offsets relative to center
  tx: number;
  ty: number;
  tz: number;
  color: string;
  size: number;
}

const ZenCanvas: React.FC<ZenCanvasProps> = ({ settings, hands, speed }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>(0);
  const particlesRef = useRef<Particle[]>([]);
  
  // Track the dynamic center of the system
  const systemCenterRef = useRef({ x: 0, y: 0 });
  const timeRef = useRef(0);

  // Initialize Particles
  useEffect(() => {
    const particles: Particle[] = [];
    const count = settings.density;
    
    // Initial center
    systemCenterRef.current = { x: window.innerWidth / 2, y: window.innerHeight / 2 };

    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        z: Math.random() * 500,
        vx: 0, vy: 0, vz: 0,
        tx: 0, ty: 0, tz: 0,
        color: settings.colorHex,
        size: Math.random() * 2 + 1
      });
    }
    particlesRef.current = particles;
  }, [settings.density, settings.colorHex]);

  // Physics & Render Loop
  const animate = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (canvas.width !== window.innerWidth || canvas.height !== window.innerHeight) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }

    // Clear with Fade for trails
    ctx.fillStyle = 'rgba(2, 6, 23, 0.25)'; // Slightly faster fade for clearer movement
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Global Time
    timeRef.current += 0.01;
    const time = timeRef.current;

    // --- 1. HYBRID CONTROL LOGIC ---
    let targetCX = canvas.width / 2;
    let targetCY = canvas.height / 2;

    if (hands.length > 0) {
        // [Conductor Mode] Follow Hand
        // Use the first hand (index 0) as the primary attractor
        targetCX = hands[0].x * canvas.width;
        targetCY = hands[0].y * canvas.height;
    } else {
        // [Auto BLS Mode] Pendulum / Sine Wave
        // Speed 1-100 -> Frequency 0.2Hz - 2.0Hz approx
        const frequency = 0.2 + (speed / 100) * 1.5; 
        // Amplitude: 40% of screen width (80% sweep)
        const amplitude = canvas.width * 0.4;
        
        targetCX = (canvas.width / 2) + Math.sin(time * frequency * Math.PI) * amplitude;
        // Add slight vertical figure-8 motion for organic feel if speed is moderate
        targetCY = (canvas.height / 2) + Math.cos(time * frequency * Math.PI * 2) * (canvas.height * 0.05);
    }

    // Smoothly interpolate current center to target (Ease out)
    // Higher factor = tighter following
    const lerpFactor = 0.08;
    systemCenterRef.current.x += (targetCX - systemCenterRef.current.x) * lerpFactor;
    systemCenterRef.current.y += (targetCY - systemCenterRef.current.y) * lerpFactor;

    const cx = systemCenterRef.current.x;
    const cy = systemCenterRef.current.y;
    
    // Scale particles based on settings
    const scale = Math.min(canvas.width, canvas.height) * 0.35 * settings.scale;
    const particles = particlesRef.current;

    // --- 2. PARTICLE PHYSICS ---
    particles.forEach((p, i) => {
        // Calculate Target Shape Offsets (tx, ty, tz) relative to (0,0,0)
        
        const angle = (i / particles.length) * Math.PI * 2;
        const u = Math.random() * Math.PI * 2;
        const v = Math.random() * Math.PI;

        switch (settings.shape) {
            case ZenShape.SPHERE:
                const theta = Math.acos(2 * Math.random() - 1);
                const phi = 2 * Math.PI * Math.random();
                p.tx = scale * Math.sin(theta) * Math.cos(phi);
                p.ty = scale * Math.sin(theta) * Math.sin(phi);
                p.tz = scale * Math.cos(theta);
                break;
            case ZenShape.SATURN:
                 if (i % 3 === 0) {
                     // Ring
                     const ringR = scale * (1.5 + Math.random() * 0.5);
                     p.tx = ringR * Math.cos(angle + time * 0.5); // Spin
                     p.ty = ringR * Math.sin(angle + time * 0.5) * 0.2; 
                     p.tz = ringR * Math.sin(angle + time * 0.5);
                 } else {
                     // Body
                     const theta = Math.acos(2 * Math.random() - 1);
                     const phi = 2 * Math.PI * Math.random();
                     p.tx = (scale * 0.7) * Math.sin(theta) * Math.cos(phi);
                     p.ty = (scale * 0.7) * Math.sin(theta) * Math.sin(phi);
                     p.tz = (scale * 0.7) * Math.cos(theta);
                 }
                break;
            case ZenShape.HEART:
                const hT = (i / particles.length) * Math.PI * 2;
                // Add some rotation to the heart
                p.tx = scale * 16 * Math.pow(Math.sin(hT), 3);
                p.ty = -scale * (13 * Math.cos(hT) - 5 * Math.cos(2 * hT) - 2 * Math.cos(3 * hT) - Math.cos(4 * hT));
                p.tz = (Math.random() - 0.5) * 50;
                p.tx /= 16; p.ty /= 16;
                break;
            case ZenShape.FLOWER:
                 const k = 5; 
                 const r = scale * Math.cos(k * angle);
                 p.tx = r * Math.cos(angle + time * 0.2);
                 p.ty = r * Math.sin(angle + time * 0.2);
                 p.tz = (Math.random() - 0.5) * 100;
                 break;
            case ZenShape.PYRAMID:
                const zone = i % 4;
                const pyrScale = scale * 1.2;
                // Rotate pyramid
                const rotAng = time * 0.5;
                let bx = 0, by = 0, bz = 0;
                
                if (zone === 0) { bx = 0; by = -pyrScale; bz = 0; }
                else if (zone === 1) { bx = -pyrScale; by = pyrScale; bz = pyrScale; }
                else if (zone === 2) { bx = pyrScale; by = pyrScale; bz = pyrScale; }
                else { bx = 0; by = pyrScale; bz = -pyrScale; }
                
                // Simple Y-axis rotation
                p.tx = bx * Math.cos(rotAng) - bz * Math.sin(rotAng);
                p.ty = by;
                p.tz = bx * Math.sin(rotAng) + bz * Math.cos(rotAng);
                
                p.tx += (Math.random()-0.5)*scale*0.3; // Jitter
                p.ty += (Math.random()-0.5)*scale*0.3;
                p.tz += (Math.random()-0.5)*scale*0.3;
                break;
            case ZenShape.DONUT:
                const torusR = scale;
                const tubeR = scale * 0.3;
                // Spinning donut
                p.tx = (torusR + tubeR * Math.cos(v)) * Math.cos(u + time);
                p.ty = (torusR + tubeR * Math.cos(v)) * Math.sin(u + time);
                p.tz = tubeR * Math.sin(v);
                
                // Tilt it
                const tiltedY = p.ty * Math.cos(0.5) - p.tz * Math.sin(0.5);
                const tiltedZ = p.ty * Math.sin(0.5) + p.tz * Math.cos(0.5);
                p.ty = tiltedY; p.tz = tiltedZ;
                break;
        }

        // --- Physics Integration ---
        // The target for the particle is (cx + tx, cy + ty)
        // Spring force towards target
        const targetX = cx + p.tx;
        const targetY = cy + p.ty;
        const targetZ = p.tz;

        p.vx += (targetX - p.x) * 0.05;
        p.vy += (targetY - p.y) * 0.05;
        p.vz += (targetZ - p.z) * 0.05;

        // Friction / Damping
        p.vx *= 0.85; // Higher damping prevents sloshing too much during fast BLS
        p.vy *= 0.85;
        p.vz *= 0.85;

        // Update position
        p.x += p.vx;
        p.y += p.vy;
        p.z += p.vz;

        // --- Render ---
        const perspective = 800 / (800 + p.z);
        const xRel = p.x - cx;
        const yRel = p.y - cy;
        
        const x2d = cx + xRel * perspective;
        const y2d = cy + yRel * perspective;
        
        const size2d = p.size * perspective;
        const alpha = Math.min(1, Math.max(0, (settings.luminance + (p.z/1000)) * perspective));

        ctx.fillStyle = p.color;
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.arc(x2d, y2d, size2d, 0, Math.PI * 2);
        ctx.fill();
    });

    // --- 3. RENDER CORE (Visual Anchor) ---
    // A glowing orb at the center to guide the eyes (Critical for EMDR)
    ctx.globalAlpha = 1.0;
    
    // Outer Glow
    const gradient = ctx.createRadialGradient(cx, cy, 5, cx, cy, 40);
    gradient.addColorStop(0, settings.colorHex);
    gradient.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(cx, cy, 40, 0, Math.PI * 2);
    ctx.fill();

    // Inner Core
    ctx.fillStyle = '#ffffff';
    ctx.shadowBlur = 15;
    ctx.shadowColor = settings.colorHex;
    ctx.beginPath();
    ctx.arc(cx, cy, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    requestRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
      requestRef.current = requestAnimationFrame(animate);
      return () => cancelAnimationFrame(requestRef.current);
  });

  return (
    <canvas ref={canvasRef} className="absolute inset-0 w-full h-full bg-slate-950 z-0" />
  );
};

export default ZenCanvas;