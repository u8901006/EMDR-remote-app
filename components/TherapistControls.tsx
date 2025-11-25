import React, { useState, useEffect } from 'react';
import { EMDRSettings, MovementPattern } from '../types';
import { Play, Pause, Square, Sliders, Palette, Volume2, VolumeX, Eye, AlertTriangle, Video, ChevronDown, ChevronUp, Gamepad2, Zap, Activity, Clock, Link as LinkIcon, Loader2, Globe } from 'lucide-react';
import { PRESET_COLORS, PRESET_BG_COLORS } from '../constants';
import { useBroadcastSession } from '../hooks/useBroadcastSession';
import { SessionRole } from '../types';
import { useLiveKitContext } from '../contexts/LiveKitContext';
import { useLanguage } from '../contexts/LanguageContext';

interface TherapistControlsProps {
  settings: EMDRSettings;
  updateSettings: (settings: Partial<EMDRSettings>) => void;
}

const PRESET_DURATIONS = [0, 30, 60, 120, 300, 600];

const TherapistControls: React.FC<TherapistControlsProps> = ({ settings, updateSettings }) => {
  const { t, language, setLanguage } = useLanguage();
  const { clientStatus } = useBroadcastSession(SessionRole.THERAPIST);
  const { connect, disconnect, isConnecting, room } = useLiveKitContext();
  
  const [showVideoConfig, setShowVideoConfig] = useState(false);
  const [localGamepadConnected, setLocalGamepadConnected] = useState(false);
  
  const [localLiveKitUrl, setLocalLiveKitUrl] = useState(settings.liveKitUrl);
  const [localTherapistToken, setLocalTherapistToken] = useState(settings.liveKitTherapistToken);
  const [localClientToken, setLocalClientToken] = useState(settings.liveKitClientToken);

  useEffect(() => { setLocalLiveKitUrl(settings.liveKitUrl); }, [settings.liveKitUrl]);
  useEffect(() => { setLocalTherapistToken(settings.liveKitTherapistToken); }, [settings.liveKitTherapistToken]);
  useEffect(() => { setLocalClientToken(settings.liveKitClientToken); }, [settings.liveKitClientToken]);
  
  const isNonStandardDuration = !PRESET_DURATIONS.includes(settings.durationSeconds);
  const [forceCustomInput, setForceCustomInput] = useState(false);
  const showTimerInput = isNonStandardDuration || forceCustomInput;

  const handleConnect = async () => {
    updateSettings({
        liveKitUrl: localLiveKitUrl,
        liveKitTherapistToken: localTherapistToken,
        liveKitClientToken: localClientToken
    });
    await connect(localLiveKitUrl, localTherapistToken);
  };

  useEffect(() => {
    const intervalId = setInterval(() => {
        const gps = navigator.getGamepads ? navigator.getGamepads() : [];
        let connected = false;
        for (const gp of gps) { if (gp && gp.connected) { connected = true; break; } }
        setLocalGamepadConnected(connected);
    }, 1000);
    return () => clearInterval(intervalId);
  }, []);
  
  const handlePatternChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    updateSettings({ pattern: e.target.value as MovementPattern });
  };

  const testHaptics = () => {
    const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
    let triggered = false;
    for (const gp of gamepads) {
        if (gp && gp.vibrationActuator) {
            try {
                gp.vibrationActuator.playEffect('dual-rumble', { startDelay: 0, duration: 500, weakMagnitude: 1.0, strongMagnitude: 1.0 });
                triggered = true;
            } catch(e) {}
        }
    }
    if (!triggered) alert("No gamepad detected.");
  };

  return (
    <div className="bg-slate-900 border-r border-slate-800 h-screen w-80 flex flex-col text-slate-300 overflow-hidden">
      <div className="p-5 border-b border-slate-800 flex items-center justify-between">
        <h2 className="font-bold text-lg text-white tracking-wide">MindSync Control</h2>
        <div className="flex items-center gap-2">
             {clientStatus?.isFrozen && settings.isPlaying ? (
                <div className="animate-pulse text-red-500" title="Client Gaze Frozen">
                    <AlertTriangle size={18} />
                </div>
             ) : null}
             <div className={`h-2 w-2 rounded-full shadow-[0_0_10px_rgba(34,197,94,0.5)] ${room ? 'bg-green-500' : 'bg-slate-700'}`} title={room ? "Online" : "Offline"}></div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-8 no-scrollbar">
        
        {/* Client Monitor */}
        <section className="bg-slate-800/50 p-3 rounded-lg border border-slate-700/50">
            <div className="flex items-center gap-2 text-blue-400 font-medium text-sm uppercase tracking-wider mb-2">
                <Eye size={14} /> {t('controls.clientMonitor')}
            </div>
            {clientStatus ? (
                <div className="space-y-2">
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-400">{t('controls.sensor')}</span>
                        <span className={clientStatus.isCameraActive ? "text-green-400" : "text-red-400"}>
                            {clientStatus.isCameraActive ? "Active" : "Inactive"}
                        </span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-400">{t('controls.status')}</span>
                        {clientStatus.isFrozen ? (
                            <span className="text-red-400 font-bold animate-pulse bg-red-900/20 px-2 py-0.5 rounded">{t('controls.frozen')}</span>
                        ) : (
                            <span className="text-green-400">{t('controls.tracking')}</span>
                        )}
                    </div>
                    <div className="w-full bg-slate-700 h-1.5 rounded-full overflow-hidden mt-1">
                        <div 
                            className={`h-full transition-all duration-300 ${clientStatus.isFrozen ? 'bg-red-500' : 'bg-green-500'}`}
                            style={{ width: `${Math.min(100, clientStatus.motionScore * 2)}%` }}
                        />
                    </div>
                </div>
            ) : (
                <div className="text-xs text-slate-500 italic text-center py-2">
                    {t('common.waiting')}
                </div>
            )}
             <div className="mt-2 pt-2 border-t border-slate-700/50">
                <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-400">{t('controls.sensitivity')}</span>
                    <span className="text-slate-300">{settings.freezeSensitivity}%</span>
                </div>
                <input
                    type="range"
                    min="0"
                    max="100"
                    value={settings.freezeSensitivity}
                    onChange={(e) => updateSettings({ freezeSensitivity: parseInt(e.target.value) })}
                    className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
            </div>
        </section>

        {/* Video Configuration */}
        <section className="bg-slate-800/30 p-3 rounded-lg border border-slate-700/30">
            <button 
                onClick={() => setShowVideoConfig(!showVideoConfig)}
                className="w-full flex items-center justify-between text-blue-400 font-medium text-sm uppercase tracking-wider"
            >
                <div className="flex items-center gap-2"><Video size={14} /> {t('controls.videoSetup')}</div>
                {showVideoConfig ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
            
            {showVideoConfig && (
                <div className="space-y-3 mt-3 animate-in fade-in slide-in-from-top-2">
                    <div className="space-y-1">
                        <label className="text-xs text-slate-400">{t('controls.serverUrl')}</label>
                        <input 
                            type="text" 
                            value={localLiveKitUrl}
                            onChange={(e) => setLocalLiveKitUrl(e.target.value)}
                            placeholder="wss://..."
                            className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-white focus:border-blue-500 outline-none"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs text-slate-400">{t('controls.therapistToken')}</label>
                        <input 
                            type="password" 
                            value={localTherapistToken}
                            onChange={(e) => setLocalTherapistToken(e.target.value)}
                            placeholder="Token..."
                            className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-white focus:border-blue-500 outline-none"
                        />
                    </div>
                    
                    {!room ? (
                        <button 
                            onClick={handleConnect}
                            disabled={isConnecting}
                            className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                        >
                            {isConnecting ? <Loader2 size={14} className="animate-spin" /> : <LinkIcon size={14} />}
                            {isConnecting ? t('common.connecting') : t('common.connect')}
                        </button>
                    ) : (
                        <button 
                            onClick={() => disconnect()}
                            className="w-full py-2 bg-red-900/50 hover:bg-red-800 text-red-200 text-xs font-bold rounded border border-red-500/30 transition-colors"
                        >
                            {t('common.disconnect')}
                        </button>
                    )}

                    <div className="pt-2 border-t border-slate-700/50">
                        <label className="text-xs text-slate-400">{t('controls.clientToken')}</label>
                        <input 
                            type="text" 
                            value={localClientToken}
                            onChange={(e) => setLocalClientToken(e.target.value)}
                            onBlur={() => updateSettings({ liveKitClientToken: localClientToken })}
                            placeholder="Token..."
                            className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-[10px] text-slate-400 focus:border-blue-500 outline-none"
                        />
                    </div>
                </div>
            )}
        </section>

        {/* Playback Controls */}
        <section className="space-y-3">
             <div className="flex items-center justify-between">
                 <div className="flex items-center gap-2 text-blue-400 font-medium text-sm uppercase tracking-wider">
                    <Clock size={14} /> {t('controls.timer')}
                 </div>
                 <div className="flex items-center gap-2">
                     {showTimerInput && (
                        <input
                            type="number"
                            min="1"
                            value={settings.durationSeconds}
                            onChange={(e) => updateSettings({ durationSeconds: Math.max(1, parseInt(e.target.value) || 0) })}
                            className="w-12 bg-slate-950 border border-slate-700 rounded px-1 py-1 text-xs text-right"
                        />
                     )}
                     <select
                        value={showTimerInput ? -1 : settings.durationSeconds}
                        onChange={(e) => {
                            const val = Number(e.target.value);
                            val === -1 ? setForceCustomInput(true) : setForceCustomInput(false);
                            updateSettings({ durationSeconds: val === -1 ? 45 : val });
                        }}
                        className="bg-slate-800 border border-slate-700 px-2 py-1 text-xs rounded outline-none"
                     >
                        <option value={0}>Infinite</option>
                        <option value={30}>30s</option>
                        <option value={60}>1m</option>
                        <option value={300}>5m</option>
                        <option value={-1}>Custom</option>
                     </select>
                 </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
                <button
                    onClick={() => updateSettings({ isPlaying: !settings.isPlaying })}
                    className={`flex items-center justify-center gap-2 p-4 rounded-lg font-semibold transition-all ${
                        settings.isPlaying ? 'bg-yellow-600 text-white' : 'bg-green-600 text-white'
                    }`}
                >
                    {settings.isPlaying ? <Pause size={20} /> : <Play size={20} />}
                    {settings.isPlaying ? 'PAUSE' : 'START'}
                </button>
                <button
                     onClick={() => updateSettings({ isPlaying: false })}
                     className="flex items-center justify-center gap-2 p-4 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition-colors"
                >
                    <Square size={18} />
                    STOP
                </button>
            </div>
        </section>

        {/* Motion Settings */}
        <section className="space-y-4">
            <div className="flex items-center gap-2 text-blue-400 font-medium text-sm uppercase tracking-wider">
                <Sliders size={14} /> {t('controls.motion')}
            </div>
            
            <div className="space-y-2">
                <div className="flex justify-between text-sm"><span>{t('controls.speed')}</span><span>{settings.speed}</span></div>
                <input type="range" min="1" max="100" value={settings.speed} onChange={(e) => updateSettings({ speed: parseInt(e.target.value) })} className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500" />
            </div>

             <div className="space-y-2">
                <div className="flex justify-between text-sm"><span>{t('controls.size')}</span><span>{settings.size}px</span></div>
                <input type="range" min="10" max="150" value={settings.size} onChange={(e) => updateSettings({ size: parseInt(e.target.value) })} className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500" />
            </div>

             <div className="space-y-2">
                <label className="text-sm block">{t('controls.pattern')}</label>
                <select value={settings.pattern} onChange={handlePatternChange} className="w-full bg-slate-800 border border-slate-700 rounded-md p-2 text-white outline-none">
                    <option value={MovementPattern.LINEAR}>{t('pattern.linear')}</option>
                    <option value={MovementPattern.SINE}>{t('pattern.sine')}</option>
                    <option value={MovementPattern.FIGURE_EIGHT}>{t('pattern.figure8')}</option>
                    <option value={MovementPattern.VERTICAL}>{t('pattern.vertical')}</option>
                    <option value={MovementPattern.ALTERNATED}>{t('pattern.alternated')}</option>
                    <option value={MovementPattern.RANDOM}>{t('pattern.random')}</option>
                </select>
            </div>
        </section>

        {/* Audio */}
        <section className="space-y-4">
            <div className="flex items-center gap-2 text-blue-400 font-medium text-sm uppercase tracking-wider">
                {settings.soundEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />} {t('controls.audio')}
            </div>
            <div className="space-y-4">
                 <div className="flex items-center justify-between">
                    <label className="text-sm">{t('controls.sound')}</label>
                    <button
                        onClick={() => updateSettings({ soundEnabled: !settings.soundEnabled })}
                        className={`w-12 h-6 rounded-full transition-colors relative ${settings.soundEnabled ? 'bg-blue-600' : 'bg-slate-700'}`}
                    >
                        <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${settings.soundEnabled ? 'translate-x-6' : 'translate-x-0'}`} />
                    </button>
                </div>
                <div className={`space-y-2 transition-all duration-300 ${settings.soundEnabled ? 'opacity-100' : 'opacity-50 pointer-events-none grayscale'}`}>
                    <div className="flex justify-between text-sm">
                        <span>{t('controls.volume')}</span>
                        <span className="text-white">{Math.round(settings.soundVolume * 100)}%</span>
                    </div>
                    <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={settings.soundVolume}
                        onChange={(e) => updateSettings({ soundVolume: parseFloat(e.target.value) })}
                        className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                    />
                </div>
            </div>
        </section>
        
        {/* Haptics */}
        <section className="space-y-4">
            <div className="flex items-center gap-2 text-blue-400 font-medium text-sm uppercase tracking-wider">
                <Gamepad2 size={14} /> {t('controls.haptics')}
            </div>
            
            <div className="space-y-3">
                 <div className="flex items-center justify-between">
                    <div className="flex flex-col">
                        <span className="text-sm flex items-center gap-2">
                            {t('controls.gamepad.therapist')}
                            {localGamepadConnected && <Zap size={12} className="text-yellow-400 fill-yellow-400" />}
                        </span>
                        {localGamepadConnected ? (
                            <span className="text-[10px] text-green-400">{t('controls.gamepad.detect')}</span>
                        ) : (
                            <span className="text-[10px] text-slate-500 animate-pulse">{t('controls.gamepad.wake')}</span>
                        )}
                    </div>
                    <button
                        onClick={() => updateSettings({ therapistVibrationEnabled: !settings.therapistVibrationEnabled })}
                        className={`w-12 h-6 rounded-full transition-colors relative ${settings.therapistVibrationEnabled ? 'bg-blue-600' : 'bg-slate-700'}`}
                    >
                        <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${settings.therapistVibrationEnabled ? 'translate-x-6' : 'translate-x-0'}`} />
                    </button>
                </div>
                
                 <div className="flex items-center justify-between">
                    <span className="text-sm">{t('controls.gamepad.client')}</span>
                    <button
                        onClick={() => updateSettings({ clientVibrationEnabled: !settings.clientVibrationEnabled })}
                        className={`w-12 h-6 rounded-full transition-colors relative ${settings.clientVibrationEnabled ? 'bg-blue-600' : 'bg-slate-700'}`}
                    >
                        <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${settings.clientVibrationEnabled ? 'translate-x-6' : 'translate-x-0'}`} />
                    </button>
                </div>
                
                {localGamepadConnected && (
                    <button onClick={testHaptics} className="w-full py-2 mt-1 bg-slate-800 hover:bg-slate-700 text-xs text-blue-300 border border-slate-700 rounded flex items-center justify-center gap-2 transition-colors">
                        <Activity size={12} /> Test Rumble
                    </button>
                )}
            </div>
        </section>

        {/* Visuals */}
        <section className="space-y-4">
            <div className="flex items-center gap-2 text-blue-400 font-medium text-sm uppercase tracking-wider">
                <Palette size={14} /> {t('controls.visuals')}
            </div>

            <div className="space-y-2">
                <label className="text-sm">{t('controls.color')}</label>
                <div className="flex gap-2 flex-wrap">
                    {PRESET_COLORS.map(c => (
                        <button key={c} onClick={() => updateSettings({ color: c })} className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${settings.color === c ? 'border-white scale-110' : 'border-transparent'}`} style={{ backgroundColor: c }} />
                    ))}
                     <input type="color" value={settings.color} onChange={(e) => updateSettings({ color: e.target.value })} className="w-8 h-8 rounded-full p-0 overflow-hidden border-0 cursor-pointer" />
                </div>
            </div>

            <div className="space-y-2">
                <label className="text-sm">{t('controls.bg')}</label>
                <div className="flex gap-2 flex-wrap">
                    {PRESET_BG_COLORS.map(c => (
                        <button key={c} onClick={() => updateSettings({ backgroundColor: c })} className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${settings.backgroundColor === c ? 'border-white scale-110' : 'border-slate-700'}`} style={{ backgroundColor: c }} />
                    ))}
                </div>
            </div>
        </section>

        {/* Bottom Language Switcher */}
        <div className="mt-4 pt-4 border-t border-slate-800">
            <button 
                onClick={() => setLanguage(language === 'en' ? 'zh-TW' : 'en')}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg transition-colors text-xs font-medium"
            >
                <Globe size={14} />
                {language === 'en' ? 'Language: English' : '語言: 繁體中文'}
            </button>
        </div>
      </div>
    </div>
  );
};

export default TherapistControls;