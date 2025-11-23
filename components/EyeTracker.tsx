import React, { useEffect, useRef, useState } from 'react';
import { ClientStatus, EMDRSettings } from '../types';
import { Eye, EyeOff, Video } from 'lucide-react';

interface EyeTrackerProps {
  settings: EMDRSettings;
  onStatusChange: (status: ClientStatus) => void;
}

const EyeTracker: React.FC<EyeTrackerProps> = ({ settings, onStatusChange }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isActive, setIsActive] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  
  // Refs for loop logic to avoid re-renders
  const prevFrameDataRef = useRef<Uint8ClampedArray | null>(null);
  const consecutiveFrozenFramesRef = useRef(0);
  const lastReportTimeRef = useRef(0);
  
  useEffect(() => {
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { 
                width: { ideal: 320 }, 
                height: { ideal: 240 },
                frameRate: { ideal: 15 }
            } 
        });
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
          setIsActive(true);
        }
      } catch (err) {
        console.error("Error accessing webcam:", err);
        setPermissionDenied(true);
        onStatusChange({
            isCameraActive: false,
            isFrozen: false,
            motionScore: 0,
            lastUpdate: Date.now()
        });
      }
    };

    startCamera();

    return () => {
      // Cleanup stream
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!isActive) return;

    let animationFrameId: number;
    const canvas = canvasRef.current;
    const video = videoRef.current;
    
    if (!canvas || !video) return;
    
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    
    const processFrame = () => {
      if (video.readyState === video.HAVE_ENOUGH_DATA && ctx) {
        // Downscale for performance
        const width = 64;
        const height = 48;
        
        if (canvas.width !== width) canvas.width = width;
        if (canvas.height !== height) canvas.height = height;

        // Draw current video frame
        ctx.drawImage(video, 0, 0, width, height);
        
        // Get pixel data
        const frameData = ctx.getImageData(0, 0, width, height).data;
        
        // Compare with previous frame
        if (prevFrameDataRef.current) {
            let diffSum = 0;
            // Sample pixels (every 4th pixel to save CPU)
            for (let i = 0; i < frameData.length; i += 16) {
                // Just check Green channel for simple brightness/motion diff
                const diff = Math.abs(frameData[i] - prevFrameDataRef.current[i]);
                diffSum += diff;
            }

            // Normalize score (0-100 roughly)
            // Max diff per pixel is 255. We checked frameData.length / 16 pixels.
            const pixelsChecked = frameData.length / 16;
            const averageDiff = diffSum / pixelsChecked;
            
            // Thresholds
            // High averageDiff means lots of movement.
            // Low averageDiff means stillness.
            const motionScore = Math.min(100, averageDiff * 5); 
            
            // Freeze Sensitivity Calculation
            // Sensitivity 0 (Strict) -> Threshold ~0.5 (Needs extreme stillness to be "Frozen")
            // Sensitivity 100 (Sensitive) -> Threshold ~5.5 (Easier to be considered "Frozen")
            const sensitivity = settings.freezeSensitivity ?? 50;
            const FREEZE_THRESHOLD = 0.5 + (sensitivity / 100) * 5.0;
            
            if (motionScore < FREEZE_THRESHOLD) {
                consecutiveFrozenFramesRef.current += 1;
            } else {
                consecutiveFrozenFramesRef.current = 0;
            }

            // If frozen for approx 2 seconds (assuming 15-30fps processing)
            // We use a counter threshold. 30 frames ~ 1-2 seconds.
            const isFrozen = consecutiveFrozenFramesRef.current > 30;

            // Report status (throttle to every 500ms to save broadcast bandwidth)
            const now = Date.now();
            if (now - lastReportTimeRef.current > 500) {
                onStatusChange({
                    isCameraActive: true,
                    isFrozen,
                    motionScore,
                    lastUpdate: now
                });
                lastReportTimeRef.current = now;
            }
        }

        // Save current frame for next comparison
        // We must copy it, otherwise we reference the same buffer
        prevFrameDataRef.current = new Uint8ClampedArray(frameData);
      }

      animationFrameId = requestAnimationFrame(processFrame);
    };

    animationFrameId = requestAnimationFrame(processFrame);

    return () => cancelAnimationFrame(animationFrameId);
  }, [isActive, onStatusChange, settings.freezeSensitivity]);

  if (permissionDenied) {
      return null;
  }

  return (
    <div className="fixed top-4 right-20 z-50 opacity-50 hover:opacity-100 transition-opacity">
       <div className="bg-slate-900/80 border border-slate-700 rounded-full px-3 py-1 flex items-center gap-2">
           {isActive ? (
               <>
                <div className="relative">
                    <Video size={14} className="text-green-400" />
                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                </div>
                <span className="text-[10px] text-slate-300 uppercase font-mono">Sensor Active</span>
               </>
           ) : (
               <>
                <EyeOff size={14} className="text-slate-500" />
                <span className="text-[10px] text-slate-500 uppercase font-mono">Initializing...</span>
               </>
           )}
       </div>
       {/* Hidden processing elements */}
       <video ref={videoRef} className="hidden" playsInline muted />
       <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

export default EyeTracker;