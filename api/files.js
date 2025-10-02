const fs = require('fs');
const path = require('path');

module.exports = function handler(req, res) {
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
    const audioDir = path.join(process.cwd(), 'audio_clips');
    
    if (!fs.existsSync(audioDir)) {
      return res.status(200).json({ files: [] });
    }

    const files = fs.readdirSync(audioDir)
      .filter(file => {
        const ext = path.extname(file).toLowerCase();
        return ['.wav', '.mp3', '.m4a', '.flac', '.ogg'].includes(ext);
      })
      .map(file => {
        const filePath = path.join(audioDir, file);
        const stats = fs.statSync(filePath);
        
        return {
          filename: file,
          size: stats.size,
          upload_time: stats.birthtime.toISOString()
        };
      })
      .sort((a, b) => new Date(b.upload_time) - new Date(a.upload_time)); // Newest first

    res.status(200).json({ files });

  } catch (error) {
    console.error('Error listing files:', error);
    res.status(500).json({ 
      error: 'Failed to list files',
      message: error.message 
    });
  }
}
