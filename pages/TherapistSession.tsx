import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, AlertTriangle, Activity, Sliders, Video, FileText, Sparkles, BookOpen, Hand } from 'lucide-react';
import TherapistControls from '../components/TherapistControls';
import EMDRCanvas from '../components/EMDRCanvas';
import AIAssistant, { AIAssistantHandle } from '../components/AIAssistant';
import LiveVideo from '../components/LiveVideo';
import DraggableWindow from '../components/DraggableWindow';
import ScriptPanel from '../components/ScriptPanel';
import ZenCanvas from '../components/ZenCanvas';
import ZenControls from '../components/ZenControls';
import { useBroadcastSession } from '../hooks/useBroadcastSession';
import { SessionRole } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { useHandTracking } from '../hooks/useHandTracking';

const TherapistSession: React.FC = () => {
  const { t } = useLanguage();
  const { settings, updateSettings, clientStatus, sendZenHands } = useBroadcastSession(SessionRole.THERAPIST);
  
  // Hand Tracking Logic
  const { hands, isInitializing: isHandsInitializing } = useHandTracking(settings.zen.active);
  
  // Broadcast hand positions to client (Zen Mode)
  useEffect(() => {
    if (settings.zen.active && hands.length > 0) {
        sendZenHands(hands);
    }
  }, [settings.zen.active, hands, sendZenHands]);

  // Window State
  const [windows, setWindows] = useState({
      controls: true,
      video: true,
      scripts: false,
      ai: false,
      zenControls: false // New window for Zen
  });

  // Auto-open Zen Controls when active
  useEffect(() => {
    if (settings.zen.active) {
        setWindows(prev => ({ ...prev, zenControls: true }));
    } else {
        setWindows(prev => ({ ...prev, zenControls: false }));
    }
  }, [settings.zen.active]);

  const toggleWindow = (key: keyof typeof windows) => {
      setWindows(prev => ({ ...prev, [key]: !prev[key] }));
  };
  
  const [latestSummary, setLatestSummary] = useState<string>('');
  const [teleprompterText, setTeleprompterText] = useState<string | null>(null);
  const aiAssistantRef = useRef<AIAssistantHandle>(null);

  const handleRequestSummary = (text: string) => {
    if (aiAssistantRef.current) {
        setWindows(prev => ({ ...prev, ai: true }));
        setTimeout(() => aiAssistantRef.current?.triggerPrompt(text, 'summary'), 100);
    }
  };
  
  const handleAIResponse = (text: string, mode: 'chat' | 'summary') => {
      if (mode === 'summary') {
          setLatestSummary(text);
      }
  };

  const handleSessionComplete = () => {
      updateSettings({ isPlaying: false });
  };

  return (
    <div className="h-screen w-screen bg-slate-950 overflow-hidden relative">
      
      {/* 1. Background Layer: Canvas & Frozen Alerts */}
      <div className="absolute inset-0 z-0">
          {settings.zen.active ? (
              <ZenCanvas 
                settings={settings.zen} 
                hands={hands} 
                speed={settings.speed}
              />
          ) : (
              <EMDRCanvas 
                settings={settings} 
                role={SessionRole.THERAPIST} 
                onSessionComplete={handleSessionComplete}
              />
          )}
          
           {/* Frozen Overlay for Canvas */}
           {clientStatus?.isFrozen && (
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute inset-0 border-[12px] border-red-600/30 animate-pulse shadow-[inset_0_0_100px_rgba(220,38,38,0.3)]"></div>
                     <div className="absolute bottom-32 left-1/2 -translate-x-1/2 bg-red-950/90 border border-red-500/60 text-red-100 px-8 py-4 rounded-2xl shadow-2xl flex items-center gap-4 animate-bounce backdrop-blur-md z-50 pointer-events-none">
                        <div className="bg-red-500/20 p-2 rounded-full">
                            <AlertTriangle className="text-red-500" size={28} />
                        </div>
                        <div className="flex flex-col">
                            <span className="font-bold uppercase tracking-wider text-lg">{t('controls.frozen')}</span>
                            <span className="text-sm text-red-300">Motion below threshold. Check client grounding.</span>
                        </div>
                     </div>
                </div>
            )}

             {/* Teleprompter Overlay */}
             {teleprompterText && (
                 <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-2/3 max-w-3xl pointer-events-none z-[5] animate-in fade-in zoom-in duration-300">
                     <div className="bg-black/60 backdrop-blur-sm border border-white/10 rounded-2xl p-8 shadow-2xl text-center">
                         <p className="text-white/90 text-2xl md:text-3xl font-semibold leading-relaxed tracking-wide drop-shadow-lg whitespace-pre-wrap font-sans">
                             {teleprompterText}
                         </p>
                     </div>
                 </div>
             )}
      </div>

      {/* 2. Top Bar (System Status) */}
      <header className="absolute top-0 left-0 w-full p-4 z-10 flex justify-between items-center pointer-events-none">
        <div className="flex items-center gap-2 pointer-events-auto">
            <Link to="/" className="flex items-center gap-2 text-slate-400 hover:text-white bg-slate-900/80 px-3 py-1.5 rounded-full backdrop-blur-md border border-slate-700 transition-colors text-sm font-medium hover:border-slate-500">
                <ArrowLeft size={14} /> {t('common.back')}
            </Link>
        </div>
        
        <div className={`bg-slate-900/80 backdrop-blur-md border px-4 py-1.5 rounded-full flex items-center gap-2 transition-colors duration-300 ${clientStatus?.isFrozen ? 'border-red-500/50 bg-red-900/40' : 'border-slate-700'}`}>
            {clientStatus?.isFrozen ? <AlertTriangle size={14} className="text-red-500 animate-pulse" /> : <Activity size={14} className="text-green-500" />}
            <span className={`text-xs font-mono uppercase tracking-widest ${clientStatus?.isFrozen ? 'text-red-300 font-bold' : 'text-slate-400'}`}>
                {clientStatus?.isFrozen ? t('controls.frozen') : t('controls.tracking')}
            </span>
        </div>
      </header>

      {/* 3. Floating Windows Layer */}
      <div className="absolute inset-0 z-20 pointer-events-none">
          {/* Controls Window */}
          <div className="pointer-events-auto">
            <DraggableWindow 
                title={t('dock.controls')}
                icon={<Sliders size={14} className="text-blue-400" />}
                isOpen={windows.controls} 
                onClose={() => toggleWindow('controls')}
                defaultPosition={{ x: 20, y: 70 }}
                width={360}
                height={600}
            >
                <TherapistControls 
                    settings={settings} 
                    updateSettings={updateSettings} 
                    onRequestSummary={handleRequestSummary}
                    latestSummary={latestSummary}
                    className="h-full"
                />
            </DraggableWindow>
          </div>
          
           {/* Zen Controls Window */}
           <div className="pointer-events-auto">
            <DraggableWindow 
                title="Zen Controls"
                icon={<Hand size={14} className="text-cyan-400" />}
                isOpen={windows.zenControls} 
                onClose={() => toggleWindow('zenControls')}
                defaultPosition={{ x: window.innerWidth - 340, y: 70 }}
                width={300}
                height={550}
            >
                <ZenControls 
                    settings={settings.zen}
                    updateSettings={(s) => updateSettings({ zen: { ...settings.zen, ...s } })}
                    onClose={() => toggleWindow('zenControls')}
                    isHandTrackingActive={hands.length > 0}
                />
            </DraggableWindow>
          </div>

          {/* Video Window */}
          <div className="pointer-events-auto">
            <DraggableWindow 
                title={t('dock.video')}
                icon={<Video size={14} className="text-green-400" />}
                isOpen={windows.video} 
                onClose={() => toggleWindow('video')}
                defaultPosition={{ x: window.innerWidth - 340, y: settings.zen.active ? 640 : 70 }}
                width={320}
                height={240}
            >
                <LiveVideo 
                    role="THERAPIST"
                    className="w-full h-full rounded-none border-0"
                />
            </DraggableWindow>
          </div>

           {/* Scripts Window */}
           <div className="pointer-events-auto">
            <DraggableWindow 
                title={t('dock.scripts')}
                icon={<BookOpen size={14} className="text-purple-400" />}
                isOpen={windows.scripts} 
                onClose={() => toggleWindow('scripts')}
                defaultPosition={{ x: window.innerWidth / 2 - 200, y: window.innerHeight - 400 }}
                width={500}
                height={350}
            >
                <ScriptPanel 
                    onUpdateTeleprompter={setTeleprompterText} 
                    onRequestSummary={handleRequestSummary} 
                />
            </DraggableWindow>
          </div>

          {/* AI Window */}
          <div className="pointer-events-auto">
            <DraggableWindow 
                title={t('dock.ai')}
                icon={<Sparkles size={14} className="text-amber-400" />}
                isOpen={windows.ai} 
                onClose={() => toggleWindow('ai')}
                defaultPosition={{ x: window.innerWidth - 420, y: window.innerHeight - 550 }}
                width={400}
                height={500}
            >
                <AIAssistant 
                    ref={aiAssistantRef} 
                    onResponseGenerated={handleAIResponse} 
                    className="h-full"
                />
            </DraggableWindow>
          </div>
      </div>

      {/* 4. Dock / Taskbar */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-end gap-3 pointer-events-auto">
          <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 p-2 rounded-2xl flex items-center gap-2 shadow-2xl ring-1 ring-white/10">
              <DockItem 
                active={windows.controls} 
                onClick={() => toggleWindow('controls')} 
                icon={<Sliders size={20} />} 
                label={t('dock.controls')}
                color="blue"
              />
              <div className="w-px h-8 bg-slate-700/50 mx-1"></div>
              <DockItem 
                active={windows.video} 
                onClick={() => toggleWindow('video')} 
                icon={<Video size={20} />} 
                label={t('dock.video')}
                color="green"
              />
              <DockItem 
                active={windows.scripts} 
                onClick={() => toggleWindow('scripts')} 
                icon={<BookOpen size={20} />} 
                label={t('dock.scripts')}
                color="purple"
              />
              <DockItem 
                active={windows.ai} 
                onClick={() => toggleWindow('ai')} 
                icon={<Sparkles size={20} />} 
                label={t('dock.ai')}
                color="amber"
              />
               {settings.zen.active && (
                  <DockItem 
                    active={windows.zenControls} 
                    onClick={() => toggleWindow('zenControls')} 
                    icon={<Hand size={20} />} 
                    label="Zen"
                    color="cyan"
                  />
               )}
          </div>
      </div>
    </div>
  );
};

// Helper Component for Dock Icons
const DockItem: React.FC<{ active: boolean; onClick: () => void; icon: React.ReactNode; label: string; color: string }> = ({ active, onClick, icon, label, color }) => {
    const colorClasses = {
        blue: 'text-blue-400 bg-blue-500/20 border-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.3)]',
        green: 'text-green-400 bg-green-500/20 border-green-500/50 shadow-[0_0_15px_rgba(34,197,94,0.3)]',
        purple: 'text-purple-400 bg-purple-500/20 border-purple-500/50 shadow-[0_0_15px_rgba(168,85,247,0.3)]',
        amber: 'text-amber-400 bg-amber-500/20 border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.3)]',
        cyan: 'text-cyan-400 bg-cyan-500/20 border-cyan-500/50 shadow-[0_0_15px_rgba(34,211,238,0.3)]',
    }[color] || 'text-slate-400';

    return (
        <button 
            onClick={onClick}
            className={`group relative flex flex-col items-center gap-1 p-3 rounded-xl transition-all duration-300 hover:-translate-y-2 ${
                active 
                ? `${colorClasses} border` 
                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-transparent'
            }`}
        >
            {icon}
            {/* Tooltip */}
            <span className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none border border-slate-700">
                {label}
            </span>
            {/* Active Indicator Dot */}
            {active && <span className={`absolute -bottom-1 w-1 h-1 rounded-full bg-current opacity-80`} />}
        </button>
    );
};

export default TherapistSession;