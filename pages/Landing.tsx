
import React from 'react';
import { Link } from 'react-router-dom';
import { Users, Monitor, Activity, Globe } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import PWAInstallPrompt from '../components/PWAInstallPrompt';

const Landing: React.FC = () => {
  const { t, language, setLanguage } = useLanguage();

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      
      {/* Background Decoration */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-900/20 rounded-full blur-3xl animate-pulse-slow"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-900/20 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '1.5s' }}></div>
      </div>

      <div className="z-10 max-w-5xl w-full text-center space-y-12">
        
        {/* Header with PWA Button */}
        <div className="relative">
             <div className="absolute top-0 right-0 hidden md:block">
                 <PWAInstallPrompt />
             </div>
             <h1 className="text-7xl md:text-8xl font-bold text-white mb-6 tracking-tight">MindSync <span className="text-blue-500">EMDR</span></h1>
             <p className="text-slate-400 text-3xl md:text-4xl">{t('app.subtitle')}</p>
             <div className="mt-4 md:hidden flex justify-center">
                 <PWAInstallPrompt />
             </div>
        </div>

        <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 p-8 rounded-2xl text-left shadow-2xl">
            <h3 className="text-white font-semibold mb-6 flex items-center gap-4 text-2xl md:text-3xl">
                <Activity size={32} className="text-blue-400"/> 
                {t('landing.howTo')}
            </h3>
            <ol className="list-decimal list-inside space-y-4 text-slate-300 text-xl md:text-2xl leading-relaxed">
                <li>{t('landing.step1')}</li>
                <li>{t('landing.step2')}</li>
                <li>{t('landing.step3')}</li>
                <li>{t('landing.step4')}</li>
                <li>{t('landing.step5')}</li>
            </ol>
            <div className="mt-8 p-5 bg-yellow-900/20 border border-yellow-700/30 rounded-xl text-yellow-200/80 text-lg md:text-xl">
                <strong>Note:</strong> This demo uses LiveKit for syncing. Use the tokens provided in your LiveKit dashboard to connect.
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full">
            <Link to="/therapist" className="group relative block p-10 bg-slate-900 border border-slate-700 rounded-3xl hover:border-blue-500 transition-all hover:shadow-lg hover:shadow-blue-500/20">
                <div className="flex flex-col items-center gap-6">
                    <div className="w-24 h-24 rounded-full bg-blue-900/50 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Monitor className="text-blue-400" size={48} />
                    </div>
                    <div className="text-center">
                        <h2 className="text-3xl md:text-4xl font-bold text-white">{t('role.therapist')}</h2>
                        <p className="text-slate-500 text-xl mt-3 leading-relaxed">{t('role.therapist.desc')}</p>
                    </div>
                </div>
            </Link>

            <Link to="/client" className="group relative block p-10 bg-slate-900 border border-slate-700 rounded-3xl hover:border-green-500 transition-all hover:shadow-lg hover:shadow-green-500/20">
                <div className="flex flex-col items-center gap-6">
                    <div className="w-24 h-24 rounded-full bg-green-900/50 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Users className="text-green-400" size={48} />
                    </div>
                    <div className="text-center">
                        <h2 className="text-3xl md:text-4xl font-bold text-white">{t('role.client')}</h2>
                        <p className="text-slate-500 text-xl mt-3 leading-relaxed">{t('role.client.desc')}</p>
                    </div>
                </div>
            </Link>
        </div>

        {/* Prominent Language Switcher at Bottom */}
        <div className="pt-8 pb-12">
            <button 
                onClick={() => setLanguage(language === 'en' ? 'zh-TW' : 'en')}
                className="flex items-center justify-center gap-5 px-10 py-6 bg-gradient-to-r from-slate-800 to-slate-700 hover:from-slate-700 hover:to-slate-600 text-white rounded-full shadow-xl border border-slate-600 transition-all transform hover:scale-105 active:scale-95 w-full md:w-auto mx-auto group"
            >
                <Globe size={36} className="text-blue-400 group-hover:rotate-12 transition-transform" />
                <div className="flex flex-col items-start gap-1">
                    <span className="text-xl font-bold uppercase tracking-wider text-slate-300">Language / 語言</span>
                    <span className="text-3xl font-bold text-white">
                        {language === 'en' ? 'Switch to 繁體中文' : 'Switch to English'}
                    </span>
                </div>
            </button>
        </div>
      </div>
      
      <footer className="absolute bottom-4 text-slate-600 text-lg">
        Powered by React, Tailwind, and Google Gemini
      </footer>
    </div>
  );
};

export default Landing;
