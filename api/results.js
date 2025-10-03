const fs = require('fs');
const path = require('path');

module.exports = async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, DELETE, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET' && req.method !== 'DELETE' && req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

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

// Handle DELETE requests
if (req.method === 'DELETE') {
  try {
    // Extract filename from URL path
    const url = new URL(req.url, `http://${req.headers.host}`);
    const pathParts = url.pathname.split('/');
    const filename = pathParts[pathParts.length - 1];
    
    if (!filename) return res.status(400).json({ error: 'Missing filename' });

    const resultsDir = path.join('/tmp', 'transcriptions');
    if (!fs.existsSync(resultsDir)) {
      return res.status(404).json({ error: 'No results found' });
    }

    // Find and delete result files
    const resultFiles = fs.readdirSync(resultsDir).filter(file => 
      file.startsWith(path.basename(filename, path.extname(filename))) && 
      file.endsWith('.txt') && 
      file !== filename
    );

    if (resultFiles.length === 0) {
      return res.status(404).json({ error: 'No results found' });
    }

    const deletedFiles = [];
    for (const resultFile of resultFiles) {
      const filePath = path.join(resultsDir, resultFile);
      try {
        fs.unlinkSync(filePath);
        deletedFiles.push(resultFile);
        console.log('Deleted result file:', resultFile);
      } catch (error) {
        console.error('Failed to delete file:', resultFile, error);
      }
    }

    // Also delete summary files
    const summaryFiles = fs.readdirSync(resultsDir).filter(file => 
      file.includes('transcription_') && file.endsWith('.csv')
    );
    
    for (const summaryFile of summaryFiles) {
      const filePath = path.join(resultsDir, summaryFile);
      try {
        fs.unlinkSync(filePath);
        deletedFiles.push(summaryFile);
        console.log('Deleted summary file:', summaryFile);
      } catch (error) {
        console.error('Failed to delete summary file:', summaryFile, error);
      }
    }

    return res.status(200).json({
      message: `Deleted ${deletedFiles.length} files`,
      deleted_files: deletedFiles
    });

  } catch (e) {
    console.error('Delete results error', e);
    return res.status(500).json({ error: 'Failed to delete results', message: e.message });
  }
}

// Handle bulk delete requests (POST to /api/results/bulk)
if (req.method === 'POST') {
  const url = new URL(req.url, `http://${req.headers.host}`);
  if (url.pathname.endsWith('/bulk')) {
  try {
    const body = JSON.parse(req.body || '{}');
    const filenames = body.filenames || [];
    
    if (!Array.isArray(filenames) || filenames.length === 0) {
      return res.status(400).json({ error: 'No filenames provided' });
    }

    const resultsDir = path.join('/tmp', 'transcriptions');
    if (!fs.existsSync(resultsDir)) {
      return res.status(404).json({ error: 'No results found' });
    }

    const allDeletedFiles = [];
    const errors = [];

    for (const filename of filenames) {
      try {
        const resultFiles = fs.readdirSync(resultsDir).filter(file => 
          file.startsWith(path.basename(filename, path.extname(filename))) && 
          file.endsWith('.txt') && 
          file !== filename
        );

        for (const resultFile of resultFiles) {
          const filePath = path.join(resultsDir, resultFile);
          try {
            fs.unlinkSync(filePath);
            allDeletedFiles.push(resultFile);
            console.log('Deleted result file:', resultFile);
          } catch (error) {
            console.error('Failed to delete file:', resultFile, error);
            errors.push(`${resultFile}: ${error.message}`);
          }
        }

        // Also delete summary files
        const summaryFiles = fs.readdirSync(resultsDir).filter(file => 
          file.includes('transcription_') && file.endsWith('.csv')
        );
        
        for (const summaryFile of summaryFiles) {
          const filePath = path.join(resultsDir, summaryFile);
          try {
            fs.unlinkSync(filePath);
            allDeletedFiles.push(summaryFile);
            console.log('Deleted summary file:', summaryFile);
          } catch (error) {
            console.error('Failed to delete summary file:', summaryFile, error);
            errors.push(`${summaryFile}: ${error.message}`);
          }
        }

      } catch (error) {
        console.error(`Error processing ${filename}:`, error);
        errors.push(`${filename}: ${error.message}`);
      }
    }

    const response = {
      message: `Deleted ${allDeletedFiles.length} files`,
      deleted_files: allDeletedFiles
    };

    if (errors.length > 0) {
      response.errors = errors;
    }

    return res.status(200).json(response);

  } catch (e) {
    console.error('Bulk delete results error', e);
    return res.status(500).json({ error: 'Failed to bulk delete results', message: e.message });
  }
  }
}


