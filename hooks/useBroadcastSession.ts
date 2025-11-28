

import { useState, useEffect, useCallback, useRef } from 'react';
import { EMDRSettings, SessionMessage, ClientStatus, SessionMetric, MetricType, WaitingClient } from '../types';
import { DEFAULT_SETTINGS } from '../constants';
import { useLiveKitContext } from '../contexts/LiveKitContext';
import { RoomEvent, DataPacket_Kind, Participant } from 'livekit-client';

export const useBroadcastSession = (role: 'THERAPIST' | 'CLIENT') => {
  const { room } = useLiveKitContext();
  const [settings, setSettings] = useState<EMDRSettings>(DEFAULT_SETTINGS);
  const [clientStatus, setClientStatus] = useState<ClientStatus | null>(null);
  
  // Clinical Metrics State
  const [metrics, setMetrics] = useState<SessionMetric[]>([]);
  const [pendingMetricRequest, setPendingMetricRequest] = useState<MetricType | null>(null);

  // Waiting Room State
  const [waitingClients, setWaitingClients] = useState<WaitingClient[]>([]);
  const [isAdmitted, setIsAdmitted] = useState(false);

  // Refs to handle stale closures in event listeners
  const settingsRef = useRef<EMDRSettings>(settings);

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  // Data Packet Listener
  useEffect(() => {
    if (!room) return;

    const handleData = (payload: Uint8Array, participant?: Participant, kind?: DataPacket_Kind, topic?: string) => {
      try {
        const str = new TextDecoder().decode(payload);
        const message = JSON.parse(str) as SessionMessage;

        if (message.type === 'SYNC_SETTINGS' && message.payload) {
          if (role === 'CLIENT' && isAdmitted) {
             setSettings(prev => ({ ...prev, ...message.payload }));
          }
        } else if (message.type === 'REQUEST_SYNC' && role === 'THERAPIST') {
          // Only sync if client is admitted? For simplicity, we just sync settings.
          // In strict mode, we might check if participant.sid is in an 'admitted' list.
          sendData({
            type: 'SYNC_SETTINGS',
            payload: settingsRef.current,
            timestamp: Date.now()
          });
        } else if (message.type === 'CLIENT_STATUS' && role === 'THERAPIST' && message.clientStatus) {
          setClientStatus(message.clientStatus);
        } else if (message.type === 'REQUEST_METRIC' && role === 'CLIENT' && message.metricType && isAdmitted) {
            setPendingMetricRequest(message.metricType);
        } else if (message.type === 'SUBMIT_METRIC' && role === 'THERAPIST' && message.metric) {
            setMetrics(prev => [...prev, message.metric!]);
        } else if (message.type === 'JOIN_REQUEST' && role === 'THERAPIST' && participant) {
            setWaitingClients(prev => {
                if (prev.find(c => c.sid === participant.sid)) return prev;
                return [...prev, {
                    sid: participant.sid,
                    identity: participant.identity || 'Unknown',
                    joinedAt: Date.now()
                }];
            });
        } else if (message.type === 'ADMIT_CLIENT' && role === 'CLIENT') {
             setIsAdmitted(true);
             // Request immediate sync upon admission
             setTimeout(() => {
                sendData({ type: 'REQUEST_SYNC', timestamp: Date.now() });
             }, 100);
        }
      } catch (e) {
        console.error("Failed to parse data packet:", e);
      }
    };

    const handleParticipantDisconnected = (p: Participant) => {
        if (role === 'THERAPIST') {
            setWaitingClients(prev => prev.filter(c => c.sid !== p.sid));
        }
    };

    room.on(RoomEvent.DataReceived, handleData);
    room.on(RoomEvent.ParticipantDisconnected, handleParticipantDisconnected);

    // If Client, send Join Request immediately
    let joinInterval: any;
    if (role === 'CLIENT') {
       // Reset admission state on new room connection
       setIsAdmitted(false);
       
       // Send join request periodically until admitted
       const sendJoin = () => {
           if (!isAdmitted && room.state === 'connected') {
               sendData({ type: 'JOIN_REQUEST', timestamp: Date.now() });
           }
       };
       
       // Initial attempt
       setTimeout(sendJoin, 500);
       joinInterval = setInterval(sendJoin, 3000);
    }

    return () => {
      room.off(RoomEvent.DataReceived, handleData);
      room.off(RoomEvent.ParticipantDisconnected, handleParticipantDisconnected);
      if (joinInterval) clearInterval(joinInterval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room, role, isAdmitted]);

  // Helper to send data via LiveKit
  const sendData = (message: SessionMessage, reliable: boolean = true, destinationSids?: string[]) => {
    if (!room) return;
    const str = JSON.stringify(message);
    const data = new TextEncoder().encode(str);
    
    room.localParticipant.publishData(data, { reliable, destinationSids });
  };

  // Function for Therapist to update and broadcast settings
  const updateSettings = useCallback((newSettings: Partial<EMDRSettings>) => {
    setSettings(prev => {
      const updated = { ...prev, ...newSettings };
      
      if (role === 'THERAPIST' && room) {
        sendData({
          type: 'SYNC_SETTINGS',
          payload: updated,
          timestamp: Date.now()
        }, true);
      }
      return updated;
    });
  }, [role, room]);

  // Auto-stop logic for Therapist
  useEffect(() => {
    let timeoutId: number;
    if (role === 'THERAPIST' && settings.isPlaying && settings.durationSeconds > 0) {
      timeoutId = window.setTimeout(() => {
        updateSettings({ isPlaying: false });
      }, settings.durationSeconds * 1000);
    }
    return () => {
      if (timeoutId) window.clearTimeout(timeoutId);
    };
  }, [role, settings.isPlaying, settings.durationSeconds, updateSettings]);

  // Function for Client to broadcast status
  const sendClientStatus = useCallback((status: ClientStatus) => {
    if (role === 'CLIENT' && room && isAdmitted) {
        sendData({
            type: 'CLIENT_STATUS',
            clientStatus: status,
            timestamp: Date.now()
        }, false);
    }
  }, [role, room, isAdmitted]);

  // --- Metric Logic ---
  const requestMetric = useCallback((type: MetricType) => {
      if (role === 'THERAPIST' && room) {
          sendData({
              type: 'REQUEST_METRIC',
              metricType: type,
              timestamp: Date.now()
          }, true);
      }
  }, [role, room]);

  const submitMetric = useCallback((value: number) => {
      if (role === 'CLIENT' && room && pendingMetricRequest) {
          const metric: SessionMetric = {
              id: Date.now().toString(),
              type: pendingMetricRequest,
              value,
              timestamp: Date.now()
          };
          sendData({
              type: 'SUBMIT_METRIC',
              metric,
              timestamp: Date.now()
          }, true);
          setPendingMetricRequest(null);
      }
  }, [role, room, pendingMetricRequest]);

  // --- Waiting Room Logic (Therapist) ---
  const admitClient = useCallback((sid: string) => {
      if (role === 'THERAPIST' && room) {
          sendData({
              type: 'ADMIT_CLIENT',
              timestamp: Date.now()
          }, true, [sid]); // Direct message to specific client
          
          setWaitingClients(prev => prev.filter(c => c.sid !== sid));
      }
  }, [role, room]);

  return { 
      settings, 
      updateSettings, 
      clientStatus, 
      sendClientStatus,
      metrics,
      pendingMetricRequest,
      setPendingMetricRequest,
      requestMetric,
      submitMetric,
      waitingClients,
      admitClient,
      isAdmitted
  };
};