
import React, { useState, useEffect } from 'react';
import { BookOpen, Sparkles, MonitorOff, MonitorUp } from 'lucide-react';
import { EMDR_SCRIPTS } from '../constants';
import { useLanguage } from '../contexts/LanguageContext';

interface ScriptPanelProps {
  onUpdateTeleprompter: (text: string | null) => void;
  onRequestSummary: (text: string) => void;
}

const ScriptPanel: React.FC<ScriptPanelProps> = ({ onUpdateTeleprompter, onRequestSummary }) => {
  const { t, language } = useLanguage();
  const [scriptContent, setScriptContent] = useState('');
  const [isTeleprompterActive, setIsTeleprompterActive] = useState(false);

  // Script Logic
  const handleLoadScript = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const scriptId = e.target.value;
      const script = EMDR_SCRIPTS.find(s => s.id === scriptId);
      if (script) {
          const content = language === 'zh-TW' ? script.content['zh-TW'] : script.content.en;
          setScriptContent(content);
      }
  };

  const toggleTeleprompter = () => {
      if (isTeleprompterActive) {
          setIsTeleprompterActive(false);
          onUpdateTeleprompter(null);
      } else {
          setIsTeleprompterActive(true);
          onUpdateTeleprompter(scriptContent || "Please enter script text...");
      }
  };

  // Update teleprompter live if active
  useEffect(() => {
      if (isTeleprompterActive) {
          onUpdateTeleprompter(scriptContent);
      }
  }, [scriptContent, isTeleprompterActive, onUpdateTeleprompter]);

  return (
    <div className="p-4 space-y-4 h-full flex flex-col">
        <div className="flex items-center gap-2 text-blue-400 font-medium text-sm uppercase tracking-wider mb-2">
            <BookOpen size={14} /> {t('scripts.title')}
        </div>
        
        <select 
            onChange={handleLoadScript}
            className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-2 text-xs text-white outline-none focus:border-blue-500"
        >
            <option value="">{t('scripts.select')}</option>
            {EMDR_SCRIPTS.map(s => (
                <option key={s.id} value={s.id}>
                    {language === 'zh-TW' ? s.title['zh-TW'] : s.title.en}
                </option>
            ))}
        </select>

        <textarea
            value={scriptContent}
            onChange={(e) => setScriptContent(e.target.value)}
            placeholder={t('scripts.placeholder')}
            className="w-full flex-1 bg-slate-950 border border-slate-700 rounded p-3 text-sm text-slate-300 resize-none outline-none focus:border-blue-500/50 leading-relaxed font-mono"
        />

        <div className="flex gap-2">
            <button 
                onClick={() => onRequestSummary(`${t('scripts.contextPrompt')} ${scriptContent || 'Trauma Processing'}`)}
                className="flex-1 py-2 bg-purple-900/30 hover:bg-purple-900/50 text-purple-200 border border-purple-500/30 text-xs font-bold rounded flex items-center justify-center gap-2 transition-colors"
            >
                <Sparkles size={14} /> {t('scripts.aiPrompt')}
            </button>
            <button 
                onClick={toggleTeleprompter}
                className={`flex-1 py-2 rounded text-xs font-bold flex items-center justify-center gap-2 transition-colors border ${
                    isTeleprompterActive 
                    ? 'bg-blue-600 text-white border-blue-500' 
                    : 'bg-slate-700 hover:bg-slate-600 text-slate-200 border-slate-600'
                }`}
            >
                {isTeleprompterActive ? <MonitorOff size={14} /> : <MonitorUp size={14} />}
                {isTeleprompterActive ? t('scripts.hide') : t('scripts.project')}
            </button>
        </div>
    </div>
  );
};

export default ScriptPanel;
