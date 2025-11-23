import React, { useEffect, useRef, useState } from 'react';
import { Room, RoomEvent, VideoPresets, Track, RemoteTrack, RemoteTrackPublication, ConnectionQuality, Participant, LocalVideoTrack, LocalTrackPublication } from 'livekit-client';
import { Video, VideoOff, Mic, MicOff, Loader2, WifiOff, Signal, SignalHigh, SignalMedium, SignalLow, AlertCircle } from 'lucide-react';

interface LiveVideoProps {
  url: string;
  token: string;
  role: 'THERAPIST' | 'CLIENT';
  className?: string;
}

// Helper for rendering signal bars
const QualityIndicator: React.FC<{ quality: ConnectionQuality }> = ({ quality }) => {
  let color = 'text-slate-500';
  let Icon = Signal;

  switch (quality) {
    case ConnectionQuality.Excellent:
      color = 'text-green-500';
      Icon = SignalHigh;
      break;
    case ConnectionQuality.Good:
      color = 'text-green-400'; // Slightly lighter green
      Icon = SignalMedium;
      break;
    case ConnectionQuality.Poor:
      color = 'text-yellow-500';
      Icon = SignalLow;
      break;
    case ConnectionQuality.Lost:
      color = 'text-red-500';
      Icon = Signal; 
      break;
    default:
      color = 'text-slate-600';
      Icon = SignalLow;
  }

  return <Icon size={14} className={color} />;
};

const LiveVideo: React.FC<LiveVideoProps> = ({ url, token, role, className }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [remoteVideoTrack, setRemoteVideoTrack] = useState<Track | null>(null);
  const [localVideoTrack, setLocalVideoTrack] = useState<LocalVideoTrack | null>(null);

  // Track connection quality
  const [quality, setQuality] = useState<ConnectionQuality>(ConnectionQuality.Unknown);
  
  // Local State for Controls
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCamOn, setIsCamOn] = useState(true);

  // Keep track of the remote participant to filter quality events
  const remoteParticipantRef = useRef<Participant | null>(null);

  const roomRef = useRef<Room | null>(null);
  const videoElRef = useRef<HTMLVideoElement>(null);
  const localVideoElRef = useRef<HTMLVideoElement>(null);
  
  // Track mount state
  const isMountedRef = useRef(false);

  useEffect(() => {
    isMountedRef.current = true;

    // 1. Basic Input Validation
    if (!url || !token) return;

    // 2. Protocol Validation
    if (!url.startsWith('wss://') && !url.startsWith('ws://') && !url.startsWith('https://') && !url.startsWith('http://')) {
        setError("Invalid Server URL.");
        return;
    }

    // 3. Token Sanity Check
    if (token.length < 20) {
        setError("Token invalid.");
        return;
    }

    const connectToRoom = async () => {
      try {
        setError(null);
        
        if (roomRef.current && roomRef.current.state === 'connected') {
            await roomRef.current.disconnect();
        }

        const room = new Room({
          adaptiveStream: true,
          dynacast: true,
          videoCaptureDefaults: {
            resolution: VideoPresets.h540.resolution,
          },
          publishDefaults: {
            simulcast: true,
          }
        });
        roomRef.current = room;

        // --- Event Listeners ---
        room.on(RoomEvent.TrackSubscribed, (track: RemoteTrack, publication: RemoteTrackPublication, participant) => {
          if (!isMountedRef.current) return;
          if (track.kind === Track.Kind.Video) {
            setRemoteVideoTrack(track);
            remoteParticipantRef.current = participant;
            setQuality(participant.connectionQuality);
          }
          if (track.kind === Track.Kind.Audio) {
             const el = track.attach();
             document.body.appendChild(el);
           }
        });

        room.on(RoomEvent.TrackUnsubscribed, (track, publication, participant) => {
          if (!isMountedRef.current) return;
          if (track.kind === Track.Kind.Video) {
            setRemoteVideoTrack(null);
            if (remoteParticipantRef.current === participant) {
                remoteParticipantRef.current = null;
                setQuality(ConnectionQuality.Unknown);
            }
          }
        });

        room.on(RoomEvent.LocalTrackPublished, (pub: LocalTrackPublication) => {
            if (!isMountedRef.current) return;
            if (pub.track && pub.kind === Track.Kind.Video) {
                setLocalVideoTrack(pub.track as LocalVideoTrack);
            }
        });

        room.on(RoomEvent.LocalTrackUnpublished, (pub: LocalTrackPublication) => {
             if (!isMountedRef.current) return;
             if (pub.kind === Track.Kind.Video) {
                 setLocalVideoTrack(null);
             }
        });

        room.on(RoomEvent.ConnectionQualityChanged, (q: ConnectionQuality, p: Participant) => {
            if (!isMountedRef.current) return;
            if (role === 'THERAPIST') {
                if (p === remoteParticipantRef.current) setQuality(q);
            } else if (role === 'CLIENT') {
                // For client, we can show their own quality or the therapist's. 
                // Showing local quality is usually more useful for debugging connection issues.
                if (p === room.localParticipant) setQuality(q);
            }
        });

        room.on(RoomEvent.Disconnected, () => {
            if (!isMountedRef.current) return;
            setIsConnected(false);
            setRemoteVideoTrack(null);
            setLocalVideoTrack(null);
            remoteParticipantRef.current = null;
            setQuality(ConnectionQuality.Unknown);
        });

        // --- Connection ---
        await room.connect(url, token);
        
        if (!isMountedRef.current) {
            await room.disconnect();
            return;
        }

        setIsConnected(true);
        console.log('Connected to LiveKit Room');

        // Initial quality for client
        if (role === 'CLIENT') {
            setQuality(room.localParticipant.connectionQuality);
        }

        // --- Publishing ---
        await room.localParticipant.enableCameraAndMicrophone();
        
        if (isMountedRef.current) {
            setIsMicOn(room.localParticipant.isMicrophoneEnabled);
            setIsCamOn(room.localParticipant.isCameraEnabled);

            const videoPub = (Array.from(room.localParticipant.videoTrackPublications.values()) as LocalTrackPublication[])
                .find(p => p.kind === Track.Kind.Video);
            if (videoPub && videoPub.track) {
                setLocalVideoTrack(videoPub.track as LocalVideoTrack);
            }
        }

      } catch (e: any) {
        if (!isMountedRef.current) return;
        
        const msg = e.message || String(e);
        console.error("LiveKit Connection Error:", msg);
        
        if (msg.includes("Client initiated disconnect") || 
            msg.includes("signal request before connected") ||
            msg.includes("room connection has timed out")) {
             return;
        }

        if (msg.includes("invalid authorization token") || msg.includes("not authorized")) {
            setError("Token Expired/Invalid");
            return;
        }

        setError("Connection Failed");
      }
    };

    connectToRoom();

    return () => {
      isMountedRef.current = false;
      if (roomRef.current) {
        roomRef.current.disconnect().catch(() => {});
      }
    };
  }, [url, token, role]);

  // Attach Remote Track
  useEffect(() => {
    if (remoteVideoTrack && videoElRef.current) {
      remoteVideoTrack.attach(videoElRef.current);
    }
    return () => {
      if (remoteVideoTrack && videoElRef.current) {
        remoteVideoTrack.detach(videoElRef.current);
      }
    };
  }, [remoteVideoTrack]);

  // Attach Local Track
  useEffect(() => {
    if (localVideoTrack && localVideoElRef.current) {
        localVideoTrack.attach(localVideoElRef.current);
    }
    return () => {
        if (localVideoTrack && localVideoElRef.current) {
             localVideoTrack.detach(localVideoElRef.current);
        }
    };
  }, [localVideoTrack]);

  const toggleMic = async () => {
    if (!roomRef.current) return;
    const newState = !isMicOn;
    await roomRef.current.localParticipant.setMicrophoneEnabled(newState);
    setIsMicOn(newState);
  };

  const toggleCam = async () => {
    if (!roomRef.current) return;
    const newState = !isCamOn;
    await roomRef.current.localParticipant.setCameraEnabled(newState);
    setIsCamOn(newState);
  };

  if (!url || !token) {
    return null;
  }

  // Unified Render for both roles (with slightly different defaults if needed)
  return (
    <div className={`bg-slate-900 rounded-xl shadow-2xl border border-slate-700 overflow-hidden flex flex-col transition-all hover:scale-105 hover:shadow-blue-900/20 group z-30 ${className || 'absolute top-20 right-5 w-64'}`}>
       <div className="bg-slate-800 px-3 py-2 flex justify-between items-center border-b border-slate-700">
          <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
              <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  {role === 'THERAPIST' ? 'Client Video' : 'Therapist'}
              </span>
          </div>
          <div className="flex items-center gap-2">
              {isConnected && <QualityIndicator quality={quality} />}
              {!isConnected && <Loader2 size={12} className="animate-spin text-slate-500" />}
          </div>
       </div>

       <div className="relative aspect-video bg-black flex items-center justify-center group-hover:border-b group-hover:border-slate-700 transition-colors">
          {remoteVideoTrack ? (
             <video ref={videoElRef} className="w-full h-full object-cover" />
          ) : (
             <div className="text-slate-600 flex flex-col items-center gap-2 px-4 text-center">
                 {error ? <AlertCircle size={24} className="text-red-500" /> : <WifiOff size={24} />}
                 <span className="text-xs text-slate-500">
                     {error ? error : role === 'THERAPIST' ? 'Waiting for client...' : 'Waiting for therapist...'}
                 </span>
             </div>
          )}

          {/* Local Preview (PiP) */}
          {isConnected && localVideoTrack && (
              <div className="absolute bottom-2 right-2 w-20 h-16 bg-slate-950 border border-slate-700 rounded shadow-lg overflow-hidden z-10 hover:scale-110 transition-transform">
                  <video 
                    ref={localVideoElRef} 
                    className="w-full h-full object-cover opacity-90"
                    style={{ transform: 'scaleX(-1)' }} 
                  />
              </div>
          )}
       </div>

       {/* Controls Footer */}
       {isConnected && (
        <div className="bg-slate-900 p-2 flex justify-center gap-4 border-t border-slate-800">
            <button 
                onClick={toggleMic}
                className={`p-2 rounded-full transition-all transform hover:scale-110 ${isMicOn ? 'bg-slate-800 text-slate-400 hover:text-white' : 'bg-red-900/50 text-red-400 border border-red-500/30'}`}
                title={isMicOn ? "Mute Mic" : "Unmute Mic"}
            >
                {isMicOn ? <Mic size={16} /> : <MicOff size={16} />}
            </button>
            <button 
                onClick={toggleCam}
                className={`p-2 rounded-full transition-all transform hover:scale-110 ${isCamOn ? 'bg-slate-800 text-slate-400 hover:text-white' : 'bg-red-900/50 text-red-400 border border-red-500/30'}`}
                title={isCamOn ? "Stop Cam" : "Start Cam"}
            >
                {isCamOn ? <Video size={16} /> : <VideoOff size={16} />}
            </button>
        </div>
       )}
    </div>
  );
};

export default LiveVideo;