import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Room, RoomEvent, VideoPresets } from 'livekit-client';

interface LiveKitContextType {
  room: Room | null;
  isConnecting: boolean;
  error: string | null;
  connect: (url: string, token: string) => Promise<void>;
  disconnect: () => Promise<void>;
}

const LiveKitContext = createContext<LiveKitContextType | undefined>(undefined);

export const LiveKitProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [room, setRoom] = useState<Room | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const disconnect = useCallback(async () => {
    if (room) {
      await room.disconnect();
      setRoom(null);
    }
  }, [room]);

  const connect = useCallback(async (url: string, token: string) => {
    setIsConnecting(true);
    setError(null);

    try {
      // Clean up existing room if any
      if (room) {
        await room.disconnect();
      }

      const newRoom = new Room({
        adaptiveStream: true,
        dynacast: true,
        videoCaptureDefaults: {
          resolution: VideoPresets.h540.resolution,
        },
        publishDefaults: {
          simulcast: true,
        }
      });

      await newRoom.connect(url, token);
      setRoom(newRoom);
      console.log("LiveKit Context: Connected to Room");

    } catch (err: any) {
      console.error("LiveKit Connection Error:", err);
      setError(err.message || "Failed to connect");
      setRoom(null);
    } finally {
      setIsConnecting(false);
    }
  }, [room]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (room) {
        room.disconnect();
      }
    };
  }, []);

  return (
    <LiveKitContext.Provider value={{ room, isConnecting, error, connect, disconnect }}>
      {children}
    </LiveKitContext.Provider>
  );
};

export const useLiveKitContext = () => {
  const context = useContext(LiveKitContext);
  if (!context) {
    throw new Error('useLiveKitContext must be used within a LiveKitProvider');
  }
  return context;
};
