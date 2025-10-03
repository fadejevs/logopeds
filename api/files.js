const fs = require('fs');
const path = require('path');

module.exports = async function handler(req, res) {
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
    // Look for audio files in /tmp/audio_clips
    const audioDir = path.join('/tmp', 'audio_clips');
    if (!fs.existsSync(audioDir)) {
      return res.status(200).json({ files: [] });
    }
    
    const files = fs.readdirSync(audioDir).map(file => ({ 
      filename: file, 
      size: 0, 
      upload_time: new Date().toISOString() 
    }));
    
    res.status(200).json({ files });

  } catch (error) {
    console.error('Error listing files:', error);
    res.status(500).json({ 
      error: 'Failed to list files',
      message: error.message 
    });
  }
}
