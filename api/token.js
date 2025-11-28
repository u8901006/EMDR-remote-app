import { AccessToken } from 'livekit-server-sdk';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { roomName, participantName, role } = req.body;

  if (!roomName || !participantName) {
    return res.status(400).json({ error: 'Missing roomName or participantName' });
  }

  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  const wsUrl = process.env.LIVEKIT_URL;

  if (!apiKey || !apiSecret || !wsUrl) {
    console.error("Server Misconfigured. Missing Environment Variables:");
    if (!apiKey) console.error("- LIVEKIT_API_KEY is missing");
    if (!apiSecret) console.error("- LIVEKIT_API_SECRET is missing");
    if (!wsUrl) console.error("- LIVEKIT_URL is missing");
    
    return res.status(500).json({ error: 'Server misconfigured: Missing LiveKit Environment Variables on Vercel.' });
  }

  try {
    const at = new AccessToken(apiKey, apiSecret, {
      identity: participantName,
    });

    at.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });

    const token = await at.toJwt();

    return res.status(200).json({ token, url: wsUrl });
  } catch (error) {
    console.error('Token generation error:', error);
    return res.status(500).json({ error: 'Failed to generate token: ' + error.message });
  }
}