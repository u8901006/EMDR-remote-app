import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Maximize, Minimize, ArrowLeft, Loader2 } from 'lucide-react';
import EMDRCanvas from '../components/EMDRCanvas';
import EyeTracker from '../components/EyeTracker';
import LiveVideo from '../components/LiveVideo';
import { useBroadcastSession } from '../hooks/useBroadcastSession';
import { SessionRole } from '../types';

const ClientSession: React.FC = () => {
  const { settings, sendClientStatus } = useBroadcastSession(SessionRole.CLIENT);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const hideTimeoutRef = useRef<number>(0);

  // Auto-hide controls on inactivity
  const resetHideTimer = () => {
    setShowControls(true);
    window.clearTimeout(hideTimeoutRef.current);
    hideTimeoutRef.current = window.setTimeout(() => setShowControls(false), 3000);
  };

  useEffect(() => {
    window.addEventListener('mousemove', resetHideTimer);
    resetHideTimer(); // Start timer on mount
    return () => {
        window.removeEventListener('mousemove', resetHideTimer);
        window.clearTimeout(hideTimeoutRef.current);
    };
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true));
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().then(() => setIsFullscreen(false));
      }
    }
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black">
      <EMDRCanvas settings={settings} role={SessionRole.CLIENT} />
      
      {/* Eye Tracker (Invisible logic + status indicator) */}
      <EyeTracker settings={settings} onStatusChange={sendClientStatus} />

      {/* LiveKit Video - Now visible for Client to see Therapist */}
      <LiveVideo 
         url={settings.liveKitUrl} 
         token={settings.liveKitClientToken} 
         role="CLIENT"
         className="absolute bottom-6 left-6 w-64"
      />

      {/* Floating Controls / Status */}
      <div 
        className={`absolute top-0 left-0 w-full p-6 flex justify-between items-start transition-opacity duration-500 ${showControls ? 'opacity-100' : 'opacity-0'}`}
      >
        <Link to="/" className="flex items-center gap-2 text-slate-400 hover:text-white bg-black/30 hover:bg-black/50 px-4 py-2 rounded-full backdrop-blur-sm border border-white/10 transition-all">
            <ArrowLeft size={16} /> End
        </Link>

        <div className="flex items-center gap-2">
             {!settings.isPlaying && (
                 <div className="flex items-center gap-2 text-slate-300 bg-black/30 px-4 py-2 rounded-full backdrop-blur-sm border border-white/10">
                     <Loader2 size={16} className="animate-spin" />
                     <span className="text-xs uppercase tracking-widest font-medium">Waiting for Therapist...</span>
                 </div>
             )}
            <button 
                onClick={toggleFullscreen}
                className="text-slate-300 hover:text-white bg-black/30 hover:bg-black/50 p-2 rounded-full backdrop-blur-sm border border-white/10 transition-all"
                title="Toggle Fullscreen"
            >
                {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
            </button>
        </div>
      </div>
      
      {/* Connection Status Indicator (Subtle) */}
      <div className="absolute bottom-4 right-4">
         <div className="w-2 h-2 rounded-full bg-green-500 opacity-50 shadow-[0_0_8px_rgba(34,197,94,0.8)]" title="Connected"></div>
      </div>
    </div>
  );
};

export default ClientSession;