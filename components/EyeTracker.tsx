
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

        faceMesh.onResults((results: any) => {
            if (!isMounted) return;
            onResults(results);
        });
        
        faceMeshRef.current = faceMesh;

        if (videoRef.current) {
            // CameraUtils handles the loop: getUserMedia -> requestAnimationFrame -> faceMesh.send()
            const camera = new window.Camera(videoRef.current, {
                onFrame: async () => {
                    if (faceMeshRef.current && videoRef.current && isMounted) {
                        try {
                            await faceMeshRef.current.send({ image: videoRef.current });
                        } catch (e) {
                            // ignore shutdown errors
                        }
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
      if (cameraRef.current) {
          cameraRef.current.stop();
          cameraRef.current = null;
      }
      
      const faceMeshInstance = faceMeshRef.current;
      faceMeshRef.current = null; // Prevent use in onFrame
      
      if (faceMeshInstance) {
          faceMeshInstance.close();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const calculateDistance = (p1: any, p2: any) => {
      return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
  };

  const detectEmotion = (landmarks: any[]) => {
      // Reference Width (Outer Eye corners: 33 Left, 263 Right)
      const refWidth = calculateDistance(landmarks[33], landmarks[263]);
      
      // 1. Mouth Analysis (Smile vs Frown)
      // Upper Lip Bottom (13) vs Average of Mouth Corners (61, 291)
      const mouthCornersY = (landmarks[61].y + landmarks[291].y) / 2;
      const upperLipY = landmarks[13].y;
      
      const mouthIndicator = (upperLipY - mouthCornersY) / refWidth;

      // 2. Eye Openness (Fear/Surprise vs Calm)
      const leftEyeOpen = calculateDistance(landmarks[159], landmarks[145]);
      const rightEyeOpen = calculateDistance(landmarks[386], landmarks[374]);
      const avgEyeOpen = (leftEyeOpen + rightEyeOpen) / 2;
      const eyeOpennessIndicator = avgEyeOpen / refWidth;

      let primary: any = 'CALM';
      let confidence = 0;

      if (mouthIndicator > 0.05) {
          primary = 'JOY';
          confidence = Math.min(100, 50 + (mouthIndicator * 500));
      } else if (mouthIndicator < -0.04) {
          primary = 'SADNESS';
          confidence = Math.min(100, 50 + (Math.abs(mouthIndicator) * 500));
      } else if (eyeOpennessIndicator > 0.28) {
          primary = 'FEAR';
          confidence = Math.min(100, 50 + ((eyeOpennessIndicator - 0.28) * 500));
      } else {
          primary = 'CALM';
          confidence = 90;
      }

      return { primary, confidence };
  };

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
    
    // 2. Emotion Detection
    const emotion = detectEmotion(landmarks);

    // 3. Stability Calculation (Freeze Detection)
    const keyPoints = [1, 468, 473, 33, 263];
    let movementSum = 0;

    if (prevLandmarksRef.current) {
        keyPoints.forEach(index => {
            const curr = landmarks[index];
            const prev = prevLandmarksRef.current![index];
            
            const dx = curr.x - prev.x;
            const dy = curr.y - prev.y;
            const dz = curr.z - prev.z;
            movementSum += Math.sqrt(dx*dx + dy*dy + dz*dz);
        });
    }

    prevLandmarksRef.current = landmarks;

    const avgMovement = movementSum / keyPoints.length;
    const rawScore = avgMovement * 10000; 
    const motionScore = Math.min(100, rawScore);

    const sensitivity = settings.freezeSensitivity ?? 50;
    const FREEZE_THRESHOLD = 2.0 + (sensitivity / 100) * 15.0;

    if (rawScore < FREEZE_THRESHOLD) {
        consecutiveFrozenFramesRef.current += 1;
    } else {
        consecutiveFrozenFramesRef.current = 0;
    }

    const isFrozen = consecutiveFrozenFramesRef.current > 45;

    const now = Date.now();
    if (now - lastReportTimeRef.current > 500) {
        onStatusChange({
            isCameraActive: true,
            isFrozen,
            motionScore,
            emotion,
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
