
import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, AlertTriangle, Maximize2, Minimize2, Video, Activity } from 'lucide-react';
import TherapistControls from '../components/TherapistControls';
import EMDRCanvas from '../components/EMDRCanvas';
import AIAssistant, { AIAssistantHandle } from '../components/AIAssistant';
import LiveVideo from '../components/LiveVideo';
import { useBroadcastSession } from '../hooks/useBroadcastSession';
import { SessionRole } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

const TherapistSession: React.FC = () => {
  const { t } = useLanguage();
  const { settings, updateSettings, clientStatus } = useBroadcastSession(SessionRole.THERAPIST);
  
  // View Mode: 'canvas' (Default, EMDR Focus) vs 'video' (Client Focus)
  const [viewMode, setViewMode] = useState<'canvas' | 'video'>('canvas');
  
  // Store the latest AI summary for the report
  const [latestSummary, setLatestSummary] = useState<string>('');
  
  // Teleprompter State
  const [teleprompterText, setTeleprompterText] = useState<string | null>(null);

  // Ref to control AI Assistant from other components
  const aiAssistantRef = useRef<AIAssistantHandle>(null);

  const toggleViewMode = () => {
    setViewMode(prev => prev === 'canvas' ? 'video' : 'canvas');
  };

  const handleRequestSummary = (text: string) => {
    if (aiAssistantRef.current) {
        aiAssistantRef.current.triggerPrompt(text, 'summary');
    }
  };
  
  const handleAIResponse = (text: string, mode: 'chat' | 'summary') => {
      if (mode === 'summary') {
          setLatestSummary(text);
      }
  };

  const handleSessionComplete = () => {
      // Called when passes or time runs out
      updateSettings({ isPlaying: false });
  };

  return (
    <div className="flex h-screen w-screen bg-slate-950 overflow-hidden">
      {/* Controls Sidebar */}
      <div className="z-30 shadow-2xl">
        <TherapistControls 
            settings={settings} 
            updateSettings={updateSettings} 
            onRequestSummary={handleRequestSummary}
            latestSummary={latestSummary}
            onUpdateTeleprompter={setTeleprompterText}
        />
      </div>

      {/* Main Preview Area */}
      <div className="flex-1 relative flex flex-col bg-black">
        <header className="absolute top-0 left-0 w-full p-4 z-20 flex justify-between items-center pointer-events-none">
            <div className="flex items-center gap-2 pointer-events-auto">
                <Link to="/" className="flex items-center gap-2 text-slate-400 hover:text-white bg-slate-900/50 px-3 py-1 rounded-full backdrop-blur-sm border border-slate-800 transition-colors">
                    <ArrowLeft size={14} /> {t('common.back')}
                </Link>
            </div>

            <div className="flex items-center gap-2 pointer-events-auto">
                {/* View Toggle Button */}
                <button 
                    onClick={toggleViewMode}
                    className="flex items-center gap-2 text-slate-300 hover:text-white bg-slate-900/50 px-3 py-1 rounded-full backdrop-blur-sm border border-slate-800 transition-colors"
                    title={viewMode === 'canvas' ? "Maximize Client Video" : "Show EMDR Canvas"}
                >
                    {viewMode === 'canvas' ? <Video size={14} /> : <Activity size={14} />}
                    <span className="text-xs font-medium uppercase tracking-wider">
                        {viewMode === 'canvas' ? 'Max Video' : 'Show Canvas'}
                    </span>
                </button>

                <div className={`bg-slate-900/50 backdrop-blur-sm border px-4 py-1 rounded-full flex items-center gap-2 transition-colors duration-300 ${clientStatus?.isFrozen ? 'border-red-500/50 bg-red-900/20' : 'border-slate-800'}`}>
                    {clientStatus?.isFrozen && <AlertTriangle size={14} className="text-red-500 animate-pulse" />}
                    <span className={`text-xs font-mono uppercase tracking-widest ${clientStatus?.isFrozen ? 'text-red-300 font-bold' : 'text-slate-400'}`}>
                        {clientStatus?.isFrozen ? t('controls.frozen') : t('controls.tracking')}
                    </span>
                </div>
            </div>
        </header>
        
        <div className="relative w-full h-full overflow-hidden">
             
             {/* 1. EMDR Canvas Container */}
             {/* If viewMode is video, this becomes the PiP window */}
             <div 
                className={`transition-all duration-500 ease-in-out absolute ${
                    viewMode === 'video' 
                    ? 'bottom-4 right-4 w-64 h-48 z-20 rounded-xl overflow-hidden shadow-2xl border border-slate-700 cursor-pointer hover:scale-105 hover:border-blue-500' 
                    : 'inset-0 z-0'
                }`}
                onClick={() => viewMode === 'video' && setViewMode('canvas')}
                title={viewMode === 'video' ? "Click to Maximize Canvas" : undefined}
             >
                <EMDRCanvas 
                    settings={settings} 
                    role={SessionRole.THERAPIST} 
                    onSessionComplete={handleSessionComplete}
                />
                
                {/* Frozen Overlay for Canvas */}
                {clientStatus?.isFrozen && viewMode === 'canvas' && (
                    <div className="absolute inset-0 pointer-events-none">
                        <div className="absolute inset-0 border-[12px] border-red-600/30 animate-pulse shadow-[inset_0_0_100px_rgba(220,38,38,0.3)]"></div>
                    </div>
                )}
             </div>

             {/* 2. LiveKit Video Container */}
             {/* If viewMode is canvas (default), this is the PiP/Side window. If viewMode is video, this fills the screen. */}
             <div className={`transition-all duration-500 ease-in-out absolute ${
                viewMode === 'canvas'
                ? 'top-20 right-5 w-72 h-48 z-20' // PiP Mode
                : 'inset-0 z-10 bg-slate-900'     // Fullscreen Mode
             }`}>
                 <LiveVideo 
                    role="THERAPIST"
                    isMaximized={viewMode === 'video'}
                    onToggleMaximize={toggleViewMode}
                    className="w-full h-full"
                 />
             </div>

             {/* 3. Big Frozen Alert (Only shows when client is frozen, regardless of view mode) */}
             {clientStatus?.isFrozen && (
                 <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-red-950/90 border border-red-500/60 text-red-100 px-8 py-4 rounded-2xl shadow-2xl flex items-center gap-4 animate-bounce backdrop-blur-md z-50 pointer-events-none">
                    <div className="bg-red-500/20 p-2 rounded-full">
                        <AlertTriangle className="text-red-500" size={28} />
                    </div>
                    <div className="flex flex-col">
                        <span className="font-bold uppercase tracking-wider text-lg">{t('controls.frozen')}</span>
                        <span className="text-sm text-red-300">Motion below threshold. Check client grounding.</span>
                    </div>
                 </div>
             )}
             
             {/* 4. Teleprompter Overlay */}
             {teleprompterText && (
                 <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-2/3 max-w-3xl pointer-events-none z-[60] animate-in fade-in zoom-in duration-300">
                     <div className="bg-black/60 backdrop-blur-sm border border-white/10 rounded-2xl p-8 shadow-2xl text-center">
                         <p className="text-white/90 text-2xl md:text-3xl font-semibold leading-relaxed tracking-wide drop-shadow-lg whitespace-pre-wrap font-sans">
                             {teleprompterText}
                         </p>
                     </div>
                 </div>
             )}
        </div>
      </div>

      {/* AI Assistant Overlay */}
      <AIAssistant ref={aiAssistantRef} onResponseGenerated={handleAIResponse} />
    </div>
  );
};

export default TherapistSession;
