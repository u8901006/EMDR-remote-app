import React from 'react';
import { Link } from 'react-router-dom';
import { Users, Monitor, Activity } from 'lucide-react';

const Landing: React.FC = () => {
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
            <p className="text-slate-400 text-lg">Remote Bilateral Stimulation Platform</p>
        </div>

        <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 p-6 rounded-xl text-left shadow-2xl">
            <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                <Activity size={18} className="text-blue-400"/> 
                How to use for Remote Sessions
            </h3>
            <ol className="list-decimal list-inside space-y-3 text-slate-300 text-sm">
                <li>Open this application in your browser (Chrome/Firefox/Edge).</li>
                <li>Send the URL to your client (or open a second tab to test).</li>
                <li>Select <strong className="text-blue-400">Therapist</strong> on your screen.</li>
                <li>Instruct the client to select <strong className="text-green-400">Client</strong> on their screen.</li>
                <li>The session is now synchronized via a secure local broadcast channel (same device) or you would use a shared link (simulated here).</li>
            </ol>
            <div className="mt-4 p-3 bg-yellow-900/20 border border-yellow-700/30 rounded text-yellow-200/80 text-xs">
                <strong>Note:</strong> This demo uses the <code>BroadcastChannel API</code>. To test the remote sync, open two tabs of this page in the <strong>same browser</strong>. One as Therapist, one as Client.
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
            <Link to="/therapist" className="group relative block p-8 bg-slate-900 border border-slate-700 rounded-2xl hover:border-blue-500 transition-all hover:shadow-lg hover:shadow-blue-500/20">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-blue-900/50 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Monitor className="text-blue-400" size={32} />
                    </div>
                    <div className="text-center">
                        <h2 className="text-xl font-bold text-white">Therapist Portal</h2>
                        <p className="text-slate-500 text-sm mt-1">Control session parameters, access AI tools, and monitor settings.</p>
                    </div>
                </div>
            </Link>

            <Link to="/client" className="group relative block p-8 bg-slate-900 border border-slate-700 rounded-2xl hover:border-green-500 transition-all hover:shadow-lg hover:shadow-green-500/20">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-green-900/50 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Users className="text-green-400" size={32} />
                    </div>
                    <div className="text-center">
                        <h2 className="text-xl font-bold text-white">Client View</h2>
                        <p className="text-slate-500 text-sm mt-1">Enter fullscreen distraction-free mode for processing.</p>
                    </div>
                </div>
            </Link>
        </div>
      </div>
      
      <footer className="absolute bottom-4 text-slate-600 text-xs">
        Powered by React, Tailwind, and Google Gemini
      </footer>
    </div>
  );
};

export default Landing;