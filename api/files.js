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

  if (req.method !== 'GET' && req.method !== 'DELETE') {
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

// Handle DELETE requests
if (req.method === 'DELETE') {
  try {
    // Extract filename from URL path
    const url = new URL(req.url, `http://${req.headers.host}`);
    const pathParts = url.pathname.split('/');
    const filename = pathParts[pathParts.length - 1];
    
    if (!filename) return res.status(400).json({ error: 'Missing filename' });

    const audioDir = path.join('/tmp', 'audio_clips');
    const audioFilePath = path.join(audioDir, filename);
    
    if (!fs.existsSync(audioFilePath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Delete the audio file
    fs.unlinkSync(audioFilePath);
    console.log('Deleted audio file:', filename);

    // Also delete associated results
    const resultsDir = path.join('/tmp', 'transcriptions');
    if (fs.existsSync(resultsDir)) {
      const resultFiles = fs.readdirSync(resultsDir).filter(file => 
        file.startsWith(path.basename(filename, path.extname(filename))) && 
        file.endsWith('.txt')
      );

      for (const resultFile of resultFiles) {
        const resultFilePath = path.join(resultsDir, resultFile);
        try {
          fs.unlinkSync(resultFilePath);
          console.log('Deleted result file:', resultFile);
        } catch (error) {
          console.error('Failed to delete result file:', resultFile, error);
        }
      }
    }

    return res.status(200).json({
      message: `Deleted file ${filename} and associated results`
    });

  } catch (error) {
    console.error('Error deleting file:', error);
    res.status(500).json({ 
      error: 'Failed to delete file',
      message: error.message 
    });
  }
}
