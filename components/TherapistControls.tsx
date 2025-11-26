
import React, { useState, useEffect, useRef } from 'react';
import { EMDRSettings, MovementPattern, VisualTheme, MetricType, SessionMetric } from '../types';
import { Play, Pause, Square, Sliders, Palette, Volume2, VolumeX, Eye, AlertTriangle, Video, ChevronDown, ChevronUp, Gamepad2, Zap, Activity, Clock, Link as LinkIcon, Loader2, Globe, Copy, Check, FolderHeart, Save, Trash2, Mic, MicOff, FileText, Sparkles, Box, FileDown, Repeat, Image as ImageIcon, Upload, ClipboardCheck, TrendingUp } from 'lucide-react';
import { PRESET_COLORS, PRESET_BG_COLORS } from '../constants';
import { useBroadcastSession } from '../hooks/useBroadcastSession';
import { SessionRole } from '../types';
import { useLiveKitContext } from '../contexts/LiveKitContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useVoiceRecognition } from '../hooks/useVoiceRecognition';

interface TherapistControlsProps {
  settings: EMDRSettings;
  updateSettings: (settings: Partial<EMDRSettings>) => void;
  onRequestSummary: (text: string) => void;
  latestSummary?: string; // Generated AI summary passed down from parent
}

interface SavedPreset {
  id: string;
  name: string;
  settings: Partial<EMDRSettings>;
}

const PRESET_DURATIONS = [30, 60, 120, 300, 600];

type TerminationMode = 'MANUAL' | 'TIMER' | 'PASSES';

// Simple SVG Sparkline Component
const Sparkline: React.FC<{ data: SessionMetric[], type: MetricType, color: string, max: number }> = ({ data, type, color, max }) => {
    const filtered = data.filter(d => d.type === type).sort((a,b) => a.timestamp - b.timestamp);
    if (filtered.length === 0) return <div className="h-10 w-full bg-slate-950/50 rounded flex items-center justify-center text-[10px] text-slate-600">No Data</div>;

    const width = 200;
    const height = 40;
    const padding = 5;
    
    // Normalize logic
    const getX = (i: number) => {
        if (filtered.length === 1) return width / 2;
        return padding + (i / (filtered.length - 1)) * (width - 2 * padding);
    };
    
    const getY = (val: number) => {
        return height - padding - (val / max) * (height - 2 * padding);
    };

    const points = filtered.map((d, i) => `${getX(i)},${getY(d.value)}`).join(' ');

    return (
        <div className="relative h-10 w-full">
            <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
                {/* Reference Line (Midpoint) */}
                <line x1="0" y1={height/2} x2={width} y2={height/2} stroke="#334155" strokeDasharray="2,2" strokeWidth="1" />
                
                {/* The Line */}
                <polyline points={points} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                
                {/* Dots */}
                {filtered.map((d, i) => (
                    <circle key={d.id} cx={getX(i)} cy={getY(d.value)} r="3" fill="#0f172a" stroke={color} strokeWidth="1.5" />
                ))}
            </svg>
            <div className="absolute top-0 right-0 text-[10px] font-bold" style={{ color }}>
                {filtered[filtered.length - 1].value}
            </div>
        </div>
    );
};

const TherapistControls: React.FC<TherapistControlsProps> = ({ settings, updateSettings, onRequestSummary, latestSummary }) => {
  const { t, language, setLanguage } = useLanguage();
  const { clientStatus, requestMetric, metrics } = useBroadcastSession(SessionRole.THERAPIST);
  const { connect, disconnect, isConnecting, room } = useLiveKitContext();
  const { isListening, transcript, startListening, stopListening, resetTranscript, hasBrowserSupport } = useVoiceRecognition(language);
  
  const [showVideoConfig, setShowVideoConfig] = useState(false);
  const [showPresets, setShowPresets] = useState(false);
  const [showTranscription, setShowTranscription] = useState(false);
  const [showAssessment, setShowAssessment] = useState(true);
  const [localGamepadConnected, setLocalGamepadConnected] = useState(false);
  
  const [localLiveKitUrl, setLocalLiveKitUrl] = useState(settings.liveKitUrl);
  const [localTherapistToken, setLocalTherapistToken] = useState(settings.liveKitTherapistToken);
  const [localClientToken, setLocalClientToken] = useState(settings.liveKitClientToken);
  const [isCopied, setIsCopied] = useState(false);

  // Preset State
  const [presets, setPresets] = useState<SavedPreset[]>([]);
  const [newPresetName, setNewPresetName] = useState('');

  // Stats for Report
  const sessionStartTime = useRef<number>(Date.now());
  const [freezeCount, setFreezeCount] = useState(0);
  const prevFrozenState = useRef(false);

  // Termination Mode Logic
  const [terminationMode, setTerminationMode] = useState<TerminationMode>('MANUAL');
  
  // Image Upload Ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Request State
  const [requestingMetric, setRequestingMetric] = useState<MetricType | null>(null);

  useEffect(() => {
      // Determine mode from initial settings or external updates
      if (settings.targetPasses > 0) {
          setTerminationMode('PASSES');
      } else if (settings.durationSeconds > 0) {
          setTerminationMode('TIMER');
      } else {
          setTerminationMode('MANUAL');
      }
  }, [settings.targetPasses, settings.durationSeconds]);

  const handleModeChange = (mode: TerminationMode) => {
      setTerminationMode(mode);
      if (mode === 'MANUAL') {
          updateSettings({ durationSeconds: 0, targetPasses: 0 });
      } else if (mode === 'TIMER') {
          updateSettings({ durationSeconds: 60, targetPasses: 0 }); // Default 1 min
      } else if (mode === 'PASSES') {
          updateSettings({ durationSeconds: 0, targetPasses: 24 }); // Default 24 passes
      }
  };

  // Track freeze events
  useEffect(() => {
      if (clientStatus?.isFrozen && !prevFrozenState.current) {
          setFreezeCount(c => c + 1);
      }
      prevFrozenState.current = !!clientStatus?.isFrozen;
  }, [clientStatus?.isFrozen]);

  // Reset requesting state when a new metric arrives
  useEffect(() => {
      if (requestingMetric) {
          // Check if we got a new metric of that type that is recent
          const recent = metrics.filter(m => m.type === requestingMetric && m.timestamp > Date.now() - 2000);
          if (recent.length > 0) {
              setRequestingMetric(null);
          }
      }
  }, [metrics, requestingMetric]);

  // Load presets on mount
  useEffect(() => {
    const saved = localStorage.getItem('emdr-presets');
    if (saved) {
        try {
            setPresets(JSON.parse(saved));
        } catch (e) {
            console.error("Failed to parse presets", e);
        }
    }
  }, []);

  useEffect(() => { setLocalLiveKitUrl(settings.liveKitUrl); }, [settings.liveKitUrl]);
  useEffect(() => { setLocalTherapistToken(settings.liveKitTherapistToken); }, [settings.liveKitTherapistToken]);
  useEffect(() => { setLocalClientToken(settings.liveKitClientToken); }, [settings.liveKitClientToken]);
  
  const handleConnect = async () => {
    updateSettings({
        liveKitUrl: localLiveKitUrl,
        liveKitTherapistToken: localTherapistToken,
        liveKitClientToken: localClientToken
    });
    await connect(localLiveKitUrl, localTherapistToken);
  };

  const handleCopyInviteLink = () => {
    const baseUrl = window.location.href.split('#')[0].replace(/\/$/, '');
    const inviteBase = `${baseUrl}/#/client`;
    
    const params = new URLSearchParams();
    if (localLiveKitUrl) params.append('url', localLiveKitUrl);
    if (localClientToken) params.append('token', localClientToken);
    
    const inviteLink = `${inviteBase}?${params.toString()}`;
    
    navigator.clipboard.writeText(inviteLink).then(() => {
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
    });
  };

  // Preset Logic
  const handleSavePreset = () => {
      if (!newPresetName.trim()) return;

      // Filter out connection details and temporary state
      const { liveKitUrl, liveKitTherapistToken, liveKitClientToken, isPlaying, ...safeSettings } = settings;

      const newPreset: SavedPreset = {
          id: Date.now().toString(),
          name: newPresetName.trim(),
          settings: safeSettings
      };

      const updated = [...presets, newPreset];
      setPresets(updated);
      localStorage.setItem('emdr-presets', JSON.stringify(updated));
      setNewPresetName('');
  };

  const handleLoadPreset = (preset: SavedPreset) => {
      // Don't overwrite connection details
      updateSettings({ ...preset.settings, isPlaying: false });
  };

  const handleDeletePreset = (id: string) => {
      const updated = presets.filter(p => p.id !== id);
      setPresets(updated);
      localStorage.setItem('emdr-presets', JSON.stringify(updated));
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
  
  const handleThemeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      updateSettings({ theme: e.target.value as VisualTheme });
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

  const handleRequestMetric = (type: MetricType) => {
      requestMetric(type);
      setRequestingMetric(type);
      // Timeout reset in case client doesn't respond
      setTimeout(() => setRequestingMetric(null), 15000);
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

  const handleDownloadReport = () => {
    const durationMs = Date.now() - sessionStartTime.current;
    const durationMin = Math.floor(durationMs / 60000);
    const durationSec = Math.floor((durationMs % 60000) / 1000);
    const dateStr = new Date().toLocaleString(language === 'zh-TW' ? 'zh-TW' : 'en-US');

    // Format metrics
    const sudsList = metrics.filter(m => m.type === 'SUD').map(m => `[${new Date(m.timestamp).toLocaleTimeString()}] SUD: ${m.value}/10`).join('\n');
    const vocList = metrics.filter(m => m.type === 'VOC').map(m => `[${new Date(m.timestamp).toLocaleTimeString()}] VOC: ${m.value}/7`).join('\n');

    const reportContent = `
==================================================
${t('report.title')}
==================================================

${t('report.date')}: ${dateStr}
${t('report.duration')}: ${durationMin}m ${durationSec}s
${t('report.freezeCount')}: ${freezeCount}

--------------------------------------------------
${t('report.metrics')}
--------------------------------------------------
${sudsList || '(No SUDs recorded)'}

${vocList || '(No VOC recorded)'}

--------------------------------------------------
${t('report.soap')}
--------------------------------------------------
${latestSummary || '(No summary generated)'}

--------------------------------------------------
${t('report.transcript')}
--------------------------------------------------
${transcript || '(No transcript recorded)'}

==================================================
${t('report.generated')}
`;

    const blob = new Blob([reportContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `MindSync-Session-${new Date().toISOString().slice(0,10)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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
        </section>

        {/* Clinical Assessment */}
        <section className="bg-slate-800/30 p-3 rounded-lg border border-slate-700/30">
            <button 
                onClick={() => setShowAssessment(!showAssessment)}
                className="w-full flex items-center justify-between text-blue-400 font-medium text-sm uppercase tracking-wider"
            >
                <div className="flex items-center gap-2"><ClipboardCheck size={14} /> {t('metrics.title')}</div>
                {showAssessment ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
            
            {showAssessment && (
                <div className="space-y-4 mt-3 animate-in fade-in slide-in-from-top-2">
                    {/* SUDs */}
                    <div className="space-y-1">
                        <div className="flex justify-between items-center text-xs">
                            <span className="text-slate-400 font-bold">{t('metrics.suds')}</span>
                            <button 
                                onClick={() => handleRequestMetric('SUD')}
                                disabled={requestingMetric === 'SUD' || !room}
                                className="text-[10px] bg-blue-900/40 text-blue-300 px-2 py-0.5 rounded hover:bg-blue-800/60 disabled:opacity-50"
                            >
                                {requestingMetric === 'SUD' ? t('metrics.requesting') : t('metrics.assessSuds')}
                            </button>
                        </div>
                        <Sparkline data={metrics} type="SUD" color="#ef4444" max={10} />
                    </div>

                    {/* VOC */}
                    <div className="space-y-1">
                        <div className="flex justify-between items-center text-xs">
                            <span className="text-slate-400 font-bold">{t('metrics.voc')}</span>
                            <button 
                                onClick={() => handleRequestMetric('VOC')}
                                disabled={requestingMetric === 'VOC' || !room}
                                className="text-[10px] bg-green-900/40 text-green-300 px-2 py-0.5 rounded hover:bg-green-800/60 disabled:opacity-50"
                            >
                                {requestingMetric === 'VOC' ? t('metrics.requesting') : t('metrics.assessVoc')}
                            </button>
                        </div>
                        <Sparkline data={metrics} type="VOC" color="#22c55e" max={7} />
                    </div>
                </div>
            )}
        </section>

        {/* Voice Transcription */}
        <section className="bg-slate-800/30 p-3 rounded-lg border border-slate-700/30">
            <button 
                onClick={() => setShowTranscription(!showTranscription)}
                className="w-full flex items-center justify-between text-blue-400 font-medium text-sm uppercase tracking-wider"
            >
                <div className="flex items-center gap-2">
                    {isListening ? <Mic size={14} className="text-red-500 animate-pulse" /> : <FileText size={14} />} 
                    {t('transcription.title')}
                </div>
                {showTranscription ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
            
            {showTranscription && (
                <div className="space-y-3 mt-3 animate-in fade-in slide-in-from-top-2">
                     {!hasBrowserSupport ? (
                        <div className="text-xs text-red-400 text-center border border-red-500/30 p-2 rounded bg-red-900/10">
                            {t('transcription.unsupported')}
                        </div>
                     ) : (
                        <>
                            <div className="flex gap-2">
                                <button
                                    onClick={isListening ? stopListening : startListening}
                                    className={`flex-1 py-1.5 rounded text-xs font-bold flex items-center justify-center gap-2 transition-colors ${
                                        isListening 
                                        ? 'bg-red-900/50 text-red-300 border border-red-500/50 hover:bg-red-900/70' 
                                        : 'bg-slate-700 text-white hover:bg-slate-600'
                                    }`}
                                >
                                    {isListening ? (
                                        <><MicOff size={12} /> {t('transcription.stop')}</>
                                    ) : (
                                        <><Mic size={12} /> {t('transcription.start')}</>
                                    )}
                                </button>
                                <button 
                                    onClick={resetTranscript}
                                    disabled={!transcript}
                                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded text-slate-400 hover:text-white disabled:opacity-50"
                                    title={t('transcription.clear')}
                                >
                                    <Trash2 size={12} />
                                </button>
                            </div>

                            <textarea 
                                value={transcript}
                                readOnly
                                placeholder={t('transcription.placeholder')}
                                className="w-full h-32 bg-slate-950 border border-slate-700 rounded p-2 text-xs text-slate-300 resize-none outline-none focus:border-blue-500/50 font-mono leading-relaxed"
                            />

                            <div className="flex gap-2">
                                <button 
                                    onClick={() => onRequestSummary(transcript)}
                                    disabled={!transcript || transcript.length < 10}
                                    className="flex-1 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white text-xs font-bold rounded flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-900/20"
                                >
                                    <Sparkles size={12} /> {t('transcription.generateSoap')}
                                </button>
                                
                                <button 
                                    onClick={handleDownloadReport}
                                    className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold rounded flex items-center justify-center gap-2 transition-colors"
                                    title={t('report.download')}
                                >
                                    <FileDown size={14} />
                                </button>
                            </div>
                        </>
                     )}
                </div>
            )}
        </section>
        
        {/* Session Presets */}
        <section className="bg-slate-800/30 p-3 rounded-lg border border-slate-700/30">
            <button 
                onClick={() => setShowPresets(!showPresets)}
                className="w-full flex items-center justify-between text-blue-400 font-medium text-sm uppercase tracking-wider"
            >
                <div className="flex items-center gap-2"><FolderHeart size={14} /> {t('presets.title')}</div>
                {showPresets ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>

            {showPresets && (
                <div className="space-y-3 mt-3 animate-in fade-in slide-in-from-top-2">
                    <div className="flex gap-2">
                        <input 
                            type="text" 
                            value={newPresetName}
                            onChange={(e) => setNewPresetName(e.target.value)}
                            placeholder={t('presets.namePlaceholder')}
                            className="flex-1 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-white focus:border-blue-500 outline-none"
                            onKeyDown={(e) => e.key === 'Enter' && handleSavePreset()}
                        />
                        <button 
                            onClick={handleSavePreset}
                            disabled={!newPresetName.trim()}
                            className="bg-blue-600 hover:bg-blue-500 text-white p-1.5 rounded disabled:opacity-50 transition-colors"
                            title={t('presets.save')}
                        >
                            <Save size={14} />
                        </button>
                    </div>

                    <div className="space-y-1 max-h-32 overflow-y-auto no-scrollbar">
                        {presets.length === 0 ? (
                            <div className="text-xs text-slate-500 italic text-center py-2">{t('presets.empty')}</div>
                        ) : (
                            presets.map(preset => (
                                <div key={preset.id} className="group flex items-center justify-between p-2 rounded bg-slate-900/50 hover:bg-slate-800 border border-transparent hover:border-slate-700 transition-colors">
                                    <button 
                                        onClick={() => handleLoadPreset(preset)}
                                        className="text-xs text-slate-300 hover:text-white flex items-center gap-2 truncate flex-1 text-left"
                                        title={t('presets.load')}
                                    >
                                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                                        {preset.name}
                                    </button>
                                    <button 
                                        onClick={() => handleDeletePreset(preset.id)}
                                        className="text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                                        title={t('presets.delete')}
                                    >
                                        <Trash2 size={12} />
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
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
                        <div className="flex gap-2">
                            <input 
                                type="text" 
                                value={localClientToken}
                                onChange={(e) => setLocalClientToken(e.target.value)}
                                onBlur={() => updateSettings({ liveKitClientToken: localClientToken })}
                                placeholder="Token..."
                                className="flex-1 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-[10px] text-slate-400 focus:border-blue-500 outline-none"
                            />
                        </div>
                         <button 
                            onClick={handleCopyInviteLink}
                            disabled={!localLiveKitUrl || !localClientToken}
                            className={`w-full mt-2 py-1.5 rounded text-[10px] font-medium flex items-center justify-center gap-1.5 transition-colors border ${
                                isCopied 
                                ? 'bg-green-900/30 border-green-500/50 text-green-300' 
                                : 'bg-slate-700 hover:bg-slate-600 border-slate-600 text-slate-200'
                            }`}
                        >
                            {isCopied ? <Check size={12} /> : <Copy size={12} />}
                            {isCopied ? t('controls.linkCopied') : t('controls.copyLink')}
                        </button>
                    </div>
                </div>
            )}
        </section>

        {/* Playback Controls */}
        <section className="space-y-3">
             <div className="flex items-center justify-between mb-2">
                 <div className="flex items-center gap-2 text-blue-400 font-medium text-sm uppercase tracking-wider">
                    <Clock size={14} /> {t('controls.mode')}
                 </div>
             </div>
             
             {/* Termination Mode Switcher */}
             <div className="flex p-1 bg-slate-800 rounded-lg">
                 {(['MANUAL', 'TIMER', 'PASSES'] as TerminationMode[]).map(mode => (
                     <button
                        key={mode}
                        onClick={() => handleModeChange(mode)}
                        className={`flex-1 py-1.5 text-[10px] font-bold rounded transition-colors ${
                            terminationMode === mode 
                            ? 'bg-blue-600 text-white shadow' 
                            : 'text-slate-400 hover:text-white'
                        }`}
                     >
                        {mode === 'MANUAL' && t('controls.mode.manual')}
                        {mode === 'TIMER' && t('controls.mode.time')}
                        {mode === 'PASSES' && t('controls.mode.passes')}
                     </button>
                 ))}
             </div>

             {/* Dynamic Input based on Mode */}
             {terminationMode === 'TIMER' && (
                 <div className="animate-in fade-in slide-in-from-top-1 bg-slate-800/30 p-2 rounded border border-slate-700/30">
                     <div className="flex justify-between items-center text-xs text-slate-300 mb-1">
                         <span>{t('controls.timer')}</span>
                         <span>{settings.durationSeconds}s</span>
                     </div>
                     <div className="flex gap-2">
                         <select
                            value={PRESET_DURATIONS.includes(settings.durationSeconds) ? settings.durationSeconds : -1}
                            onChange={(e) => {
                                const val = Number(e.target.value);
                                if (val !== -1) updateSettings({ durationSeconds: val });
                            }}
                            className="flex-1 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs outline-none"
                         >
                            {PRESET_DURATIONS.map(d => <option key={d} value={d}>{d}s</option>)}
                            <option value={-1}>Custom</option>
                         </select>
                         <input
                            type="number"
                            min="1"
                            value={settings.durationSeconds || ''}
                            onChange={(e) => updateSettings({ durationSeconds: Math.max(1, parseInt(e.target.value) || 0) })}
                            className="w-16 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-right outline-none"
                            placeholder="Sec"
                        />
                     </div>
                 </div>
             )}

             {terminationMode === 'PASSES' && (
                 <div className="animate-in fade-in slide-in-from-top-1 bg-slate-800/30 p-2 rounded border border-slate-700/30">
                     <div className="flex justify-between items-center text-xs text-slate-300 mb-1">
                         <span>{t('controls.passes')}</span>
                         <span>{settings.targetPasses}</span>
                     </div>
                     <div className="flex items-center gap-2">
                        <Repeat size={14} className="text-slate-500" />
                        <input
                            type="number"
                            min="1"
                            max="1000"
                            value={settings.targetPasses || ''}
                            onChange={(e) => updateSettings({ targetPasses: Math.max(1, parseInt(e.target.value) || 0) })}
                            className="flex-1 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs outline-none"
                        />
                     </div>
                 </div>
             )}

            <div className="grid grid-cols-2 gap-3 pt-2">
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

        {/* Visuals - THEME & BACKGROUND */}
        <section className="space-y-4">
            <div className="flex items-center gap-2 text-blue-400 font-medium text-sm uppercase tracking-wider">
                <Palette size={14} /> {t('controls.visuals')}
            </div>

            <div className="flex items-center justify-between">
                <div className="flex flex-col">
                    <span className="text-sm">{t('controls.depth')}</span>
                    <span className="text-[10px] text-slate-500">{t('controls.depthDesc')}</span>
                </div>
                <button
                    onClick={() => updateSettings({ depthEnabled: !settings.depthEnabled })}
                    className={`w-12 h-6 rounded-full transition-colors relative ${settings.depthEnabled ? 'bg-blue-600' : 'bg-slate-700'}`}
                >
                    <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${settings.depthEnabled ? 'translate-x-6' : 'translate-x-0'}`} />
                </button>
            </div>

            {/* Theme Selector */}
            <div className="space-y-2">
                <label className="text-sm">{t('theme.title')}</label>
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

            {/* Custom Image Controls */}
            {settings.theme === VisualTheme.CUSTOM_IMAGE && (
                <div className="space-y-3 bg-slate-800/30 p-2 rounded border border-slate-700/30 animate-in fade-in zoom-in duration-200">
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
                        
                        <div className="flex gap-2">
                            <ImageIcon size={14} className="text-slate-500 mt-1" />
                            <input 
                                type="text"
                                placeholder={t('theme.url')}
                                value={settings.customImageUrl.startsWith('data:') ? '' : settings.customImageUrl}
                                onChange={(e) => updateSettings({ customImageUrl: e.target.value })}
                                className="flex-1 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-slate-300 outline-none"
                            />
                        </div>
                        {settings.customImageUrl.startsWith('data:') && (
                            <p className="text-[10px] text-yellow-500 mt-1 flex items-center gap-1">
                                <AlertTriangle size={10} /> {t('theme.localNotice')}
                            </p>
                        )}
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

            {/* Background Color (Only for Standard) */}
            {settings.theme === VisualTheme.STANDARD && (
                <div className="space-y-2">
                    <label className="text-sm">{t('controls.bg')}</label>
                    <div className="flex gap-2 flex-wrap">
                        {PRESET_BG_COLORS.map(c => (
                            <button key={c} onClick={() => updateSettings({ backgroundColor: c })} className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${settings.backgroundColor === c ? 'border-white scale-110' : 'border-slate-700'}`} style={{ backgroundColor: c }} />
                        ))}
                    </div>
                </div>
            )}

            <div className="space-y-2">
                <label className="text-sm">{t('controls.color')}</label>
                <div className="flex gap-2 flex-wrap">
                    {PRESET_COLORS.map(c => (
                        <button key={c} onClick={() => updateSettings({ color: c })} className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${settings.color === c ? 'border-white scale-110' : 'border-transparent'}`} style={{ backgroundColor: c }} />
                    ))}
                     <input type="color" value={settings.color} onChange={(e) => updateSettings({ color: e.target.value })} className="w-8 h-8 rounded-full p-0 overflow-hidden border-0 cursor-pointer" />
                </div>
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
