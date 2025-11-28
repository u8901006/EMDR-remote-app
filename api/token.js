import { AccessToken } from 'livekit-server-sdk';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { roomName, participantName, role } = req.body;

  if (!roomName || !participantName) {
    return res.status(400).json({ error: 'Missing roomName or participantName' });
  }

  // Support both standard and VITE_ prefixed variables as fallback
  const apiKey = process.env.LIVEKIT_API_KEY || process.env.VITE_LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET || process.env.VITE_LIVEKIT_API_SECRET;
  const wsUrl = process.env.LIVEKIT_URL || process.env.VITE_LIVEKIT_URL;

  // Enhanced Debug Logging (Check Vercel Function Logs if this fails)
  console.log('========== LIVEKIT TOKEN GENERATION START ==========');
  console.log('Timestamp:', new Date().toISOString());
  console.log('Request Method:', req.method);
  console.log('Room Name:', roomName);
  console.log('Participant Name:', participantName);
  console.log('Role:', role || 'not specified');
  console.log('');
  console.log('--- Environment Variables Status ---');
  console.log('LIVEKIT_API_KEY present:', !!process.env.LIVEKIT_API_KEY);
  console.log('VITE_LIVEKIT_API_KEY present:', !!process.env.VITE_LIVEKIT_API_KEY);
  console.log('Using API Key:', apiKey ? 'YES (set to apiKey variable)' : 'NO (missing)');
  console.log('');
  console.log('LIVEKIT_API_SECRET present:', !!process.env.LIVEKIT_API_SECRET);
  console.log('VITE_LIVEKIT_API_SECRET present:', !!process.env.VITE_LIVEKIT_API_SECRET);
  console.log('Using API Secret:', apiSecret ? 'YES (set to apiSecret variable)' : 'NO (missing)');
  console.log('');
  console.log('LIVEKIT_URL present:', !!process.env.LIVEKIT_URL);
  console.log('VITE_LIVEKIT_URL present:', !!process.env.VITE_LIVEKIT_URL);
  console.log('Using WebSocket URL:', wsUrl ? 'YES (set to wsUrl variable)' : 'NO (missing)');
  console.log('=========================================');
  console.log('');

  if (!apiKey || !apiSecret || !wsUrl) {
    console.error('========== TOKEN GENERATION FAILED ==========');
    console.error('Missing Environment Variables on Vercel!');
    if (!apiKey) console.error('ERROR: LIVEKIT_API_KEY is missing (neither LIVEKIT_API_KEY nor VITE_LIVEKIT_API_KEY found)');
    if (!apiSecret) console.error('ERROR: LIVEKIT_API_SECRET is missing (neither LIVEKIT_API_SECRET nor VITE_LIVEKIT_API_SECRET found)');
    if (!wsUrl) console.error('ERROR: LIVEKIT_URL is missing (neither LIVEKIT_URL nor VITE_LIVEKIT_URL found)');
    console.error('ACTION REQUIRED:');
    console.error('1. Go to Vercel Dashboard -> Project Settings -> Environment Variables');
    console.error('2. Verify that LIVEKIT_API_KEY, LIVEKIT_API_SECRET, and LIVEKIT_URL are set');
    console.error('3. Redeploy your project (Deployments -> Redeploy)');
    console.error('==========================================');
    
    return res.status(500).json({ 
      error: 'Server misconfigured: Missing LiveKit Environment Variables on Vercel. Please check Project Settings -> Environment Variables and REDEPLOY.' 
    });
  }

  try {
    console.log('Creating AccessToken...');
    const at = new AccessToken(apiKey, apiSecret, {
      identity: participantName,
    });

    console.log('Adding grants...');
    at.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });

    console.log('Generating JWT token...');
    const token = await at.toJwt();

    console.log('========== TOKEN GENERATION SUCCESSFUL ==========');
    console.log('Token generated for:', participantName);
    console.log('Room:', roomName);
    console.log('Token length:', token.length);
    console.log('================================================');

    return res.status(200).json({ token, url: wsUrl });
  } catch (error) {
    console.error('========== TOKEN GENERATION ERROR ==========');
    console.error('Error Type:', error.constructor.name);
    console.error('Error Message:', error.message);
    console.error('Error Stack:', error.stack);
    console.error('========================================');
    
    return res.status(500).json({ error: 'Failed to generate token: ' + error.message });
  }
}
