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
    
    console.log('Download request for:', filename);
    console.log('Looking in directory:', resultsDir);
    console.log('Full file path:', filePath);
    
    if (!fs.existsSync(resultsDir)) {
      console.log('Results directory does not exist');
      return res.status(404).json({ error: 'Results directory not found' });
    }
    
    // List all files in the directory for debugging
    const allFiles = fs.readdirSync(resultsDir);
    console.log('Available files in results directory:', allFiles);
    
    if (!fs.existsSync(filePath)) {
      console.log('Requested file not found:', filename);
      return res.status(404).json({ 
        error: 'File not found',
        requested: filename,
        available: allFiles
      });
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
