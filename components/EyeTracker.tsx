import React, { useEffect, useRef, useState } from 'react';
import { ClientStatus, EMDRSettings } from '../types';
import { Eye, EyeOff, Video, Activity, AlertTriangle } from 'lucide-react';

interface EyeTrackerProps {
  settings: EMDRSettings;
  onStatusChange: (status: ClientStatus) => void;
}

// Define globals for the CDN scripts loaded in index.html
declare global {
  interface Window {
    FaceMesh: any;
    Camera: any;
  }
}

const EyeTracker: React.FC<EyeTrackerProps> = ({ settings, onStatusChange }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isActive, setIsActive] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [permissionDenied, setPermissionDenied] = useState(false);
  
  // Logic Refs
  const faceMeshRef = useRef<any>(null);
  const cameraRef = useRef<any>(null);
  const prevLandmarksRef = useRef<any[] | null>(null);
  const consecutiveFrozenFramesRef = useRef(0);
  const lastReportTimeRef = useRef(0);
  const lowConfidenceFramesRef = useRef(0);

  useEffect(() => {
    let isMounted = true;

    const initMediaPipe = async () => {
      // Ensure libraries are loaded from index.html
      if (!window.FaceMesh || !window.Camera) {
        console.error("MediaPipe libraries not found. Ensure scripts are in index.html");
        setIsInitializing(false);
        return;
      }

      try {
        const faceMesh = new window.FaceMesh({
            locateFile: (file: string) => {
                return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`;
            }
        });

        faceMesh.setOptions({
            maxNumFaces: 1,
            refineLandmarks: true, // Critical for Iris tracking (Points 468-477)
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5
        });

        faceMesh.onResults(onResults);
        faceMeshRef.current = faceMesh;

        if (videoRef.current) {
            // CameraUtils handles the loop: getUserMedia -> requestAnimationFrame -> faceMesh.send()
            const camera = new window.Camera(videoRef.current, {
                onFrame: async () => {
                    if (faceMeshRef.current && videoRef.current) {
                        await faceMeshRef.current.send({ image: videoRef.current });
                    }
                },
                width: 320, // Low res is sufficient for stability tracking and saves CPU
                height: 240
            });
            cameraRef.current = camera;
            await camera.start();
            
            if (isMounted) {
                setIsActive(true);
                setIsInitializing(false);
            }
        }
      } catch (err) {
        console.error("Error initializing EyeTracker:", err);
        if (isMounted) {
            setPermissionDenied(true);
            setIsInitializing(false);
        }
      }
    };

    initMediaPipe();

    return () => {
      isMounted = false;
      if (cameraRef.current) cameraRef.current.stop();
      if (faceMeshRef.current) faceMeshRef.current.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onResults = (results: any) => {
    // 1. Detection Check
    if (!results.multiFaceLandmarks || results.multiFaceLandmarks.length === 0) {
        lowConfidenceFramesRef.current += 1;
        
        // If face lost for ~2 seconds (approx 30 frames depending on device speed)
        if (lowConfidenceFramesRef.current > 30) {
             const now = Date.now();
             // If previously active, report inactive
             if (now - lastReportTimeRef.current > 1000) {
                onStatusChange({
                    isCameraActive: true,
                    isFrozen: false, // Cannot determine frozen if face not seen
                    motionScore: 0,
                    lastUpdate: now
                });
                lastReportTimeRef.current = now;
             }
        }
        return;
    }

    // Face detected
    lowConfidenceFramesRef.current = 0;
    const landmarks = results.multiFaceLandmarks[0];
    
    // 2. Stability Calculation
    // We track specific keypoints to determine "Freeze" vs "Motion"
    // 1: Nose Tip (Head movement)
    // 468: Left Iris Center
    // 473: Right Iris Center
    // 33: Left Eye Corner
    // 263: Right Eye Corner
    const keyPoints = [1, 468, 473, 33, 263];
    let movementSum = 0;

    if (prevLandmarksRef.current) {
        keyPoints.forEach(index => {
            const curr = landmarks[index];
            const prev = prevLandmarksRef.current![index];
            
            // Euclidean distance between frames for this point
            // Note: Landmarks are normalized (0.0 - 1.0)
            const dx = curr.x - prev.x;
            const dy = curr.y - prev.y;
            const dz = curr.z - prev.z; // Depth is rough but useful
            movementSum += Math.sqrt(dx*dx + dy*dy + dz*dz);
        });
    }

    // Update history
    prevLandmarksRef.current = landmarks;

    // 3. Score Normalization
    // Average movement per keypoint
    const avgMovement = movementSum / keyPoints.length;
    
    // Convert normalized float to a readable score (0-100)
    // Typical "Still" noise is ~0.0005. Active eye movement is > 0.005.
    // We multiply by 10000 to scale it up.
    const rawScore = avgMovement * 10000; 
    const motionScore = Math.min(100, rawScore);

    // 4. Freeze Threshold Logic
    // settings.freezeSensitivity: 0 (Strict/Hard to freeze) to 100 (Sensitive/Easy to freeze)
    const sensitivity = settings.freezeSensitivity ?? 50;
    
    // If sensitivity is High (100), we allow larger movements to still count as "Frozen" (Threshold higher)
    // If sensitivity is Low (0), we need absolute stillness (Threshold lower)
    const FREEZE_THRESHOLD = 2.0 + (sensitivity / 100) * 15.0;

    if (rawScore < FREEZE_THRESHOLD) {
        consecutiveFrozenFramesRef.current += 1;
    } else {
        consecutiveFrozenFramesRef.current = 0;
    }

    // Trigger frozen state if stillness persists for roughly 2 seconds
    // Depending on FPS, 30-60 frames.
    const isFrozen = consecutiveFrozenFramesRef.current > 45;

    const now = Date.now();
    // Report status (throttle to 500ms)
    if (now - lastReportTimeRef.current > 500) {
        onStatusChange({
            isCameraActive: true,
            isFrozen,
            motionScore,
            lastUpdate: now
        });
        lastReportTimeRef.current = now;
    }
  };

  if (permissionDenied) return null;

  return (
    <div className="fixed top-4 right-20 z-50 transition-opacity">
       <div className={`backdrop-blur-md border rounded-full px-3 py-1 flex items-center gap-2 transition-colors ${isActive ? 'bg-slate-900/60 border-slate-700' : 'bg-red-900/40 border-red-700'}`}>
           {isInitializing ? (
               <>
                <div className="w-3 h-3 border-2 border-slate-500 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-[10px] text-slate-400 font-mono">Loading FaceMesh...</span>
               </>
           ) : isActive ? (
               <>
                <div className="relative">
                    <Activity size={14} className="text-blue-400" />
                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
                </div>
                <div className="flex flex-col leading-none">
                    <span className="text-[10px] text-slate-300 font-bold uppercase tracking-wider">AI Monitor</span>
                    <span className="text-[8px] text-slate-500">Active</span>
                </div>
               </>
           ) : (
               <>
                <AlertTriangle size={14} className="text-red-400" />
                <span className="text-[10px] text-red-300 font-mono">Cam Error</span>
               </>
           )}
       </div>
       {/* The video element is utilized by MediaPipe CameraUtils but hidden from view */}
       <video ref={videoRef} className="hidden" playsInline muted />
    </div>
  );
};

export default EyeTracker;