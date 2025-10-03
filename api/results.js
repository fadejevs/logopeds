const fs = require('fs');
const path = require('path');

module.exports = async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    // Extract filename from URL path (e.g., /api/results/filename.m4a)
    const url = new URL(req.url, `http://${req.headers.host}`);
    const pathParts = url.pathname.split('/');
    const filename = pathParts[pathParts.length - 1];
    
    if (!filename) return res.status(400).json({ error: 'Missing filename' });

    // Look for result files in /tmp/transcriptions
    const resultsDir = path.join('/tmp', 'transcriptions');
    if (!fs.existsSync(resultsDir)) {
      return res.status(404).json({ error: 'No results found' });
    }

    const resultFiles = fs.readdirSync(resultsDir).filter(file => 
      file.startsWith(path.basename(filename, path.extname(filename))) && 
      file.endsWith('.txt') && 
      file !== filename
    );

    if (resultFiles.length === 0) {
      return res.status(404).json({ error: 'No results found' });
    }

    const results = [];
    for (const resultFile of resultFiles) {
      const modelId = resultFile.split('_').pop().replace('.txt', '');
      const filePath = path.join(resultsDir, resultFile);
      const transcript = fs.readFileSync(filePath, 'utf-8');
      
      results.push({
        model_id: modelId,
        status: 'success',
        transcript: transcript,
        processing_time: 0 // We don't store this in file-based approach
      });
    }

    return res.status(200).json({ filename, results });
  } catch (e) {
    console.error('results error', e);
    return res.status(500).json({ error: 'Failed to get results', message: e.message });
  }
};


