import React, { useEffect, useRef, useState } from 'react';
import { RoomEvent, Track, RemoteTrack, RemoteTrackPublication, ConnectionQuality, Participant, LocalVideoTrack, LocalTrackPublication, RemoteParticipant } from 'livekit-client';
import { Video, VideoOff, Mic, MicOff, Loader2, WifiOff, Signal, SignalHigh, SignalMedium, SignalLow, AlertCircle, Maximize2, Minimize2, Eye, EyeOff } from 'lucide-react';
import { useLiveKitContext } from '../contexts/LiveKitContext';

interface LiveVideoProps {
  role: 'THERAPIST' | 'CLIENT';
  className?: string;
  isMaximized?: boolean;
  onToggleMaximize?: () => void;
}

const QualityIndicator: React.FC<{ quality: ConnectionQuality }> = ({ quality }) => {
  let color = 'text-slate-500';
  let Icon = Signal;

  switch (quality) {
    case ConnectionQuality.Excellent: color = 'text-green-500'; Icon = SignalHigh; break;
    case ConnectionQuality.Good: color = 'text-green-400'; Icon = SignalMedium; break;
    case ConnectionQuality.Poor: color = 'text-yellow-500'; Icon = SignalLow; break;
    case ConnectionQuality.Lost: color = 'text-red-500'; Icon = Signal; break;
    default: color = 'text-slate-600'; Icon = SignalLow;
  }
  return <Icon size={14} className={color} />;
};

const LiveVideo: React.FC<LiveVideoProps> = ({ role, className, isMaximized, onToggleMaximize }) => {
  const { room, isConnecting, error } = useLiveKitContext();
  
  const [remoteVideoTrack, setRemoteVideoTrack] = useState<Track | null>(null);
  const [localVideoTrack, setLocalVideoTrack] = useState<LocalVideoTrack | null>(null);
  const [quality, setQuality] = useState<ConnectionQuality>(ConnectionQuality.Unknown);
  
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCamOn, setIsCamOn] = useState(true);
  const [showSelfView, setShowSelfView] = useState(true);

  const videoElRef = useRef<HTMLVideoElement>(null);
  const localVideoElRef = useRef<HTMLVideoElement>(null);
  const remoteParticipantRef = useRef<Participant | null>(null);

  // Helper to attach tracks safely
  const attachTrack = (track: Track, element: HTMLVideoElement | null) => {
    if (track && element) track.attach(element);
  };
  
  const detachTrack = (track: Track | null, element: HTMLVideoElement | null) => {
    if (track && element) track.detach(element);
  };

  useEffect(() => {
    if (!room) {
        // Reset state if disconnected
        setRemoteVideoTrack(null);
        setLocalVideoTrack(null);
        return;
    }

    // --- Init Logic ---
    const init = async () => {
        // 1. Publish Local
        try {
            await room.localParticipant.enableCameraAndMicrophone();
            setIsMicOn(room.localParticipant.isMicrophoneEnabled);
            setIsCamOn(room.localParticipant.isCameraEnabled);
            
            const videoPub = (Array.from(room.localParticipant.videoTrackPublications.values()) as LocalTrackPublication[])
                .find(p => p.kind === Track.Kind.Video);
            if (videoPub?.track) setLocalVideoTrack(videoPub.track as LocalVideoTrack);

        } catch (e) {
            console.error("Failed to enable local media", e);
        }

        // 2. Check Existing Remote Participants (if late join)
        for (const p of Array.from(room.remoteParticipants.values()) as RemoteParticipant[]) {
            remoteParticipantRef.current = p;
            const vid = (Array.from(p.videoTrackPublications.values()) as RemoteTrackPublication[]).find(pub => pub.track);
            if (vid?.track) setRemoteVideoTrack(vid.track);
        }
    };
    init();

    // --- Event Listeners ---
    const onTrackSubscribed = (track: RemoteTrack, pub: RemoteTrackPublication, participant: Participant) => {
        if (track.kind === Track.Kind.Video) {
            setRemoteVideoTrack(track);
            remoteParticipantRef.current = participant;
            setQuality(participant.connectionQuality);
        }
        if (track.kind === Track.Kind.Audio) {
            const el = track.attach();
            document.body.appendChild(el);
        }
    };

    const onTrackUnsubscribed = (track: RemoteTrack, pub: RemoteTrackPublication, participant: Participant) => {
        if (track.kind === Track.Kind.Video) {
            setRemoteVideoTrack(null);
            if (remoteParticipantRef.current === participant) remoteParticipantRef.current = null;
        }
        if (track.kind === Track.Kind.Audio) {
            track.detach().forEach(el => el.remove());
        }
    };

    const onLocalTrackPublished = (pub: LocalTrackPublication) => {
        if (pub.kind === Track.Kind.Video && pub.track) {
            setLocalVideoTrack(pub.track as LocalVideoTrack);
        }
    };

    const onLocalTrackUnpublished = (pub: LocalTrackPublication) => {
        if (pub.kind === Track.Kind.Video) {
            setLocalVideoTrack(null);
        }
    };

    const onQualityChanged = (q: ConnectionQuality, p: Participant) => {
        if (role === 'THERAPIST' && p === remoteParticipantRef.current) setQuality(q);
        if (role === 'CLIENT' && p === room.localParticipant) setQuality(q);
    };

    room.on(RoomEvent.TrackSubscribed, onTrackSubscribed);
    room.on(RoomEvent.TrackUnsubscribed, onTrackUnsubscribed);
    room.on(RoomEvent.LocalTrackPublished, onLocalTrackPublished);
    room.on(RoomEvent.LocalTrackUnpublished, onLocalTrackUnpublished);
    room.on(RoomEvent.ConnectionQualityChanged, onQualityChanged);

    return () => {
        room.off(RoomEvent.TrackSubscribed, onTrackSubscribed);
        room.off(RoomEvent.TrackUnsubscribed, onTrackUnsubscribed);
        room.off(RoomEvent.LocalTrackPublished, onLocalTrackPublished);
        room.off(RoomEvent.LocalTrackUnpublished, onLocalTrackUnpublished);
        room.off(RoomEvent.ConnectionQualityChanged, onQualityChanged);
    };
  }, [room, role]);

  // DOM Attachment
  useEffect(() => {
    attachTrack(remoteVideoTrack as Track, videoElRef.current);
    return () => detachTrack(remoteVideoTrack as Track, videoElRef.current);
  }, [remoteVideoTrack]);

  useEffect(() => {
    attachTrack(localVideoTrack as Track, localVideoElRef.current);
    return () => detachTrack(localVideoTrack as Track, localVideoElRef.current);
  }, [localVideoTrack]);

  // Toggles
  const toggleMic = async () => {
    if (!room) return;
    const newState = !isMicOn;
    await room.localParticipant.setMicrophoneEnabled(newState);
    setIsMicOn(newState);
  };

  const toggleCam = async () => {
    if (!room) return;
    const newState = !isCamOn;
    await room.localParticipant.setCameraEnabled(newState);
    setIsCamOn(newState);
  };

  // Render
  return (
    <div className={`bg-slate-900 rounded-xl shadow-2xl border border-slate-700 overflow-hidden flex flex-col transition-all group z-30 ${className}`}>
       
       {/* Header */}
       <div className="bg-slate-800 px-3 py-2 flex justify-between items-center border-b border-slate-700">
          <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${room ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
              <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  {role === 'THERAPIST' ? 'Client' : 'Therapist'}
              </span>
          </div>
          <div className="flex items-center gap-2">
              {room && <QualityIndicator quality={quality} />}
              {onToggleMaximize && (
                <button 
                  onClick={onToggleMaximize}
                  className="text-slate-400 hover:text-white"
                  title={isMaximized ? "Minimize" : "Maximize"}
                >
                  {isMaximized ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                </button>
              )}
          </div>
       </div>

       {/* Video */}
       <div className="relative flex-1 bg-black flex items-center justify-center group-hover:border-b group-hover:border-slate-700 transition-colors min-h-[150px]">
          {remoteVideoTrack ? (
             <video ref={videoElRef} className="w-full h-full object-cover" />
          ) : (
             <div className="text-slate-600 flex flex-col items-center gap-2 px-4 text-center">
                 {error ? <AlertCircle size={24} className="text-red-500" /> : isConnecting ? <Loader2 size={24} className="animate-spin" /> : <WifiOff size={24} />}
                 <span className="text-xs text-slate-500">
                     {error ? 'Connect Error' : isConnecting ? 'Connecting...' : !room ? 'Disconnected' : 'Waiting...'}
                 </span>
             </div>
          )}

          {/* Self View */}
          {room && isCamOn && showSelfView && (
              <div className="absolute bottom-2 right-2 w-20 h-16 bg-slate-950 border border-slate-700 rounded shadow-lg overflow-hidden z-10 hover:scale-110 transition-transform">
                  <video 
                    ref={localVideoElRef} 
                    className="w-full h-full object-cover opacity-90"
                    style={{ transform: 'scaleX(-1)' }} 
                  />
              </div>
          )}
       </div>

       {/* Footer Controls */}
       {room && (
        <div className="bg-slate-900 p-2 flex justify-center gap-4 border-t border-slate-800">
            <button onClick={toggleMic} className={`p-2 rounded-full ${isMicOn ? 'text-slate-400 hover:bg-slate-800' : 'bg-red-900/50 text-red-400'}`}>
                {isMicOn ? <Mic size={16} /> : <MicOff size={16} />}
            </button>
            <button onClick={toggleCam} className={`p-2 rounded-full ${isCamOn ? 'text-slate-400 hover:bg-slate-800' : 'bg-red-900/50 text-red-400'}`}>
                {isCamOn ? <Video size={16} /> : <VideoOff size={16} />}
            </button>
            <button onClick={() => setShowSelfView(!showSelfView)} className={`p-2 rounded-full ${showSelfView ? 'text-blue-400' : 'text-slate-600'}`}>
                {showSelfView ? <Eye size={16} /> : <EyeOff size={16} />}
            </button>
        </div>
       )}
    </div>
  );
};

export default LiveVideo;