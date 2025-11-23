import React, { useState, useEffect } from 'react';
import { EMDRSettings, MovementPattern, ClientStatus } from '../types';
import { Play, Pause, Square, Sliders, Palette, Maximize2, Volume2, VolumeX, Eye, AlertTriangle, Video, Settings2, ChevronDown, ChevronUp, Gamepad2, Zap, Activity, Clock } from 'lucide-react';
import { PRESET_COLORS, PRESET_BG_COLORS } from '../constants';
import { useBroadcastSession } from '../hooks/useBroadcastSession';
import { SessionRole } from '../types';

interface TherapistControlsProps {
  settings: EMDRSettings;
  updateSettings: (settings: Partial<EMDRSettings>) => void;
}

const PRESET_DURATIONS = [0, 30, 60, 120, 300, 600];

const TherapistControls: React.FC<TherapistControlsProps> = ({ settings, updateSettings }) => {
  const { clientStatus } = useBroadcastSession(SessionRole.THERAPIST);
  const [showVideoConfig, setShowVideoConfig] = useState(false);
  const [localGamepadConnected, setLocalGamepadConnected] = useState(false);
  
  // Logic to handle Custom Timer Input without snapping UI
  // If the current setting is not in the preset list, we must show input.
  // If the user explicitly selected "Custom", we force show input even if they type a preset number (e.g. typing 300 shouldn't snap at 30).
  const isNonStandardDuration = !PRESET_DURATIONS.includes(settings.durationSeconds);
  const [forceCustomInput, setForceCustomInput] = useState(false);
  const showTimerInput = isNonStandardDuration || forceCustomInput;

  useEffect(() => {
    // Poll for gamepad status because events are unreliable if controller is asleep or already connected
    const intervalId = setInterval(() => {
        const gps = navigator.getGamepads ? navigator.getGamepads() : [];
        let connected = false;
        for (const gp of gps) {
            if (gp && gp.connected) {
                connected = true;
                break;
            }
        }
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
                gp.vibrationActuator.playEffect('dual-rumble', {
                    startDelay: 0,
                    duration: 500,
                    weakMagnitude: 1.0,
                    strongMagnitude: 1.0
                });
                triggered = true;
            } catch(e) {
                console.error("Haptic Error", e);
            }
        }
    }
    if (!triggered) {
        alert("No gamepad with vibration support detected. Please press a button on your controller to wake it up, or check browser compatibility.");
    }
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
             <div className="h-2 w-2 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]" title="Sync Active"></div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-8 no-scrollbar">
        
        {/* Client Monitor (Combined) */}
        <section className="bg-slate-800/50 p-3 rounded-lg border border-slate-700/50">
            <div className="flex items-center gap-2 text-blue-400 font-medium text-sm uppercase tracking-wider mb-2">
                <Eye size={14} /> Client Monitor
            </div>
            {clientStatus ? (
                <div className="space-y-2">
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-400">Sensor</span>
                        <span className={clientStatus.isCameraActive ? "text-green-400" : "text-red-400"}>
                            {clientStatus.isCameraActive ? "Active" : "Inactive"}
                        </span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-400">Status</span>
                        {clientStatus.isFrozen ? (
                            <span className="text-red-400 font-bold animate-pulse bg-red-900/20 px-2 py-0.5 rounded">FROZEN</span>
                        ) : (
                            <span className="text-green-400">Tracking</span>
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
                    Waiting for client sensor data...
                </div>
            )}

            {/* Freeze Sensitivity */}
            <div className="mt-4 pt-3 border-t border-slate-700/50">
                <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-400">Sensitivity</span>
                    <span className="text-slate-300">{settings.freezeSensitivity}%</span>
                </div>
                <input
                    type="range"
                    min="0"
                    max="100"
                    value={settings.freezeSensitivity}
                    onChange={(e) => updateSettings({ freezeSensitivity: parseInt(e.target.value) })}
                    className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
            </div>
        </section>

        {/* Video Configuration (LiveKit) */}
        <section className="bg-slate-800/30 p-3 rounded-lg border border-slate-700/30">
            <button 
                onClick={() => setShowVideoConfig(!showVideoConfig)}
                className="w-full flex items-center justify-between text-blue-400 font-medium text-sm uppercase tracking-wider"
            >
                <div className="flex items-center gap-2"><Video size={14} /> Video Setup (LiveKit)</div>
                {showVideoConfig ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
            
            {showVideoConfig && (
                <div className="space-y-3 mt-3 animate-in fade-in slide-in-from-top-2">
                    <div className="space-y-1">
                        <label className="text-xs text-slate-400">Server URL</label>
                        <input 
                            type="text" 
                            value={settings.liveKitUrl}
                            onChange={(e) => updateSettings({ liveKitUrl: e.target.value })}
                            placeholder="wss://your-project.livekit.cloud"
                            className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-white focus:border-blue-500 outline-none"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs text-slate-400">Therapist Token</label>
                        <input 
                            type="password" 
                            value={settings.liveKitTherapistToken}
                            onChange={(e) => updateSettings({ liveKitTherapistToken: e.target.value })}
                            placeholder="Token for Therapist"
                            className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-white focus:border-blue-500 outline-none"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs text-slate-400">Client Token</label>
                        <input 
                            type="password" 
                            value={settings.liveKitClientToken}
                            onChange={(e) => updateSettings({ liveKitClientToken: e.target.value })}
                            placeholder="Token for Client"
                            className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-white focus:border-blue-500 outline-none"
                        />
                    </div>
                    <p className="text-[10px] text-slate-500">
                        Generate tokens in your LiveKit project dashboard.
                    </p>
                </div>
            )}
        </section>

        {/* Playback Controls */}
        <section className="space-y-3">
            <div className="flex items-center justify-between">
                 <div className="flex items-center gap-2 text-blue-400 font-medium text-sm uppercase tracking-wider">
                    <Clock size={14} /> Timer
                 </div>
                 <div className="flex items-center gap-2">
                     {showTimerInput && (
                        <div className="relative animate-in fade-in zoom-in-95 duration-200">
                            <input
                                type="number"
                                min="1"
                                max="3600"
                                value={settings.durationSeconds}
                                onChange={(e) => updateSettings({ durationSeconds: Math.max(1, parseInt(e.target.value) || 0) })}
                                className="w-16 bg-slate-950 border border-slate-700 rounded-l px-2 py-1 text-xs text-white outline-none focus:border-blue-500 text-right pr-5"
                            />
                            <span className="absolute right-1.5 top-1 text-[10px] text-slate-500">s</span>
                        </div>
                     )}
                     <select
                        value={showTimerInput ? -1 : settings.durationSeconds}
                        onChange={(e) => {
                            const val = Number(e.target.value);
                            if (val === -1) {
                                // Switch to custom mode
                                setForceCustomInput(true);
                                // Initialize with a sensible custom default if currently infinite or switch from existing
                                updateSettings({ durationSeconds: settings.durationSeconds > 0 ? settings.durationSeconds : 45 });
                            } else {
                                // Switch to preset
                                setForceCustomInput(false);
                                updateSettings({ durationSeconds: val });
                            }
                        }}
                        className={`bg-slate-800 border border-slate-700 px-2 py-1 text-xs text-white outline-none focus:border-blue-500 ${showTimerInput ? 'rounded-r border-l-0' : 'rounded'}`}
                     >
                        <option value={0}>Infinite</option>
                        <option value={30}>30s</option>
                        <option value={60}>1m</option>
                        <option value={120}>2m</option>
                        <option value={300}>5m</option>
                        <option value={600}>10m</option>
                        <option value={-1}>Custom...</option>
                     </select>
                 </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
                <button
                    onClick={() => updateSettings({ isPlaying: !settings.isPlaying })}
                    className={`flex items-center justify-center gap-2 p-4 rounded-lg font-semibold transition-all ${
                        settings.isPlaying 
                        ? 'bg-yellow-600 hover:bg-yellow-500 text-white shadow-lg' 
                        : 'bg-green-600 hover:bg-green-500 text-white shadow-lg'
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
                <Sliders size={14} /> Motion
            </div>
            
            <div className="space-y-2">
                <div className="flex justify-between text-sm">
                    <span>Speed</span>
                    <span className="text-white">{settings.speed}</span>
                </div>
                <input
                    type="range"
                    min="1"
                    max="100"
                    value={settings.speed}
                    onChange={(e) => updateSettings({ speed: parseInt(e.target.value) })}
                    className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
            </div>

             <div className="space-y-2">
                <div className="flex justify-between text-sm">
                    <span>Size</span>
                    <span className="text-white">{settings.size}px</span>
                </div>
                <input
                    type="range"
                    min="10"
                    max="150"
                    value={settings.size}
                    onChange={(e) => updateSettings({ size: parseInt(e.target.value) })}
                    className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
            </div>

             <div className="space-y-2">
                <label className="text-sm block">Pattern</label>
                <select 
                    value={settings.pattern}
                    onChange={handlePatternChange}
                    className="w-full bg-slate-800 border border-slate-700 rounded-md p-2 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                >
                    <option value={MovementPattern.LINEAR}>Linear (Horizontal)</option>
                    <option value={MovementPattern.SINE}>Sine Wave (Bobbing)</option>
                    <option value={MovementPattern.FIGURE_EIGHT}>Figure Eight</option>
                    <option value={MovementPattern.VERTICAL}>Vertical (Up/Down)</option>
                    <option value={MovementPattern.ALTERNATED}>Alternated (Jump L/R)</option>
                    <option value={MovementPattern.RANDOM}>Randomized</option>
                </select>
            </div>
        </section>

        {/* Audio Settings */}
        <section className="space-y-4">
            <div className="flex items-center gap-2 text-blue-400 font-medium text-sm uppercase tracking-wider">
                {settings.soundEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />} Audio
            </div>
            <div className="space-y-4">
                 <div className="flex items-center justify-between">
                    <label className="text-sm">Enable Sound</label>
                    <button
                        onClick={() => updateSettings({ soundEnabled: !settings.soundEnabled })}
                        className={`w-12 h-6 rounded-full transition-colors relative ${settings.soundEnabled ? 'bg-blue-600' : 'bg-slate-700'}`}
                        title="Toggle Sound"
                    >
                        <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${settings.soundEnabled ? 'translate-x-6' : 'translate-x-0'}`} />
                    </button>
                </div>

                <div className={`space-y-2 transition-all duration-300 ${settings.soundEnabled ? 'opacity-100' : 'opacity-50 pointer-events-none grayscale'}`}>
                    <div className="flex justify-between text-sm">
                        <span>Volume</span>
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
        
        {/* Haptics Settings */}
        <section className="space-y-4">
            <div className="flex items-center gap-2 text-blue-400 font-medium text-sm uppercase tracking-wider">
                <Gamepad2 size={14} /> Haptics
            </div>
            
            <div className="space-y-3">
                 {/* Therapist Toggle */}
                 <div className="flex items-center justify-between">
                    <div className="flex flex-col">
                        <span className="text-sm flex items-center gap-2">
                            Therapist Gamepad
                            {localGamepadConnected && <Zap size={12} className="text-yellow-400 fill-yellow-400" />}
                        </span>
                        {localGamepadConnected ? (
                            <span className="text-[10px] text-green-400">Controller Detected</span>
                        ) : (
                            <span className="text-[10px] text-slate-500 animate-pulse">Press button to wake...</span>
                        )}
                    </div>
                    <button
                        onClick={() => updateSettings({ therapistVibrationEnabled: !settings.therapistVibrationEnabled })}
                        className={`w-12 h-6 rounded-full transition-colors relative ${settings.therapistVibrationEnabled ? 'bg-blue-600' : 'bg-slate-700'}`}
                    >
                        <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${settings.therapistVibrationEnabled ? 'translate-x-6' : 'translate-x-0'}`} />
                    </button>
                </div>
                
                {/* Client Toggle */}
                 <div className="flex items-center justify-between">
                    <span className="text-sm">Client Gamepad</span>
                    <button
                        onClick={() => updateSettings({ clientVibrationEnabled: !settings.clientVibrationEnabled })}
                        className={`w-12 h-6 rounded-full transition-colors relative ${settings.clientVibrationEnabled ? 'bg-blue-600' : 'bg-slate-700'}`}
                    >
                        <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${settings.clientVibrationEnabled ? 'translate-x-6' : 'translate-x-0'}`} />
                    </button>
                </div>

                {/* Test Button */}
                {localGamepadConnected && (
                    <button 
                        onClick={testHaptics}
                        className="w-full py-2 mt-1 bg-slate-800 hover:bg-slate-700 text-xs text-blue-300 border border-slate-700 rounded flex items-center justify-center gap-2 transition-colors"
                    >
                        <Activity size={12} /> Test Rumble
                    </button>
                )}
                
                <p className="text-[10px] text-slate-500 leading-tight mt-1">
                    Note: Requires Gamepad API support (Chrome/Edge on Windows/macOS). Connect controller via USB or Bluetooth.
                </p>
            </div>
        </section>

        {/* Visuals */}
        <section className="space-y-4">
            <div className="flex items-center gap-2 text-blue-400 font-medium text-sm uppercase tracking-wider">
                <Palette size={14} /> Visuals
            </div>

            <div className="space-y-2">
                <label className="text-sm">Ball Color</label>
                <div className="flex gap-2 flex-wrap">
                    {PRESET_COLORS.map(c => (
                        <button
                            key={c}
                            onClick={() => updateSettings({ color: c })}
                            className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${settings.color === c ? 'border-white scale-110' : 'border-transparent'}`}
                            style={{ backgroundColor: c }}
                        />
                    ))}
                     <input 
                        type="color" 
                        value={settings.color}
                        onChange={(e) => updateSettings({ color: e.target.value })}
                        className="w-8 h-8 rounded-full p-0 overflow-hidden border-0 cursor-pointer"
                    />
                </div>
            </div>

            <div className="space-y-2">
                <label className="text-sm">Background</label>
                <div className="flex gap-2 flex-wrap">
                    {PRESET_BG_COLORS.map(c => (
                        <button
                            key={c}
                            onClick={() => updateSettings({ backgroundColor: c })}
                            className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${settings.backgroundColor === c ? 'border-white scale-110' : 'border-slate-700'}`}
                            style={{ backgroundColor: c }}
                        />
                    ))}
                </div>
            </div>
        </section>
      </div>
    </div>
  );
};

export default TherapistControls;