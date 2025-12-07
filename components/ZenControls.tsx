import React from 'react';
import { ZenSettings, ZenShape } from '../types';
import { ZEN_COLORS } from '../constants';
import { X, Fingerprint, Zap } from 'lucide-react';

interface ZenControlsProps {
  settings: ZenSettings;
  updateSettings: (s: Partial<ZenSettings>) => void;
  onClose: () => void;
  isHandTrackingActive: boolean;
}

const SHAPES = [
    { id: ZenShape.HEART, label: 'Heart' },
    { id: ZenShape.FLOWER, label: 'Flower' },
    { id: ZenShape.SATURN, label: 'Saturn' },
    { id: ZenShape.DONUT, label: 'Donut' },
    { id: ZenShape.PYRAMID, label: 'Pyramid' },
    { id: ZenShape.SPHERE, label: 'Sphere' },
];

const ZenControls: React.FC<ZenControlsProps> = ({ settings, updateSettings, onClose, isHandTrackingActive }) => {
  return (
    <div className="flex flex-col h-full bg-slate-900 text-slate-200 p-4 space-y-6">
        <div className="flex justify-between items-center border-b border-slate-700 pb-4">
            <div>
                <h2 className="text-xl font-bold text-white tracking-widest uppercase">ZenParticles<span className="text-blue-500">3D</span></h2>
                <p className="text-[10px] text-slate-500 uppercase tracking-wider">Immersive Gesture Field</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors">
                <X size={20} />
            </button>
        </div>

        {/* Hand Status */}
        <div className={`p-3 rounded border flex items-center gap-3 transition-colors ${isHandTrackingActive ? 'bg-green-900/20 border-green-500/50' : 'bg-slate-800 border-slate-700'}`}>
            <Fingerprint size={20} className={isHandTrackingActive ? 'text-green-400 animate-pulse' : 'text-slate-500'} />
            <div className="flex flex-col">
                <span className="text-xs font-bold uppercase">{isHandTrackingActive ? 'Hands Detected' : 'No Hands Detected'}</span>
                <span className="text-[10px] text-slate-400">{isHandTrackingActive ? 'Gesture Control Active' : 'Raise hands to camera'}</span>
            </div>
        </div>

        {/* Shapes */}
        <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Particle Signature</label>
            <div className="grid grid-cols-2 gap-2">
                {SHAPES.map(s => (
                    <button
                        key={s.id}
                        onClick={() => updateSettings({ shape: s.id })}
                        className={`py-3 text-xs font-bold uppercase tracking-wider rounded border transition-all ${
                            settings.shape === s.id 
                            ? 'bg-slate-100 text-slate-900 border-white shadow-[0_0_15px_rgba(255,255,255,0.3)]' 
                            : 'bg-slate-800/50 text-slate-400 border-slate-700 hover:bg-slate-800 hover:text-white'
                        }`}
                    >
                        {s.label}
                    </button>
                ))}
            </div>
        </div>

        {/* Colors */}
        <div className="space-y-2">
             <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Core Frequency</label>
             <div className="grid grid-cols-4 gap-3">
                 {ZEN_COLORS.map(c => (
                     <button
                        key={c}
                        onClick={() => updateSettings({ colorHex: c })}
                        className={`w-full aspect-square rounded-full transition-transform hover:scale-110 relative ${settings.colorHex === c ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-900 scale-110' : ''}`}
                        style={{ backgroundColor: c, boxShadow: settings.colorHex === c ? `0 0 15px ${c}` : 'none' }}
                     />
                 ))}
             </div>
        </div>

        {/* Sliders */}
        <div className="space-y-4 pt-2">
            <div className="space-y-1">
                <div className="flex justify-between text-xs font-bold text-slate-400 uppercase">
                    <span>Field Scale</span>
                    <span>{Math.round(settings.scale * 100)}%</span>
                </div>
                <input 
                    type="range" min="0.1" max="2.0" step="0.1"
                    value={settings.scale}
                    onChange={(e) => updateSettings({ scale: parseFloat(e.target.value) })}
                    className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-white"
                />
            </div>

            <div className="space-y-1">
                <div className="flex justify-between text-xs font-bold text-slate-400 uppercase">
                    <span>Luminance</span>
                    <span>{Math.round(settings.luminance * 100)}%</span>
                </div>
                <input 
                    type="range" min="0.1" max="1.0" step="0.1"
                    value={settings.luminance}
                    onChange={(e) => updateSettings({ luminance: parseFloat(e.target.value) })}
                    className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-white"
                />
            </div>

             <div className="space-y-1">
                <div className="flex justify-between text-xs font-bold text-slate-400 uppercase">
                    <span>Density</span>
                    <span>{settings.density}</span>
                </div>
                <input 
                    type="range" min="1000" max="8000" step="500"
                    value={settings.density}
                    onChange={(e) => updateSettings({ density: parseInt(e.target.value) })}
                    className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-white"
                />
            </div>
        </div>
        
        <div className="mt-auto pt-6">
            <button className="w-full py-3 bg-slate-800 border border-slate-700 rounded-lg text-xs font-bold uppercase tracking-widest text-slate-300 flex items-center justify-center gap-2 hover:bg-slate-700 transition-colors">
                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                Record Sequence
            </button>
        </div>
    </div>
  );
};

export default ZenControls;