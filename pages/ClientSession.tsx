import React, { useState, useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Maximize, Minimize, ArrowLeft, Loader2, Settings2, X, Clock, Sliders, Volume2, VolumeX, Gamepad2, Palette, Link as LinkIcon, AlertCircle, Globe, Video, Activity, ChevronDown, ChevronRight, CheckCircle2, Music, Upload, Bookmark } from 'lucide-react';
import EMDRCanvas from '../components/EMDRCanvas';
import EyeTracker from '../components/EyeTracker';
import LiveVideo from '../components/LiveVideo';
import ZenCanvas from '../components/ZenCanvas';
import { useBroadcastSession } from '../hooks/useBroadcastSession';
import { SessionRole, MovementPattern, VisualTheme, AudioMode } from '../types';
import { useLiveKitContext } from '../contexts/LiveKitContext';
import { useLanguage } from '../contexts/LanguageContext';

const ClientSession: React.FC = () => {
  const { t, language, setLanguage } = useLanguage();
  const { settings, updateSettings, sendClientStatus, pendingMetricRequest, submitMetric, setPendingMetricRequest, zenHands } = useBroadcastSession(SessionRole.CLIENT);
  const { room, connect, isConnecting, error } = useLiveKitContext();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [isHoveringTop, setIsHoveringTop] = useState(false);
  const hideTimeoutRef = useRef<number>(0);
  
  const [tokenInput, setTokenInput] = useState(settings.liveKitClientToken || '');
  const [urlInput, setUrlInput] = useState(settings.liveKitUrl || '');
  const [isAutoConnecting, setIsAutoConnecting] = useState(false);
  const autoConnectAttempted = useRef(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  const [viewMode, setViewMode] = useState<'canvas' | 'video'>('canvas');
  
  // Metric Input State
  const [metricValue, setMetricValue] = useState(0);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset metric value when request opens
  useEffect(() => {
      if (pendingMetricRequest === 'SUD') setMetricValue(5);
      if (pendingMetricRequest === 'VOC') setMetricValue(4);
  }, [pendingMetricRequest]);

  // Logic to fetch token if room is in URL
  const fetchTokenAndConnect = async (roomName: string) => {
    try {
        const res = await fetch('/api/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                roomName,
                participantName: `Client-${Math.floor(Math.random() * 1000)}`,
                role: 'CLIENT'
            })
        });
        const data = await res.json();
        if (data.token && data.url) {
            updateSettings({ liveKitUrl: data.url });
            await connect(data.url, data.token);
        } else {
            console.error("Failed to fetch token", data);
        }
    } catch (e) {
        console.error("Error fetching token", e);
    }
  };

  // Load URL parameters and auto-connect
  useEffect(() => {
    const urlParam = searchParams.get('url');
    const tokenParam = searchParams.get('token');
    const roomParam = searchParams.get('room');

    if (!room && !isConnecting && !autoConnectAttempted.current) {
        autoConnectAttempted.current = true;
        setIsAutoConnecting(true);

        // Case 1: Legacy Token/URL params
        if (urlParam && tokenParam) {
            setUrlInput(urlParam);
            setTokenInput(tokenParam);
            
            const newParams = new URLSearchParams(searchParams);
            newParams.delete('url');
            newParams.delete('token');
            setSearchParams(newParams, { replace: true });

            connect(urlParam, tokenParam).catch((err) => {
                 console.error("Auto-connect failed:", err);
            }).finally(() => {
                setIsAutoConnecting(false);
            });
        } 
        // Case 2: Room Name (Fetch Token from Backend)
        else if (roomParam) {
             fetchTokenAndConnect(roomParam).finally(() => {
                 setIsAutoConnecting(false);
             });
        }
        else {
            setIsAutoConnecting(false);
        }
    }
  }, [searchParams, room, isConnecting, connect, setSearchParams]);

  useEffect(() => {
    if (settings.liveKitUrl && !urlInput) setUrlInput(settings.liveKitUrl);
    if (settings.liveKitClientToken && !tokenInput) setTokenInput(settings.liveKitClientToken);
  }, [settings.liveKitUrl, settings.liveKitClientToken]);

  const resetHideTimer = () => {
    if (showSettingsMenu || isHoveringTop || !room) {
        setShowControls(true);
        window.clearTimeout(hideTimeoutRef.current);
        return;
    }
    setShowControls(true);
    window.clearTimeout(hideTimeoutRef.current);
    hideTimeoutRef.current = window.setTimeout(() => setShowControls(false), 3000);
  };

  useEffect(() => {
    window.addEventListener('mousemove', resetHideTimer);
    resetHideTimer(); 
    return () => {
        window.removeEventListener('mousemove', resetHideTimer);
        window.clearTimeout(hideTimeoutRef.current);
    };
  }, [showSettingsMenu, isHoveringTop, room]);

  useEffect(() => {
    if (isHoveringTop) {
        setShowControls(true);
        window.clearTimeout(hideTimeoutRef.current);
    } else {
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
  
  const handleThemeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      updateSettings({ theme: e.target.value as VisualTheme });
  };

  const handleAudioModeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      updateSettings({ audioMode: e.target.value as AudioMode });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onloadend = () => {
              const base64String = reader.result as string;
              updateSettings({ customImageUrl: base64String });
          };
          reader.readAsDataURL(file);
      }
  };

  const handleSessionComplete = () => {
      if (!room) {
          updateSettings({ isPlaying: false });
      }
  };

  const handleMetricSubmit = () => {
      submitMetric(metricValue);
  };

  if (!room) {
      return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
             <div className="max-w-md w-full bg-slate-900 border border-slate-700 rounded-xl p-6 shadow-2xl transition-all duration-300">
                 <div className="flex flex-col items-center mb-6">
                    <div className="w-12 h-12 bg-blue-900/50 rounded-full flex items-center justify-center mb-4 shadow-[0_0_15px_rgba(59,130,246,0.3)]">
                        <LinkIcon className="text-blue-400" size={24} />
                    </div>
                    <h2 className="text-xl font-bold text-white">{t('client.join')}</h2>
                    <p className="text-slate-400 text-sm text-center mt-1">{t('client.join.desc')}</p>
                 </div>

                 <div className="space-y-4">
                    {isAutoConnecting ? (
                        <div className="flex flex-col items-center justify-center py-8 space-y-4 animate-in fade-in zoom-in duration-300">
                            <div className="relative">
                                <div className="w-16 h-16 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <Video size={20} className="text-blue-400 opacity-50" />
                                </div>
                            </div>
                            <div className="text-center space-y-1">
                                <p className="text-blue-300 font-medium animate-pulse">{t('client.autoConnecting')}</p>
                                <p className="text-xs text-slate-500">Securing connection...</p>
                            </div>
                        </div>
                    ) : (
                        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <div>
                                <label className="text-xs text-slate-500 uppercase font-bold tracking-wider">{t('client.tokenLabel')}</label>
                                <input 
                                    type="password" 
                                    value={tokenInput}
                                    onChange={(e) => setTokenInput(e.target.value)}
                                    placeholder="Token..."
                                    className="w-full bg-slate-950 border border-slate-700 rounded p-3 text-sm text-white focus:border-blue-500 outline-none mt-1 transition-colors"
                                    autoFocus
                                />
                            </div>

                            <div className="pt-2">
                                <button 
                                    onClick={() => setShowAdvanced(!showAdvanced)}
                                    className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 transition-colors"
                                >
                                    {showAdvanced ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                                    {t('client.advanced')}
                                </button>
                                
                                {showAdvanced && (
                                    <div className="mt-2 pl-3 border-l-2 border-slate-800 animate-in fade-in slide-in-from-top-1">
                                        <label className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">{t('controls.serverUrl')}</label>
                                        <input 
                                            type="text" 
                                            value={urlInput}
                                            onChange={(e) => setUrlInput(e.target.value)}
                                            placeholder="wss://..."
                                            className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-xs text-slate-300 focus:border-blue-500 outline-none mt-1 transition-colors"
                                        />
                                    </div>
                                )}
                            </div>

                            {error && (
                                <div className="mt-4 p-3 bg-red-900/20 border border-red-500/30 rounded text-red-300 text-xs flex items-center gap-2 animate-in slide-in-from-top-1">
                                    <AlertCircle size={14} className="shrink-0" /> {error}
                                </div>
                            )}

                            <div className="mt-8 flex flex-col gap-3">
                                <button 
                                    onClick={() => connect(urlInput, tokenInput)}
                                    disabled={isConnecting || !urlInput || !tokenInput}
                                    className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg flex items-center justify-center gap-2 transition-all hover:scale-[1.02] disabled:opacity-50 disabled:scale-100 disabled:cursor-not-allowed shadow-lg shadow-blue-900/20"
                                >
                                    {isConnecting ? <Loader2 size={18} className="animate-spin" /> : t('client.join')}
                                </button>
                                
                                <Link 
                                    to="/" 
                                    className="w-full py-3 bg-transparent border border-slate-700 hover:bg-slate-800 text-slate-400 hover:text-white font-medium rounded-lg flex items-center justify-center transition-colors"
                                >
                                    {t('ai.cancel')}
                                </Link>
                            </div>
                        </div>
                    )}
                 </div>
                 
                 <div className="mt-6 pt-4 border-t border-slate-800">
                    <button 
                        onClick={() => setLanguage(language === 'en' ? 'zh-TW' : 'en')}
                        className="w-full flex items-center justify-center gap-2 text-slate-500 hover:text-white transition-colors text-xs group"
                    >
                        <Globe size={12} className="group-hover:rotate-12 transition-transform" />
                        {language === 'en' ? 'Switch to 繁體中文' : 'Switch to English'}
                    </button>
                 </div>
             </div>
        </div>
      );
  }

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black">
        {/* Metric Input Modal */}
        {pendingMetricRequest && (
            <div className="absolute inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300">
                <div className="bg-slate-900 border border-slate-700 rounded-2xl p-8 max-w-lg w-full shadow-2xl space-y-8">
                    <div className="text-center space-y-2">
                        <h3 className="text-2xl font-bold text-white">
                            {pendingMetricRequest === 'SUD' ? t('client.metric.sudsTitle') : t('client.metric.vocTitle')}
                        </h3>
                        <p className="text-slate-400">
                            {pendingMetricRequest === 'SUD' ? t('client.metric.sudsDesc') : t('client.metric.vocDesc')}
                        </p>
                    </div>
                    
                    <div className="space-y-6">
                        <div className="flex justify-center items-end gap-2">
                            <span className="text-6xl font-bold text-blue-500 tabular-nums">{metricValue}</span>
                            <span className="text-xl text-slate-500 mb-2">/ {pendingMetricRequest === 'SUD' ? 10 : 7}</span>
                        </div>
                        
                        <input 
                            type="range"
                            min={pendingMetricRequest === 'SUD' ? 0 : 1}
                            max={pendingMetricRequest === 'SUD' ? 10 : 7}
                            step={1}
                            value={metricValue}
                            onChange={(e) => setMetricValue(parseInt(e.target.value))}
                            className="w-full h-4 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-600 hover:accent-blue-500"
                        />
                        
                        <div className="flex justify-between text-xs text-slate-500 uppercase font-bold tracking-wider">
                            <span>{pendingMetricRequest === 'SUD' ? 'Neutral (0)' : 'False (1)'}</span>
                            <span>{pendingMetricRequest === 'SUD' ? 'Disturbing (10)' : 'True (7)'}</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-4">
                            <button 
                                onClick={() => setPendingMetricRequest(null)}
                                className="py-3 px-6 rounded-xl border border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors font-medium"
                            >
                                {t('common.cancel')}
                            </button>
                            <button 
                                onClick={handleMetricSubmit}
                                className="py-3 px-6 rounded-xl bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/20 transition-all transform hover:scale-105 font-bold flex items-center justify-center gap-2"
                            >
                                <CheckCircle2 size={20} />
                                {t('common.submit')}
                            </button>
                    </div>
                </div>
            </div>
        )}

      <div 
        className={`transition-all duration-500 ease-in-out absolute ${
         viewMode === 'video'
         ? 'bottom-4 right-4 w-64 h-48 z-20 rounded-xl overflow-hidden border border-slate-700 shadow-2xl cursor-pointer hover:scale-105'
         : 'inset-0 z-0'
        }`}
        onClick={() => {
            if (viewMode === 'video') setViewMode('canvas');
        }}
        title={viewMode === 'video' ? "Click to Maximize EMDR" : undefined}
      >
         {settings.zen.active ? (
              <ZenCanvas 
                settings={settings.zen} 
                hands={zenHands || []} 
                speed={settings.speed}
              />
         ) : (
            <EMDRCanvas 
                settings={settings} 
                role={SessionRole.CLIENT} 
                onSessionComplete={handleSessionComplete}
            />
         )}
      </div>

      <div className={`transition-all duration-500 ease-in-out absolute ${
        viewMode === 'canvas'
        ? 'top-4 left-4 w-72 h-48 z-30 shadow-2xl hover:scale-105'
        : 'inset-0 z-10 bg-slate-900'
      }`}>
        <LiveVideo 
            role="CLIENT" 
            isMaximized={viewMode === 'video'}
            onToggleMaximize={() => setViewMode(prev => prev === 'canvas' ? 'video' : 'canvas')}
        />
      </div>

      <EyeTracker settings={settings} onStatusChange={sendClientStatus} />

      <div 
        className="absolute top-0 left-0 w-full h-32 z-40"
        onMouseEnter={() => setIsHoveringTop(true)}
        onMouseLeave={() => setIsHoveringTop(false)}
      />

      <div 
        className={`absolute top-0 left-0 w-full p-6 flex justify-between items-start pointer-events-none transition-opacity duration-300 z-50 ${showControls ? 'opacity-100' : 'opacity-0'}`}
      >
        <div className={`pointer-events-auto transition-all duration-300 ${viewMode === 'canvas' ? 'mt-48' : ''}`}>
            <Link to="/" className="flex items-center gap-2 text-slate-400 hover:text-white bg-black/60 hover:bg-black/80 px-4 py-2 rounded-full backdrop-blur-md border border-white/10 transition-all shadow-lg hover:scale-105">
                <ArrowLeft size={16} /> {t('common.end')}
            </Link>
        </div>

        <div className="flex items-center gap-2 pointer-events-auto">
             {!settings.isPlaying && !settings.zen.active && viewMode === 'canvas' && (
                 <div className="flex items-center gap-2 text-slate-300 bg-black/60 px-4 py-2 rounded-full backdrop-blur-md border border-white/10 shadow-lg">
                     <Loader2 size={16} className="animate-spin" />
                     <span className="text-xs uppercase tracking-widest font-medium">{t('common.waiting')}</span>
                 </div>
             )}
            
            <button 
                onClick={() => setViewMode(prev => prev === 'canvas' ? 'video' : 'canvas')}
                className="text-slate-300 hover:text-white bg-black/60 hover:bg-black/80 p-2 rounded-full backdrop-blur-md border border-white/10 transition-all shadow-lg hover:scale-110"
                title={viewMode === 'canvas' ? "Maximize Video" : "Show EMDR"}
            >
                {viewMode === 'canvas' ? <Video size={20} /> : <Activity size={20} />}
            </button>

            <button 
                onClick={() => setShowSettingsMenu(true)}
                className="text-slate-300 hover:text-white bg-black/60 hover:bg-black/80 p-2 rounded-full backdrop-blur-md border border-white/10 transition-all shadow-lg hover:scale-110"
                title={t('common.settings')}
            >
                <Settings2 size={20} />
            </button>

            <button 
                onClick={toggleFullscreen}
                className="text-slate-300 hover:text-white bg-black/60 hover:bg-black/80 p-2 rounded-full backdrop-blur-md border border-white/10 transition-all shadow-lg hover:scale-110"
                title="Toggle Fullscreen"
            >
                {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
            </button>
        </div>
      </div>
      
      {showSettingsMenu && (
        <div className="absolute inset-0 z-[60] bg-black/60 backdrop-blur-sm flex justify-end">
            <div className="w-80 h-full bg-slate-900 border-l border-slate-700 p-6 overflow-y-auto animate-in slide-in-from-right duration-300 shadow-2xl">
                <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-800">
                    <h2 className="text-white font-bold text-lg tracking-wide flex items-center gap-2">
                        <Settings2 size={20} className="text-blue-500" /> {t('client.preferences')}
                    </h2>
                    <button onClick={() => setShowSettingsMenu(false)} className="text-slate-400 hover:text-white transition-colors"><X size={24} /></button>
                </div>

                <div className="space-y-8">
                     <div className="p-4 bg-slate-800/50 border border-slate-700 rounded text-sm text-slate-300 leading-relaxed">
                        {t('client.localAdjust')}
                     </div>

                    <section className="space-y-3">
                        <div className="flex items-center gap-2 text-blue-400 font-medium text-sm uppercase tracking-wider">
                            <Clock size={14} /> {t('controls.timer')}
                        </div>
                        <select
                            value={settings.durationSeconds}
                            onChange={(e) => updateSettings({ durationSeconds: Number(e.target.value) })}
                            className="w-full bg-slate-800 border border-slate-700 rounded-md p-2 text-white text-sm outline-none focus:border-blue-500 transition-colors"
                        >
                            <option value={0}>Infinite</option>
                            <option value={30}>30s</option>
                            <option value={60}>1m</option>
                            <option value={120}>2m</option>
                            <option value={300}>5m</option>
                        </select>
                    </section>

                    <section className="space-y-4">
                        <div className="flex items-center gap-2 text-blue-400 font-medium text-sm uppercase tracking-wider">
                            <Palette size={14} /> {t('controls.visuals')}
                        </div>
                        
                        <div className="space-y-2">
                            <label className="text-sm text-slate-300">{t('theme.title')}</label>
                            <select 
                                value={settings.theme} 
                                onChange={handleThemeChange} 
                                className="w-full bg-slate-800 border border-slate-700 rounded-md p-2 text-white outline-none text-xs"
                            >
                                <option value={VisualTheme.STANDARD}>{t('theme.standard')}</option>
                                <option value={VisualTheme.STARFIELD}>{t('theme.starfield')}</option>
                                <option value={VisualTheme.BREATHING_FOREST}>{t('theme.forest')}</option>
                                <option value={VisualTheme.BREATHING_OCEAN}>{t('theme.ocean')}</option>
                                <option value={VisualTheme.GOLDEN_HOUR}>{t('theme.golden')}</option>
                                <option value={VisualTheme.AURORA}>{t('theme.aurora')}</option>
                                <option value={VisualTheme.CUSTOM_IMAGE}>{t('theme.custom')}</option>
                            </select>
                        </div>

                        {settings.theme === VisualTheme.CUSTOM_IMAGE && (
                            <div className="space-y-3 bg-slate-800/30 p-2 rounded border border-slate-700/30">
                                <div>
                                    <input 
                                        type="file" 
                                        accept="image/*" 
                                        onChange={handleImageUpload}
                                        ref={fileInputRef}
                                        className="hidden"
                                    />
                                    <button 
                                        onClick={() => fileInputRef.current?.click()}
                                        className="w-full py-1.5 bg-slate-700 hover:bg-slate-600 text-xs text-white rounded flex items-center justify-center gap-2 mb-2"
                                    >
                                        <Upload size={12} /> {t('theme.upload')}
                                    </button>
                                </div>
                                <div className="space-y-1">
                                    <div className="flex justify-between text-[10px] text-slate-400">
                                        <span>{t('theme.overlay')}</span>
                                        <span>{Math.round(settings.themeOpacity * 100)}%</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="0"
                                        max="0.9"
                                        step="0.1"
                                        value={settings.themeOpacity}
                                        onChange={(e) => updateSettings({ themeOpacity: parseFloat(e.target.value) })}
                                        className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                                    />
                                </div>
                            </div>
                        )}

                        <div className="flex items-center justify-between">
                            <div className="flex flex-col">
                                <span className="text-sm text-slate-300">{t('controls.depth')}</span>
                                <span className="text-[10px] text-slate-500">{t('controls.depthDesc')}</span>
                            </div>
                            <button
                                onClick={() => updateSettings({ depthEnabled: !settings.depthEnabled })}
                                className={`w-12 h-6 rounded-full transition-colors relative ${settings.depthEnabled ? 'bg-blue-600' : 'bg-slate-700'}`}
                            >
                                <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${settings.depthEnabled ? 'translate-x-6' : 'translate-x-0'}`} />
                            </button>
                        </div>
                    </section>

                    <section className="space-y-4">
                        <div className="flex items-center gap-2 text-blue-400 font-medium text-sm uppercase tracking-wider">
                            <Sliders size={14} /> {t('controls.motion')}
                        </div>
                        
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm text-slate-300">
                                <span>{t('controls.speed')}</span>
                                <span>{settings.speed}</span>
                            </div>
                            <input
                                type="range"
                                min="1"
                                max="100"
                                value={settings.speed}
                                onChange={(e) => updateSettings({ speed: parseInt(e.target.value) })}
                                className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500 hover:accent-blue-400"
                            />
                        </div>

                        <div className="space-y-2">
                            <div className="flex justify-between text-sm text-slate-300">
                                <span>{t('controls.size')}</span>
                                <span>{settings.size}px</span>
                            </div>
                            <input
                                type="range"
                                min="10"
                                max="150"
                                value={settings.size}
                                onChange={(e) => updateSettings({ size: parseInt(e.target.value) })}
                                className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500 hover:accent-blue-400"
                            />
                        </div>

                         <div className="space-y-2">
                            <label className="text-sm text-slate-300 block">{t('controls.pattern')}</label>
                            <select 
                                value={settings.pattern}
                                onChange={handlePatternChange}
                                className="w-full bg-slate-800 border border-slate-700 rounded-md p-2 text-white text-sm outline-none focus:border-blue-500 transition-colors"
                            >
                                <option value={MovementPattern.LINEAR}>{t('pattern.linear')}</option>
                                <option value={MovementPattern.SINE}>{t('pattern.sine')}</option>
                                <option value={MovementPattern.FIGURE_EIGHT}>{t('pattern.figure8')}</option>
                                <option value={MovementPattern.VERTICAL}>{t('pattern.vertical')}</option>
                                <option value={MovementPattern.ALTERNATED}>{t('pattern.alternated')}</option>
                                <option value={MovementPattern.RANDOM}>{t('pattern.random')}</option>
                            </select>
                        </div>
                    </section>

                    <section className="space-y-4">
                        <div className="flex items-center gap-2 text-blue-400 font-medium text-sm uppercase tracking-wider">
                            {settings.soundEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />} {t('controls.audio')}
                        </div>
                        <div className="flex items-center justify-between">
                            <label className="text-sm text-slate-300">{t('controls.sound')}</label>
                            <button
                                onClick={() => updateSettings({ soundEnabled: !settings.soundEnabled })}
                                className={`w-10 h-5 rounded-full transition-colors relative ${settings.soundEnabled ? 'bg-blue-600' : 'bg-slate-700'}`}
                            >
                                <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform ${settings.soundEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
                            </button>
                        </div>

                        <div className={`space-y-2 transition-all duration-300 ${settings.soundEnabled ? 'opacity-100' : 'opacity-50 pointer-events-none grayscale'}`}>
                            <div className="flex justify-between text-sm text-slate-300">
                                <span>{t('controls.volume')}</span>
                                <span>{Math.round(settings.soundVolume * 100)}%</span>
                            </div>
                            <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.05"
                                value={settings.soundVolume}
                                onChange={(e) => updateSettings({ soundVolume: parseFloat(e.target.value) })}
                                className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500 hover:accent-blue-400"
                            />

                            <div className="pt-2">
                                <label className="text-sm flex items-center gap-2 mb-1">
                                    <Music size={14} className="text-slate-400" />
                                    {t('controls.bgSound')}
                                </label>
                                <select 
                                    value={settings.audioMode} 
                                    onChange={handleAudioModeChange} 
                                    className="w-full bg-slate-950 border border-slate-700 rounded-md p-2 text-white outline-none text-xs"
                                >
                                    <option value={AudioMode.NONE}>{t('audio.none')}</option>
                                    <option value={AudioMode.BINAURAL}>{t('audio.binaural')}</option>
                                    <option value={AudioMode.RAIN}>{t('audio.rain')}</option>
                                    <option value={AudioMode.OCEAN}>{t('audio.ocean')}</option>
                                </select>
                            </div>
                        </div>
                    </section>

                    <section className="space-y-4 pt-4 border-t border-slate-800">
                        <div className="flex items-center gap-2 text-blue-400 font-medium text-sm uppercase tracking-wider">
                            <Globe size={14} /> {t('common.language')}
                        </div>
                        <button 
                            onClick={() => setLanguage(language === 'en' ? 'zh-TW' : 'en')}
                            className="w-full py-2 bg-slate-800 hover:bg-slate-700 rounded text-sm text-white transition-colors flex items-center justify-center gap-2 group"
                        >
                             <Globe size={12} className="text-slate-400 group-hover:text-white transition-colors" />
                            {language === 'en' ? 'Switch to 繁體中文' : 'Switch to English'}
                        </button>
                    </section>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default ClientSession;