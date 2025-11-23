import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, AlertTriangle } from 'lucide-react';
import TherapistControls from '../components/TherapistControls';
import EMDRCanvas from '../components/EMDRCanvas';
import AIAssistant from '../components/AIAssistant';
import LiveVideo from '../components/LiveVideo';
import { useBroadcastSession } from '../hooks/useBroadcastSession';
import { SessionRole } from '../types';

const TherapistSession: React.FC = () => {
  const { settings, updateSettings, clientStatus } = useBroadcastSession(SessionRole.THERAPIST);

  return (
    <div className="flex h-screen w-screen bg-slate-950 overflow-hidden">
      {/* Controls Sidebar */}
      <div className="z-20 shadow-2xl">
        <TherapistControls settings={settings} updateSettings={updateSettings} />
      </div>

      {/* Main Preview Area */}
      <div className="flex-1 relative flex flex-col">
        <header className="absolute top-0 left-0 w-full p-4 z-10 flex justify-between items-center pointer-events-none">
            <Link to="/" className="pointer-events-auto flex items-center gap-2 text-slate-400 hover:text-white bg-slate-900/50 px-3 py-1 rounded-full backdrop-blur-sm border border-slate-800 transition-colors">
                <ArrowLeft size={14} /> Exit Session
            </Link>
            <div className={`bg-slate-900/50 backdrop-blur-sm border px-4 py-1 rounded-full flex items-center gap-2 transition-colors duration-300 ${clientStatus?.isFrozen ? 'border-red-500/50 bg-red-900/20' : 'border-slate-800'}`}>
                {clientStatus?.isFrozen && <AlertTriangle size={14} className="text-red-500 animate-pulse" />}
                <span className={`text-xs font-mono uppercase tracking-widest ${clientStatus?.isFrozen ? 'text-red-300 font-bold' : 'text-slate-400'}`}>
                    {clientStatus?.isFrozen ? 'CLIENT MONITOR ALERT' : 'Live Preview'}
                </span>
            </div>
        </header>
        
        {/* Canvas Preview */}
        <div className="relative w-full h-full">
             <EMDRCanvas settings={settings} role={SessionRole.THERAPIST} />

             {/* LiveKit Video Overlay */}
             <LiveVideo 
                url={settings.liveKitUrl} 
                token={settings.liveKitTherapistToken} 
                role="THERAPIST" 
                className="absolute top-20 right-5 w-64"
             />

             {/* Frozen Status Prominent Overlay */}
             {clientStatus?.isFrozen && (
                 <div className="absolute inset-0 pointer-events-none z-10">
                    {/* Pulsating Border */}
                    <div className="absolute inset-0 border-[12px] border-red-600/30 animate-pulse shadow-[inset_0_0_100px_rgba(220,38,38,0.3)]"></div>
                    
                    {/* Floating Alert Badge */}
                    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-red-950/90 border border-red-500/60 text-red-100 px-8 py-4 rounded-2xl shadow-2xl flex items-center gap-4 animate-bounce backdrop-blur-md">
                        <div className="bg-red-500/20 p-2 rounded-full">
                            <AlertTriangle className="text-red-500" size={28} />
                        </div>
                        <div className="flex flex-col">
                            <span className="font-bold uppercase tracking-wider text-lg">Client Frozen Detected</span>
                            <span className="text-sm text-red-300">Motion below threshold. Check client grounding.</span>
                        </div>
                    </div>
                 </div>
             )}
        </div>
      </div>

      {/* AI Assistant Overlay */}
      <AIAssistant />
    </div>
  );
};

export default TherapistSession;