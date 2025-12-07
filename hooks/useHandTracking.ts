
import { useState, useEffect, useRef } from 'react';
import { HandPoint } from '../types';

declare global {
  interface Window {
    Hands: any;
  }
}

export const useHandTracking = (isActive: boolean) => {
  const [hands, setHands] = useState<HandPoint[]>([]);
  const [isInitializing, setIsInitializing] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const handsRef = useRef<any>(null);
  const cameraRef = useRef<any>(null);

  useEffect(() => {
    // If not active, we don't start anything. 
    // Cleanup of previous active session happens in return function.
    if (!isActive) return;

    let isMounted = true;

    const initHands = async () => {
        if (!window.Hands || !window.Camera) {
            console.error("MediaPipe Hands not found");
            return;
        }

        setIsInitializing(true);

        const handsMesh = new window.Hands({
            locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
        });

        handsMesh.setOptions({
            maxNumHands: 2,
            modelComplexity: 1,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5
        });

        handsMesh.onResults((results: any) => {
            if (isMounted) {
                if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
                    const points: HandPoint[] = results.multiHandLandmarks.map((landmarks: any) => {
                        // Use Index Finger Tip (Landmark 8) as the interaction point
                        return { x: landmarks[8].x, y: landmarks[8].y }; 
                    });
                    setHands(points);
                } else {
                    setHands([]);
                }
            }
        });

        handsRef.current = handsMesh;

        // Create a hidden video element if one doesn't exist passed in
        if (!videoRef.current) {
            const vid = document.createElement('video');
            vid.style.display = 'none';
            document.body.appendChild(vid);
            videoRef.current = vid;
        }

        const camera = new window.Camera(videoRef.current, {
            onFrame: async () => {
                // Check if mounted and ref exists before sending
                if (handsRef.current && videoRef.current && isMounted) {
                    try {
                        await handsRef.current.send({ image: videoRef.current });
                    } catch (e) {
                        // Ignore errors during shutdown
                    }
                }
            },
            width: 320,
            height: 240
        });
        
        cameraRef.current = camera;
        await camera.start();
        
        if (isMounted) {
            setIsInitializing(false);
        }
    };

    initHands();

    return () => {
        isMounted = false;
        
        if (cameraRef.current) {
            cameraRef.current.stop();
            cameraRef.current = null;
        }
        
        // Nullify ref before closing to prevent race conditions in onFrame
        const handsInstance = handsRef.current;
        handsRef.current = null;
        
        if (handsInstance) {
            handsInstance.close();
        }
        
        if (videoRef.current && videoRef.current.parentNode) {
            videoRef.current.parentNode.removeChild(videoRef.current);
            videoRef.current = null;
        }
    };
  }, [isActive]);

  return { hands, isInitializing };
};
