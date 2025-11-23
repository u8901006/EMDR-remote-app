import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, Send, AlertCircle, FileText, User, X } from 'lucide-react';
import { ChatMessage } from '../types';
import { generateAssistantResponse, suggestGroundingTechnique } from '../services/gemini';

const AIAssistant: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [inputMode, setInputMode] = useState<'chat' | 'grounding'>('chat');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'model',
      text: 'Hello. I can assist with grounding scripts, session notes, or resource installation ideas. How can I help?',
      timestamp: new Date()
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) scrollToBottom();
  }, [messages, isOpen]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userText = input;
    setInput(''); // Clear input immediately
    setIsLoading(true);

    if (inputMode === 'grounding') {
        // Handle Grounding Request
        const userMsg: ChatMessage = {
            id: Date.now().toString(),
            role: 'user',
            text: `Request: Grounding technique for "${userText}"`,
            timestamp: new Date()
        };
        setMessages(prev => [...prev, userMsg]);

        // Use the specialized service with the user's description
        const responseText = await suggestGroundingTechnique(userText);

        const aiMsg: ChatMessage = {
            id: (Date.now() + 1).toString(),
            role: 'model',
            text: responseText,
            timestamp: new Date()
        };
        setMessages(prev => [...prev, aiMsg]);
        setInputMode('chat'); // Return to normal chat mode
    } else {
        // Handle Normal Chat
        const userMsg: ChatMessage = {
            id: Date.now().toString(),
            role: 'user',
            text: userText,
            timestamp: new Date()
        };
        setMessages(prev => [...prev, userMsg]);

        const responseText = await generateAssistantResponse(userText, messages);

        const aiMsg: ChatMessage = {
            id: (Date.now() + 1).toString(),
            role: 'model',
            text: responseText,
            timestamp: new Date()
        };
        setMessages(prev => [...prev, aiMsg]);
    }
    
    setIsLoading(false);
  };

  const handleQuickAction = async (action: 'grounding' | 'safe_place') => {
    if (action === 'grounding') {
        setInputMode('grounding');
        setInput('');
        // Note: We rely on the UI change to prompt the user for input now
    } else if (action === 'safe_place') {
        setInput("Give me a script for establishing a Safe/Calm Place resource.");
        setInputMode('chat');
    }
  };

  return (
    <div className={`fixed bottom-4 right-4 z-50 flex flex-col items-end transition-all duration-300 ${isOpen ? 'w-96' : 'w-auto'}`}>
      {isOpen && (
        <div className="bg-slate-900 border border-slate-700 rounded-lg shadow-2xl w-full mb-4 flex flex-col overflow-hidden h-[500px]">
          <div className="bg-slate-800 p-3 border-b border-slate-700 flex justify-between items-center">
            <h3 className="text-white font-medium flex items-center gap-2">
              <Sparkles size={16} className="text-blue-400" />
              AI Clinical Assistant
            </h3>
            <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white">&times;</button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-900">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] p-3 rounded-lg text-sm leading-relaxed ${
                  msg.role === 'user' 
                    ? 'bg-blue-600 text-white rounded-br-none' 
                    : 'bg-slate-800 text-slate-200 rounded-bl-none border border-slate-700'
                }`}>
                  {msg.text}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-slate-800 p-3 rounded-lg rounded-bl-none border border-slate-700">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-slate-500 rounded-full animate-bounce"></span>
                    <span className="w-2 h-2 bg-slate-500 rounded-full animate-bounce delay-75"></span>
                    <span className="w-2 h-2 bg-slate-500 rounded-full animate-bounce delay-150"></span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="bg-slate-800 border-t border-slate-700">
             {/* Context Indicator for Grounding Mode */}
             {inputMode === 'grounding' && (
                <div className="flex items-center justify-between px-3 py-2 bg-blue-900/30 border-b border-slate-700 text-xs text-blue-300">
                    <span className="font-medium">Describing Client State...</span>
                    <button 
                        onClick={() => { setInputMode('chat'); setInput(''); }} 
                        className="text-slate-400 hover:text-white flex items-center gap-1"
                    >
                        Cancel <X size={12} />
                    </button>
                </div>
            )}

            <div className="p-2">
                <div className="flex gap-2 mb-2 overflow-x-auto pb-1 no-scrollbar">
                <button 
                    onClick={() => handleQuickAction('grounding')}
                    className={`px-3 py-1 text-xs rounded-full whitespace-nowrap flex items-center gap-1 transition-colors ${inputMode === 'grounding' ? 'bg-blue-600 text-white' : 'bg-slate-700 hover:bg-slate-600 text-slate-200'}`}
                >
                    <AlertCircle size={12} /> Grounding
                </button>
                <button 
                    onClick={() => handleQuickAction('safe_place')}
                    className="px-3 py-1 text-xs bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-full whitespace-nowrap flex items-center gap-1 transition-colors"
                >
                    <User size={12} /> Safe Place
                </button>
                <button 
                    onClick={() => setInput("Summarize the key themes from a session focusing on childhood trauma.")}
                    className="px-3 py-1 text-xs bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-full whitespace-nowrap flex items-center gap-1 transition-colors"
                >
                    <FileText size={12} /> Note Template
                </button>
                </div>
                <div className="flex gap-2">
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    placeholder={inputMode === 'grounding' ? "e.g., Hyperarousal, Freezing, Panic..." : "Ask for scripts, suggestions..."}
                    className="flex-1 bg-slate-950 border border-slate-700 text-white text-sm rounded-md px-3 py-2 focus:outline-none focus:border-blue-500"
                    autoFocus={inputMode === 'grounding'}
                />
                <button 
                    onClick={handleSend}
                    disabled={isLoading || !input.trim()}
                    className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-md transition-colors disabled:opacity-50"
                >
                    <Send size={16} />
                </button>
                </div>
            </div>
          </div>
        </div>
      )}
      
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-blue-600 hover:bg-blue-500 text-white p-4 rounded-full shadow-lg transition-transform hover:scale-105 flex items-center gap-2 font-medium"
      >
        {isOpen ? (
            <>Close Assistant</>
        ) : (
            <>
                <Sparkles size={20} />
                AI Assistant
            </>
        )}
      </button>
    </div>
  );
};

export default AIAssistant;