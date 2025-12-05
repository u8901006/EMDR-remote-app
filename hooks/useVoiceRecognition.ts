
import { useState, useEffect, useRef, useCallback } from 'react';
import { EMDRSettings, AIProvider, Language } from '../types';

// Web Speech API Definitions
interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onresult: (event: any) => void;
  onerror: (event: any) => void;
  onend: () => void;
}

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export const useVoiceRecognition = (language: Language, settings?: EMDRSettings) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  
  // Cloud: Web Speech API Refs
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  // Local: MediaRecorder Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const intervalRef = useRef<number | null>(null);

  // --- CLOUD: Web Speech API Logic ---
  const initWebSpeech = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = language === 'zh-TW' ? 'zh-TW' : 'en-US';

      recognition.onresult = (event: any) => {
        // Simple append logic for demo purposes
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const text = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
             setTranscript(prev => prev + text + (language === 'en' ? ' ' : '，'));
          }
        }
      };

      recognition.onerror = (event: any) => {
        console.error("Speech recognition error", event.error);
        if (event.error === 'not-allowed') setIsListening(false);
      };

      recognition.onend = () => {
         // Auto-restart if we think we are still listening (browser sometimes stops it)
         // For simplicity in this demo, we just update state
         if (isListening && settings?.aiProvider === AIProvider.CLOUD) {
             // Optional: recognition.start();
         } else {
             setIsListening(false);
         }
      };

      recognitionRef.current = recognition;
    }
  }, [language, settings?.aiProvider, isListening]);


  // --- LOCAL: Whisper Logic ---
  const sendAudioChunk = async (blob: Blob) => {
      if (!settings?.whisperUrl) return;
      
      const formData = new FormData();
      formData.append('file', blob, 'audio.webm');
      formData.append('model', 'whisper-1'); // Standard OpenAI format key
      formData.append('language', language === 'zh-TW' ? 'zh' : 'en');

      try {
          const res = await fetch(settings.whisperUrl, {
              method: 'POST',
              body: formData
          });
          const data = await res.json();
          if (data.text) {
              setTranscript(prev => prev + data.text.trim() + " ");
          }
      } catch (e) {
          console.error("Whisper Upload Error:", e);
      }
  };

  const startLocalRecording = async () => {
      try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          const mediaRecorder = new MediaRecorder(stream);
          mediaRecorderRef.current = mediaRecorder;

          mediaRecorder.ondataavailable = (e) => {
              if (e.data.size > 0) {
                  sendAudioChunk(e.data);
              }
          };

          mediaRecorder.start();
          setIsListening(true);

          // Chunk audio every 3 seconds for near real-time effect
          intervalRef.current = window.setInterval(() => {
              if (mediaRecorder.state === 'recording') {
                  mediaRecorder.stop();
                  mediaRecorder.start();
              }
          }, 3000);

      } catch (e) {
          console.error("Failed to start local recording", e);
          setIsListening(false);
      }
  };

  const stopLocalRecording = () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
          mediaRecorderRef.current.stop();
          mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop());
      }
      setIsListening(false);
  };


  // --- Unified Controls ---
  const startListening = useCallback(() => {
      if (settings?.aiProvider === AIProvider.LOCAL) {
          startLocalRecording();
      } else {
          // Default to Web Speech
          if (!recognitionRef.current) initWebSpeech();
          recognitionRef.current?.start();
          setIsListening(true);
      }
  }, [settings?.aiProvider, initWebSpeech]);

  const stopListening = useCallback(() => {
      if (settings?.aiProvider === AIProvider.LOCAL) {
          stopLocalRecording();
      } else {
          recognitionRef.current?.stop();
          setIsListening(false);
      }
  }, [settings?.aiProvider]);

  const resetTranscript = useCallback(() => setTranscript(''), []);

  // Init Web Speech on mount if needed
  useEffect(() => {
      initWebSpeech();
      return () => {
          recognitionRef.current?.stop();
          stopLocalRecording();
      };
  }, [initWebSpeech]);

  const hasBrowserSupport = !!(window.SpeechRecognition || window.webkitSpeechRecognition || navigator.mediaDevices?.getUserMedia);

  return {
    isListening,
    transcript,
    startListening,
    stopListening,
    resetTranscript,
    hasBrowserSupport
  };
};
