const fs = require('fs');
const path = require('path');

module.exports = async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Extract filename from URL path (e.g., /api/download/filename_model.txt)
    const url = new URL(req.url, `http://${req.headers.host}`);
    const pathParts = url.pathname.split('/');
    const filename = pathParts[pathParts.length - 1];
    
    if (!filename) {
      return res.status(400).json({ error: 'Missing filename' });
    }

    // Look for the file in /tmp/transcriptions
    const resultsDir = path.join('/tmp', 'transcriptions');
    const filePath = path.join(resultsDir, filename);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Read the file content
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    
    // Set appropriate headers for download
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', Buffer.byteLength(fileContent, 'utf-8'));
    
    // Send the file content
    res.status(200).send(fileContent);
    
  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({ 
      error: 'Failed to download file', 
      message: error.message 
    });
  }
};
