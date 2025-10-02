// Vercel API route for health check
export default function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Import transcription services
    const availableTranscribers = [];
    
    // Check which services are available
    if (process.env.SPEECHMATICS_API_KEY) {
      availableTranscribers.push('speechmatics');
    }
    
    // Whisper is always available (local)
    availableTranscribers.push('whisper');
    
    if (process.env.ANTHROPIC_API_KEY) {
      availableTranscribers.push('grok');
    }

    res.status(200).json({
      status: 'healthy',
      available_transcribers: availableTranscribers,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Health check failed',
      message: error.message 
    });
  }
}
