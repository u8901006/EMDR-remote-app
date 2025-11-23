import { useState, useEffect, useCallback, useRef } from 'react';
import { EMDRSettings, SessionMessage, ClientStatus } from '../types';
import { DEFAULT_SETTINGS, BROADCAST_CHANNEL_NAME } from '../constants';

export const useBroadcastSession = (role: 'THERAPIST' | 'CLIENT') => {
  const [settings, setSettings] = useState<EMDRSettings>(DEFAULT_SETTINGS);
  const [clientStatus, setClientStatus] = useState<ClientStatus | null>(null);
  const channelRef = useRef<BroadcastChannel | null>(null);
  const settingsRef = useRef<EMDRSettings>(settings);

  // Keep ref in sync with state to avoid stale closures in event listeners
  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  // Initialize BroadcastChannel
  useEffect(() => {
    const channel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
    channelRef.current = channel;

    channel.onmessage = (event: MessageEvent<SessionMessage>) => {
      const { type, payload, clientStatus: statusPayload } = event.data;
      
      if (type === 'SYNC_SETTINGS' && payload) {
        // If we are client, we blindly accept settings
        if (role === 'CLIENT') {
            setSettings(prev => ({ ...prev, ...payload }));
        }
      } else if (type === 'REQUEST_SYNC' && role === 'THERAPIST') {
        // A new client joined and wants the current state
        // Use ref to get the absolute latest settings, avoiding closure staleness
        channel.postMessage({
          type: 'SYNC_SETTINGS',
          payload: settingsRef.current,
          timestamp: Date.now()
        });
      } else if (type === 'CLIENT_STATUS' && role === 'THERAPIST' && statusPayload) {
        setClientStatus(statusPayload);
      }
    };

    // If Client, ask for current state immediately upon mounting
    if (role === 'CLIENT') {
      channel.postMessage({
        type: 'REQUEST_SYNC',
        timestamp: Date.now()
      });
    }

    return () => {
      channel.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]);

  // Function for Therapist to broadcast updates
  const updateSettings = useCallback((newSettings: Partial<EMDRSettings>) => {
    setSettings(prev => {
      const updated = { ...prev, ...newSettings };
      
      // Only broadcast if we are the therapist
      if (role === 'THERAPIST' && channelRef.current) {
        channelRef.current.postMessage({
          type: 'SYNC_SETTINGS',
          payload: updated,
          timestamp: Date.now()
        });
      }
      return updated;
    });
  }, [role]);

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
    if (role === 'CLIENT' && channelRef.current) {
        channelRef.current.postMessage({
            type: 'CLIENT_STATUS',
            clientStatus: status,
            timestamp: Date.now()
        });
    }
  }, [role]);

  return { settings, updateSettings, clientStatus, sendClientStatus };
};