import React, { useRef, useEffect } from 'react';
import { ZenSettings, ZenShape, HandPoint } from '../types';

interface ZenCanvasProps {
  settings: ZenSettings;
  hands: HandPoint[]; // Normalized 0-1
}

interface Particle {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  targetX: number;
  targetY: number;
  targetZ: number;
  color: string;
  size: number;
}

const ZenCanvas: React.FC<ZenCanvasProps> = ({ settings, hands }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>(0);
  const particlesRef = useRef<Particle[]>([]);
  
  // Initialize Particles
  useEffect(() => {
    const particles: Particle[] = [];
    const count = settings.density;
    
    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        z: Math.random() * 500,
        vx: 0, vy: 0, vz: 0,
        targetX: 0, targetY: 0, targetZ: 0,
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
    ctx.fillStyle = 'rgba(2, 6, 23, 0.3)'; // Slate-950 with trail
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const time = Date.now() * 0.001;
    const scale = Math.min(canvas.width, canvas.height) * 0.35 * settings.scale;

    const particles = particlesRef.current;

    particles.forEach((p, i) => {
        // 1. Calculate Target Position based on Shape
        let tx = 0, ty = 0, tz = 0;
        const angle = (i / particles.length) * Math.PI * 2;
        const u = Math.random() * Math.PI * 2;
        const v = Math.random() * Math.PI;

        switch (settings.shape) {
            case ZenShape.SPHERE:
                // Random points on sphere surface
                const theta = Math.acos(2 * Math.random() - 1);
                const phi = 2 * Math.PI * Math.random();
                tx = scale * Math.sin(theta) * Math.cos(phi);
                ty = scale * Math.sin(theta) * Math.sin(phi);
                tz = scale * Math.cos(theta);
                break;
            case ZenShape.SATURN:
                 if (i % 3 === 0) {
                     // Ring
                     const ringR = scale * (1.5 + Math.random() * 0.5);
                     tx = ringR * Math.cos(angle + time * 0.2);
                     ty = ringR * Math.sin(angle + time * 0.2) * 0.2; // Flattened
                     tz = ringR * Math.sin(angle + time * 0.2);
                 } else {
                     // Planet body
                     const theta = Math.acos(2 * Math.random() - 1);
                     const phi = 2 * Math.PI * Math.random();
                     tx = (scale * 0.8) * Math.sin(theta) * Math.cos(phi);
                     ty = (scale * 0.8) * Math.sin(theta) * Math.sin(phi);
                     tz = (scale * 0.8) * Math.cos(theta);
                 }
                break;
            case ZenShape.HEART:
                // Parametric Heart
                const hT = (i / particles.length) * Math.PI * 2;
                tx = scale * 16 * Math.pow(Math.sin(hT), 3);
                ty = -scale * (13 * Math.cos(hT) - 5 * Math.cos(2 * hT) - 2 * Math.cos(3 * hT) - Math.cos(4 * hT));
                tz = (Math.random() - 0.5) * 50;
                tx /= 16; ty /= 16; // Normalize scale a bit
                break;
            case ZenShape.FLOWER:
                 const k = 4; // Petals
                 const r = scale * Math.cos(k * angle);
                 tx = r * Math.cos(angle + time * 0.1);
                 ty = r * Math.sin(angle + time * 0.1);
                 tz = (Math.random() - 0.5) * 100;
                 break;
            case ZenShape.PYRAMID:
                // Simplified pyramid vertices attraction
                const zone = i % 4;
                const pyrScale = scale * 1.2;
                if (zone === 0) { tx = 0; ty = -pyrScale; tz = 0; } // Top
                else if (zone === 1) { tx = -pyrScale; ty = pyrScale; tz = pyrScale; }
                else if (zone === 2) { tx = pyrScale; ty = pyrScale; tz = pyrScale; }
                else { tx = 0; ty = pyrScale; tz = -pyrScale; }
                // Jitter
                tx += (Math.random()-0.5)*scale*0.5;
                ty += (Math.random()-0.5)*scale*0.5;
                tz += (Math.random()-0.5)*scale*0.5;
                break;
            case ZenShape.DONUT:
                const torusR = scale;
                const tubeR = scale * 0.3;
                tx = (torusR + tubeR * Math.cos(v)) * Math.cos(u + time * 0.5);
                ty = (torusR + tubeR * Math.cos(v)) * Math.sin(u + time * 0.5);
                tz = tubeR * Math.sin(v);
                break;
        }

        // Apply rotation to whole shape slowly
        const rotX = tx * Math.cos(time * 0.2) - tz * Math.sin(time * 0.2);
        const rotZ = tx * Math.sin(time * 0.2) + tz * Math.cos(time * 0.2);
        tx = rotX; tz = rotZ;

        // 2. Hand Interaction (Attractor / Repeller)
        let forceX = 0, forceY = 0;
        hands.forEach(hand => {
            // Hand coordinates are 0-1, map to canvas centered at 0,0
            const hx = (hand.x * canvas.width) - cx;
            const hy = (hand.y * canvas.height) - cy;
            
            const dx = (p.x - cx) - hx;
            const dy = (p.y - cy) - hy;
            const dist = Math.sqrt(dx*dx + dy*dy);
            
            // Interaction Radius
            if (dist < 200) {
                const force = (200 - dist) / 200;
                // Swirl effect
                forceX += (dx * 0.1 + dy * 0.5) * force * 0.5;
                forceY += (dy * 0.1 - dx * 0.5) * force * 0.5;
            }
        });

        // 3. Physics Integration
        // Move towards shape target
        p.vx += (tx - (p.x - cx)) * 0.05; // Spring force
        p.vy += (ty - (p.y - cy)) * 0.05;
        p.vz += (tz - p.z) * 0.05;

        // Apply hand forces
        p.vx += forceX;
        p.vy += forceY;

        // Friction
        p.vx *= 0.9;
        p.vy *= 0.9;
        p.vz *= 0.9;

        // Update position
        p.x = cx + p.vx + (p.x - cx) * 0.1; // Lerp for smoothness
        p.y = cy + p.vy + (p.y - cy) * 0.1;
        p.z += p.vz * 0.1;

        // 4. Render Particle
        const perspective = 800 / (800 + p.z);
        const x2d = cx + (p.x - cx) * perspective;
        const y2d = cy + (p.y - cy) * perspective;
        const size2d = p.size * perspective;
        const alpha = Math.min(1, Math.max(0, (settings.luminance + (p.z/500)) * perspective));

        ctx.fillStyle = p.color;
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.arc(x2d, y2d, size2d, 0, Math.PI * 2);
        ctx.fill();
    });
    ctx.globalAlpha = 1.0;

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