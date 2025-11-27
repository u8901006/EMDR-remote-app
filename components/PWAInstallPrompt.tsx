
import React, { useState } from 'react';
import { Download, Share, PlusSquare, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { useLanguage } from '../contexts/LanguageContext';

const PWAInstallPrompt: React.FC = () => {
  const { t } = useLanguage();
  const { isInstallable, isIOS, isStandalone, promptInstall } = usePWAInstall();
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);

  // If already installed (standalone), don't show anything
  if (isStandalone || !isInstallable) return null;

  const handleClick = () => {
    if (isIOS) {
        setShowIOSInstructions(true);
    } else {
        promptInstall();
    }
  };

  return (
    <>
        <button 
            onClick={handleClick}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-blue-400 border border-slate-700 rounded-full transition-all hover:scale-105 shadow-lg group"
        >
            <Download size={18} className="group-hover:animate-bounce" />
            <span className="font-medium">{t('pwa.install')}</span>
        </button>

        {/* iOS Instruction Modal */}
        {showIOSInstructions && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
                <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-sm w-full shadow-2xl relative">
                    <button 
                        onClick={() => setShowIOSInstructions(false)}
                        className="absolute top-3 right-3 text-slate-500 hover:text-white"
                    >
                        <X size={20} />
                    </button>
                    
                    <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                        <Download size={24} className="text-blue-500" />
                        {t('pwa.ios.title')}
                    </h3>
                    
                    <div className="space-y-4 text-slate-300">
                        <div className="flex items-center gap-4">
                            <div className="p-2 bg-slate-800 rounded-lg">
                                <Share size={24} className="text-blue-400" />
                            </div>
                            <span>1. {t('pwa.ios.step1')}</span>
                        </div>
                        <div className="w-px h-6 bg-slate-700 ml-5"></div>
                        <div className="flex items-center gap-4">
                            <div className="p-2 bg-slate-800 rounded-lg">
                                <PlusSquare size={24} className="text-slate-200" />
                            </div>
                            <span>2. {t('pwa.ios.step2')}</span>
                        </div>
                        <div className="w-px h-6 bg-slate-700 ml-5"></div>
                         <div className="flex items-center gap-4">
                            <span className="text-sm font-bold bg-slate-800 px-3 py-1 rounded text-blue-400">Add</span>
                            <span>3. {t('pwa.ios.step3')}</span>
                        </div>
                    </div>
                </div>
            </div>
        )}
    </>
  );
};

export default PWAInstallPrompt;
