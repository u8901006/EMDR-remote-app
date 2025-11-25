import React from 'react';
import { Link } from 'react-router-dom';
import { Users, Monitor, Activity, Globe } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

const Landing: React.FC = () => {
  const { t, language, setLanguage } = useLanguage();

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      
      {/* Background Decoration */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-900/20 rounded-full blur-3xl animate-pulse-slow"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-900/20 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '1.5s' }}></div>
      </div>

      <div className="z-10 max-w-2xl w-full text-center space-y-8">
        <div>
            <h1 className="text-5xl font-bold text-white mb-2 tracking-tight">MindSync <span className="text-blue-500">EMDR</span></h1>
            <p className="text-slate-400 text-lg">{t('app.subtitle')}</p>
        </div>

        <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 p-6 rounded-xl text-left shadow-2xl">
            <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                <Activity size={18} className="text-blue-400"/> 
                {t('landing.howTo')}
            </h3>
            <ol className="list-decimal list-inside space-y-3 text-slate-300 text-sm">
                <li>{t('landing.step1')}</li>
                <li>{t('landing.step2')}</li>
                <li>{t('landing.step3')}</li>
                <li>{t('landing.step4')}</li>
                <li>{t('landing.step5')}</li>
            </ol>
            <div className="mt-4 p-3 bg-yellow-900/20 border border-yellow-700/30 rounded text-yellow-200/80 text-xs">
                <strong>Note:</strong> This demo uses LiveKit for syncing. Use the tokens provided in your LiveKit dashboard to connect.
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
            <Link to="/therapist" className="group relative block p-8 bg-slate-900 border border-slate-700 rounded-2xl hover:border-blue-500 transition-all hover:shadow-lg hover:shadow-blue-500/20">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-blue-900/50 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Monitor className="text-blue-400" size={32} />
                    </div>
                    <div className="text-center">
                        <h2 className="text-xl font-bold text-white">{t('role.therapist')}</h2>
                        <p className="text-slate-500 text-sm mt-1">{t('role.therapist.desc')}</p>
                    </div>
                </div>
            </Link>

            <Link to="/client" className="group relative block p-8 bg-slate-900 border border-slate-700 rounded-2xl hover:border-green-500 transition-all hover:shadow-lg hover:shadow-green-500/20">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-green-900/50 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Users className="text-green-400" size={32} />
                    </div>
                    <div className="text-center">
                        <h2 className="text-xl font-bold text-white">{t('role.client')}</h2>
                        <p className="text-slate-500 text-sm mt-1">{t('role.client.desc')}</p>
                    </div>
                </div>
            </Link>
        </div>

        {/* Prominent Language Switcher at Bottom */}
        <div className="pt-4 pb-8">
            <button 
                onClick={() => setLanguage(language === 'en' ? 'zh-TW' : 'en')}
                className="flex items-center justify-center gap-3 px-8 py-4 bg-gradient-to-r from-slate-800 to-slate-700 hover:from-slate-700 hover:to-slate-600 text-white rounded-full shadow-xl border border-slate-600 transition-all transform hover:scale-105 active:scale-95 w-full md:w-auto mx-auto group"
            >
                <Globe size={24} className="text-blue-400 group-hover:rotate-12 transition-transform" />
                <div className="flex flex-col items-start">
                    <span className="text-sm font-bold uppercase tracking-wider text-slate-300">Language / 語言</span>
                    <span className="text-lg font-bold text-white">
                        {language === 'en' ? 'Switch to 繁體中文' : 'Switch to English'}
                    </span>
                </div>
            </button>
        </div>
      </div>
      
      <footer className="absolute bottom-2 text-slate-600 text-xs">
        Powered by React, Tailwind, and Google Gemini
      </footer>
    </div>
  );
};

export default Landing;