import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Maximize, Minimize, ArrowLeft, Loader2, Settings2, X, Clock, Sliders, Volume2, VolumeX, Gamepad2, Palette, Activity } from 'lucide-react';
import EMDRCanvas from '../components/EMDRCanvas';
import EyeTracker from '../components/EyeTracker';
import LiveVideo from '../components/LiveVideo';
import { useBroadcastSession } from '../hooks/useBroadcastSession';
import { SessionRole, MovementPattern } from '../types';
import { PRESET_COLORS, PRESET_BG_COLORS } from '../constants';

const ClientSession: React.FC = () => {
  const { settings, updateSettings, sendClientStatus } = useBroadcastSession(SessionRole.CLIENT);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [isHoveringTop, setIsHoveringTop] = useState(false);
  const hideTimeoutRef = useRef<number>(0);
  
  // Layout State: 'canvas' (default EMDR focus) vs 'video' (Therapist focus)
  const [viewMode, setViewMode] = useState<'canvas' | 'video'>('canvas');

  // Auto-hide controls on inactivity
  const resetHideTimer = () => {
    // Don't auto-hide if settings menu is open OR if hovering the top zone
    if (showSettingsMenu || isHoveringTop) {
        setShowControls(true);
        window.clearTimeout(hideTimeoutRef.current);
        return;
    }
    
    setShowControls(true);
    window.clearTimeout(hideTimeoutRef.current);
    hideTimeoutRef.current = window.setTimeout(() => setShowControls(false), 3000);
  };

  // Effect to handle global mouse move
  useEffect(() => {
    window.addEventListener('mousemove', resetHideTimer);
    resetHideTimer(); 
    return () => {
        window.removeEventListener('mousemove', resetHideTimer);
        window.clearTimeout(hideTimeoutRef.current);
    };
  }, [showSettingsMenu, isHoveringTop]);

  // Force show controls when hovering top zone
  useEffect(() => {
    if (isHoveringTop) {
        setShowControls(true);
        window.clearTimeout(hideTimeoutRef.current);
    } else {
        // Resume timer when leaving top zone
        resetHideTimer();
    }
  }, [isHoveringTop]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true));
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().then(() => setIsFullscreen(false));
      }
    }
  };

  const handlePatternChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    updateSettings({ pattern: e.target.value as MovementPattern });
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black">
      
      {/* 1. EMDR Canvas Layer */}
      <div className={`transition-all duration-500 ease-in-out absolute ${
         viewMode === 'video'
         ? 'bottom-4 right-4 w-64 h-48 z-20 rounded-xl overflow-hidden border border-slate-700 shadow-2xl'
         : 'inset-0 z-0'
      }`}>
         <EMDRCanvas settings={settings} role={SessionRole.CLIENT} />
      </div>

      {/* 2. Live Video Layer */}
      {settings.liveKitUrl && (
          <div className={`transition-all duration-500 ease-in-out absolute ${
            viewMode === 'canvas'
            ? 'top-4 left-4 w-72 h-48 z-30 shadow-2xl hover:scale-105'
            : 'inset-0 z-10 bg-slate-900'
          }`}>
            <LiveVideo 
                url={settings.liveKitUrl} 
                token={settings.liveKitClientToken} 
                role="CLIENT" 
                isMaximized={viewMode === 'video'}
                onToggleMaximize={() => setViewMode(prev => prev === 'canvas' ? 'video' : 'canvas')}
            />
          </div>
      )}

      {/* Invisible Eye Tracker */}
      <EyeTracker settings={settings} onStatusChange={sendClientStatus} />

      {/* 
          Hover Detection Zone (Top 15% of screen) 
          This ensures controls stay open when user tries to reach them
      */}
      <div 
        className="absolute top-0 left-0 w-full h-32 z-40"
        onMouseEnter={() => setIsHoveringTop(true)}
        onMouseLeave={() => setIsHoveringTop(false)}
      />

      {/* Floating Controls (Top Bar) */}
      <div 
        className={`absolute top-0 left-0 w-full p-6 flex justify-between items-start pointer-events-none transition-opacity duration-300 z-50 ${showControls ? 'opacity-100' : 'opacity-0'}`}
      >
        <div className={`pointer-events-auto transition-all duration-300 ${viewMode === 'canvas' && settings.liveKitUrl ? 'mt-48' : ''}`}>
            <Link to="/" className="flex items-center gap-2 text-slate-400 hover:text-white bg-black/60 hover:bg-black/80 px-4 py-2 rounded-full backdrop-blur-md border border-white/10 transition-all shadow-lg">
                <ArrowLeft size={16} /> End
            </Link>
        </div>

        <div className="flex items-center gap-2 pointer-events-auto">
             {!settings.isPlaying && viewMode === 'canvas' && (
                 <div className="flex items-center gap-2 text-slate-300 bg-black/60 px-4 py-2 rounded-full backdrop-blur-md border border-white/10 shadow-lg">
                     <Loader2 size={16} className="animate-spin" />
                     <span className="text-xs uppercase tracking-widest font-medium">Waiting...</span>
                 </div>
             )}
            
            <button 
                onClick={() => setShowSettingsMenu(true)}
                className="text-slate-300 hover:text-white bg-black/60 hover:bg-black/80 p-2 rounded-full backdrop-blur-md border border-white/10 transition-all shadow-lg"
                title="Settings"
            >
                <Settings2 size={20} />
            </button>

            <button 
                onClick={toggleFullscreen}
                className="text-slate-300 hover:text-white bg-black/60 hover:bg-black/80 p-2 rounded-full backdrop-blur-md border border-white/10 transition-all shadow-lg"
                title="Toggle Fullscreen"
            >
                {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
            </button>
        </div>
      </div>
      
      {/* Settings Side Panel */}
      {showSettingsMenu && (
        <div className="absolute inset-0 z-[60] bg-black/60 backdrop-blur-sm flex justify-end">
            <div className="w-80 h-full bg-slate-900 border-l border-slate-700 p-6 overflow-y-auto animate-in slide-in-from-right duration-300 shadow-2xl">
                <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-800">
                    <h2 className="text-white font-bold text-lg tracking-wide flex items-center gap-2">
                        <Settings2 size={20} className="text-blue-500" /> 
                        Preferences
                    </h2>
                    <button 
                        onClick={() => setShowSettingsMenu(false)}
                        className="text-slate-400 hover:text-white transition-colors"
                    >
                        <X size={24} />
                    </button>
                </div>

                <div className="space-y-8">
                    {/* Timer */}
                    <section className="space-y-3">
                        <div className="flex items-center gap-2 text-blue-400 font-medium text-sm uppercase tracking-wider">
                            <Clock size={14} /> Session Timer
                        </div>
                        <select
                            value={settings.durationSeconds}
                            onChange={(e) => updateSettings({ durationSeconds: Number(e.target.value) })}
                            className="w-full bg-slate-800 border border-slate-700 rounded-md p-2 text-white text-sm outline-none focus:border-blue-500"
                        >
                            <option value={0}>Infinite / Manual Stop</option>
                            <option value={30}>30 Seconds</option>
                            <option value={60}>1 Minute</option>
                            <option value={120}>2 Minutes</option>
                            <option value={300}>5 Minutes</option>
                        </select>
                    </section>

                    {/* Motion */}
                    <section className="space-y-4">
                        <div className="flex items-center gap-2 text-blue-400 font-medium text-sm uppercase tracking-wider">
                            <Sliders size={14} /> Motion
                        </div>
                        
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm text-slate-300">
                                <span>Speed</span>
                                <span>{settings.speed}</span>
                            </div>
                            <input
                                type="range"
                                min="1"
                                max="100"
                                value={settings.speed}
                                onChange={(e) => updateSettings({ speed: parseInt(e.target.value) })}
                                className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                            />
                        </div>

                        <div className="space-y-2">
                            <div className="flex justify-between text-sm text-slate-300">
                                <span>Size</span>
                                <span>{settings.size}px</span>
                            </div>
                            <input
                                type="range"
                                min="10"
                                max="150"
                                value={settings.size}
                                onChange={(e) => updateSettings({ size: parseInt(e.target.value) })}
                                className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                            />
                        </div>

                         <div className="space-y-2">
                            <label className="text-sm text-slate-300 block">Pattern</label>
                            <select 
                                value={settings.pattern}
                                onChange={handlePatternChange}
                                className="w-full bg-slate-800 border border-slate-700 rounded-md p-2 text-white text-sm outline-none focus:border-blue-500"
                            >
                                <option value={MovementPattern.LINEAR}>Linear (Horizontal)</option>
                                <option value={MovementPattern.SINE}>Sine Wave (Bobbing)</option>
                                <option value={MovementPattern.FIGURE_EIGHT}>Figure Eight</option>
                                <option value={MovementPattern.VERTICAL}>Vertical</option>
                                <option value={MovementPattern.ALTERNATED}>Alternated (Jump)</option>
                                <option value={MovementPattern.RANDOM}>Randomized</option>
                            </select>
                        </div>
                    </section>

                    {/* Audio */}
                    <section className="space-y-4">
                        <div className="flex items-center gap-2 text-blue-400 font-medium text-sm uppercase tracking-wider">
                            {settings.soundEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />} Audio
                        </div>
                        <div className="flex items-center justify-between">
                            <label className="text-sm text-slate-300">Enable Sound</label>
                            <button
                                onClick={() => updateSettings({ soundEnabled: !settings.soundEnabled })}
                                className={`w-10 h-5 rounded-full transition-colors relative ${settings.soundEnabled ? 'bg-blue-600' : 'bg-slate-700'}`}
                            >
                                <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform ${settings.soundEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
                            </button>
                        </div>

                        <div className={`space-y-2 transition-opacity ${settings.soundEnabled ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
                            <div className="flex justify-between text-sm text-slate-300">
                                <span>Volume</span>
                                <span>{Math.round(settings.soundVolume * 100)}%</span>
                            </div>
                            <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.05"
                                value={settings.soundVolume}
                                onChange={(e) => updateSettings({ soundVolume: parseFloat(e.target.value) })}
                                className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                            />
                        </div>
                    </section>

                    {/* Haptics */}
                    <section className="space-y-4">
                        <div className="flex items-center gap-2 text-blue-400 font-medium text-sm uppercase tracking-wider">
                            <Gamepad2 size={14} /> Haptics
                        </div>
                        <div className="flex items-center justify-between">
                            <label className="text-sm text-slate-300">Gamepad Vibration</label>
                            <button
                                onClick={() => updateSettings({ clientVibrationEnabled: !settings.clientVibrationEnabled })}
                                className={`w-10 h-5 rounded-full transition-colors relative ${settings.clientVibrationEnabled ? 'bg-blue-600' : 'bg-slate-700'}`}
                            >
                                <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform ${settings.clientVibrationEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
                            </button>
                        </div>
                        <p className="text-[10px] text-slate-500">
                            Requires a supported gamepad connected to this device.
                        </p>
                    </section>

                    {/* Visuals */}
                    <section className="space-y-4">
                        <div className="flex items-center gap-2 text-blue-400 font-medium text-sm uppercase tracking-wider">
                            <Palette size={14} /> Visuals
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm text-slate-300">Ball Color</label>
                            <div className="flex gap-2 flex-wrap">
                                {PRESET_COLORS.map(c => (
                                    <button
                                        key={c}
                                        onClick={() => updateSettings({ color: c })}
                                        className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 ${settings.color === c ? 'border-white scale-110' : 'border-transparent'}`}
                                        style={{ backgroundColor: c }}
                                    />
                                ))}
                                <input 
                                    type="color" 
                                    value={settings.color}
                                    onChange={(e) => updateSettings({ color: e.target.value })}
                                    className="w-6 h-6 rounded-full p-0 overflow-hidden border-0 cursor-pointer"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm text-slate-300">Background</label>
                            <div className="flex gap-2 flex-wrap">
                                {PRESET_BG_COLORS.map(c => (
                                    <button
                                        key={c}
                                        onClick={() => updateSettings({ backgroundColor: c })}
                                        className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 ${settings.backgroundColor === c ? 'border-white scale-110' : 'border-slate-700'}`}
                                        style={{ backgroundColor: c }}
                                    />
                                ))}
                            </div>
                        </div>
                    </section>
                </div>
            </div>
        </div>
      )}
      
      {/* Connection Status Indicator (Subtle) */}
      <div className="absolute bottom-4 right-4 z-40">
         <div className="w-2 h-2 rounded-full bg-green-500 opacity-50 shadow-[0_0_8px_rgba(34,197,94,0.8)]" title="Connected"></div>
      </div>
    </div>
  );
};

export default ClientSession;