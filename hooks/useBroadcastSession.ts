import { useState, useEffect, useCallback, useRef } from 'react';
import { EMDRSettings, SessionMessage, ClientStatus } from '../types';
import { DEFAULT_SETTINGS } from '../constants';
import { useLiveKitContext } from '../contexts/LiveKitContext';
import { RoomEvent, DataPacket_Kind, Participant } from 'livekit-client';

export const useBroadcastSession = (role: 'THERAPIST' | 'CLIENT') => {
  const { room } = useLiveKitContext();
  const [settings, setSettings] = useState<EMDRSettings>(DEFAULT_SETTINGS);
  const [clientStatus, setClientStatus] = useState<ClientStatus | null>(null);
  
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
          if (role === 'CLIENT') {
             // console.log("Received Settings Sync:", message.payload);
             setSettings(prev => ({ ...prev, ...message.payload }));
          }
        } else if (message.type === 'REQUEST_SYNC' && role === 'THERAPIST') {
          console.log("Client requested sync. Sending current state...");
          sendData({
            type: 'SYNC_SETTINGS',
            payload: settingsRef.current,
            timestamp: Date.now()
          });
        } else if (message.type === 'CLIENT_STATUS' && role === 'THERAPIST' && message.clientStatus) {
          setClientStatus(message.clientStatus);
        }
      } catch (e) {
        console.error("Failed to parse data packet:", e);
      }
    };

    room.on(RoomEvent.DataReceived, handleData);

    // If Client, request sync immediately upon connection
    if (role === 'CLIENT') {
       // Allow a brief moment for connection stability before requesting
       setTimeout(() => {
           sendData({ type: 'REQUEST_SYNC', timestamp: Date.now() });
       }, 500);
    }

    return () => {
      room.off(RoomEvent.DataReceived, handleData);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room, role]);

  // Helper to send data via LiveKit
  // reliable: true (TCP-like) for critical settings
  // reliable: false (UDP-like) for high-frequency sensor data
  const sendData = (message: SessionMessage, reliable: boolean = true) => {
    if (!room) return;
    const str = JSON.stringify(message);
    const data = new TextEncoder().encode(str);
    
    room.localParticipant.publishData(data, { reliable });
  };

  // Function for Therapist to update and broadcast settings
  const updateSettings = useCallback((newSettings: Partial<EMDRSettings>) => {
    setSettings(prev => {
      const updated = { ...prev, ...newSettings };
      
      // Update local state immediately. 
      // If connected, broadcast to others using RELIABLE transmission (Settings are critical).
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
    if (role === 'CLIENT' && room) {
        // Use UNRELIABLE transmission for sensor data to prevent head-of-line blocking
        // and reduce latency for real-time monitoring.
        sendData({
            type: 'CLIENT_STATUS',
            clientStatus: status,
            timestamp: Date.now()
        }, false);
    }
  }, [role, room]);

  return { settings, updateSettings, clientStatus, sendClientStatus };
};