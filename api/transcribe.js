const fs = require('fs');
const path = require('path');
const FormidableLib = require('formidable');

// Import transcription services
const { SpeechmaticsTranscriber } = require('../transcribers/speechmatics.js');
const { WhisperTranscriber } = require('../transcribers/whisper.js');
const { GoogleSTTTranscriber, GoogleCloudSTTTranscriber } = require('../transcribers/google.js');
const AssemblyAITranscriber = require('../transcribers/assemblyai.js');

// Helper function to get model parameters
function getModelParameters(modelId) {
  switch (modelId) {
    case 'speechmatics':
      return 'Enhanced operating point, Latvian language';
    case 'whisper':
      return 'Whisper-1 model, Latvian language, text format';
    case 'google':
      return 'Google Cloud Speech-to-Text, Latvian language, default settings';
    case 'assemblyai':
      return 'AssemblyAI, Latvian language';
    default:
      return 'Unknown parameters';
  }
}

// Disable default body parser to allow multipart in single-step production flow
module.exports.config = {
  api: {
    bodyParser: false,
  },
};

module.exports = async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const contentType = req.headers['content-type'] || '';

    let filename = null;
    let models = [];
    let audioPath = null;

    if (contentType.startsWith('multipart/form-data')) {
      // Single-step production flow: parse file + models
      const uploadDir = path.join('/tmp', 'audio_clips');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      const formidableFn = FormidableLib.formidable || FormidableLib;
      const IncomingForm = FormidableLib.IncomingForm;
      const formOptions = {
        uploadDir,
        keepExtensions: true,
        maxFileSize: 100 * 1024 * 1024,
      };
      const form = typeof formidableFn === 'function' 
        ? formidableFn(formOptions) 
        : new IncomingForm(formOptions);

      const [fields, files] = await new Promise((resolve, reject) => {
        form.parse(req, (err, fields, files) => {
          if (err) return reject(err);
          resolve([fields, files]);
        });
      });

      // Extract models
      const rawModels = Array.isArray(fields.models) ? fields.models[0] : fields.models;
      if (rawModels) {
        try { models = JSON.parse(rawModels); } catch (_) { models = String(rawModels).split(',').map(s => s.trim()).filter(Boolean); }
      }

      // Extract file if present; otherwise use provided filename
      const fileObj = Array.isArray(files.file) ? files.file[0] : files.file;
      if (fileObj) {
        const ext = path.extname(fileObj.originalFilename || fileObj.newFilename || 'audio');
        const baseName = path.basename(fileObj.originalFilename || 'audio', ext);
        const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
        filename = `${ts}_${baseName}${ext}`;
        const newPath = path.join(uploadDir, filename);
        fs.renameSync(fileObj.filepath, newPath);
        audioPath = newPath;
      } else {
        const providedFilename = Array.isArray(fields.filename) ? fields.filename[0] : fields.filename;
        if (!providedFilename) {
          return res.status(400).json({ error: 'No audio file provided' });
        }
        filename = providedFilename;
        audioPath = path.join(uploadDir, filename);
      }
    } else {
      // Two-step local flow: JSON body { filename, models }
      const body = req.body || {};
      filename = body.filename;
      models = body.models || [];
      audioPath = path.join('/tmp', 'audio_clips', filename);
    }

    if (!filename || !models || !Array.isArray(models)) {
      console.error('Invalid request body:', { filename, models });
      return res.status(400).json({ 
        error: 'Missing required fields: filename and models array' 
      });
    }

    console.log('Looking for audio file at:', audioPath);
    
    // Log API key availability for debugging
    console.log('API Key availability:', {
      SPEECHMATICS_API_KEY: !!process.env.SPEECHMATICS_API_KEY,
      OPENAI_API_KEY: !!process.env.OPENAI_API_KEY,
      GOOGLE_CLOUD_API_KEY: !!process.env.GOOGLE_CLOUD_API_KEY,
      ASSEMBLYAI_API_KEY: !!process.env.ASSEMBLYAI_API_KEY
    });
    
    // Log first few characters of API keys for debugging (safely)
    console.log('API Key prefixes:', {
      SPEECHMATICS_API_KEY: process.env.SPEECHMATICS_API_KEY ? process.env.SPEECHMATICS_API_KEY.substring(0, 8) + '...' : 'NOT_SET',
      OPENAI_API_KEY: process.env.OPENAI_API_KEY ? process.env.OPENAI_API_KEY.substring(0, 8) + '...' : 'NOT_SET',
      GOOGLE_CLOUD_API_KEY: process.env.GOOGLE_CLOUD_API_KEY ? process.env.GOOGLE_CLOUD_API_KEY.substring(0, 8) + '...' : 'NOT_SET',
      ASSEMBLYAI_API_KEY: process.env.ASSEMBLYAI_API_KEY ? process.env.ASSEMBLYAI_API_KEY.substring(0, 8) + '...' : 'NOT_SET'
    });
    
    if (!fs.existsSync(audioPath)) {
      console.error('Audio file not found at:', audioPath);
      // List files in directory for debugging
      const dir = path.join('/tmp', 'audio_clips');
      if (fs.existsSync(dir)) {
        const files = fs.readdirSync(dir);
        console.log('Files in /tmp/audio_clips:', files);
      } else {
        console.log('Directory /tmp/audio_clips does not exist');
      }
      return res.status(404).json({ 
        error: 'Audio file not found',
        path: audioPath
      });
    }

    // Create results directory in /tmp
    const resultsDir = path.join('/tmp', 'transcriptions');
    if (!fs.existsSync(resultsDir)) {
      fs.mkdirSync(resultsDir, { recursive: true });
      console.log('Created results directory:', resultsDir);
    }

    const results = [];
    const summaryData = [];

    // Process each selected model
    for (const modelId of models) {
      const startTime = Date.now();
      
      try {
        console.log(`Transcribing ${filename} with ${modelId}`);
        
        let transcriber;
        let transcript = '';
        let status = 'success';

        switch (modelId) {
          case 'speechmatics':
            if (!process.env.SPEECHMATICS_API_KEY) {
              throw new Error('Speechmatics API key not configured');
            }
            transcriber = new SpeechmaticsTranscriber();
            transcript = await transcriber.transcribe(audioPath);
            break;

          case 'whisper':
            if (!process.env.OPENAI_API_KEY) {
              throw new Error('OpenAI API key not configured');
            }
            transcriber = new WhisperTranscriber();
            transcript = await transcriber.transcribe(audioPath);
            break;

          case 'google':
            if (!process.env.GOOGLE_CLOUD_API_KEY) {
              throw new Error('Google Cloud API key not configured');
            }
            transcriber = new GoogleCloudSTTTranscriber();
            transcript = await transcriber.transcribe(audioPath);
            break;

          case 'assemblyai':
            if (!process.env.ASSEMBLYAI_API_KEY) {
              throw new Error('AssemblyAI API key not configured');
            }
            transcriber = new AssemblyAITranscriber(process.env.ASSEMBLYAI_API_KEY);
            const fileBuffer = fs.readFileSync(audioPath);
            transcript = await transcriber.transcribe(fileBuffer);
            break;

          default:
            throw new Error(`Unknown model: ${modelId}`);
        }

        const processingTime = (Date.now() - startTime) / 1000;

        // Save transcript to file with parameter details
        const transcriptFile = path.join(resultsDir, `${filename}_${modelId}.txt`);
        const header = `# Transcription by ${modelId.toUpperCase()}\n# Parameters: ${getModelParameters(modelId)}\n# Generated: ${new Date().toISOString()}\n\n`;
        fs.writeFileSync(transcriptFile, header + transcript, 'utf-8');
        console.log(`Saved transcript file: ${transcriptFile}`);
        console.log(`File exists: ${fs.existsSync(transcriptFile)}`);

        results.push({
          model_id: modelId,
          status: 'success',
          transcript: transcript,
          processing_time: processingTime
        });

        summaryData.push({
          filename,
          model: modelId,
          status: 'success',
          processing_time: processingTime,
          transcript_length: transcript.length
        });

      } catch (error) {
        console.error(`Transcription failed for ${modelId}:`, error);
        console.error(`Error details:`, {
          message: error.message,
          stack: error.stack,
          modelId,
          filename
        });
        
        const processingTime = (Date.now() - startTime) / 1000;
        
        results.push({
          model_id: modelId,
          status: 'error',
          error: error.message,
          processing_time: processingTime
        });

        summaryData.push({
          filename,
          model: modelId,
          status: 'error',
          error: error.message,
          processing_time: processingTime
        });
      }
    }

    // Save summary report
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const summaryFile = path.join(resultsDir, `transcription_${timestamp}.csv`);
    
    const csvHeader = 'filename,model,status,processing_time,transcript_length,error\n';
    const csvRows = summaryData.map(row => 
      `${row.filename},${row.model},${row.status},${row.processing_time},${row.transcript_length || ''},"${row.error || ''}"`
    ).join('\n');
    
    fs.writeFileSync(summaryFile, csvHeader + csvRows);

    // Results are already saved as individual files in /tmp/transcriptions
    console.log('Transcription completed for:', filename, 'with', results.length, 'results');

    res.status(200).json({
      message: 'Transcription completed',
      filename,
      results: results,
      summary_file: `transcription_${timestamp}.csv`
    });

  } catch (error) {
    console.error('Transcription error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      error: 'Transcription failed',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}
