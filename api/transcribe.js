import fs from 'fs';
import path from 'path';
import formidable from 'formidable';

// Import transcription services
import { SpeechmaticsTranscriber } from '../transcribers/speechmatics.js';
import { WhisperTranscriber } from '../transcribers/whisper.js';
import { GoogleSTTTranscriber, GoogleCloudSTTTranscriber } from '../transcribers/google.js';
import AssemblyAITranscriber from '../transcribers/assemblyai.js';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
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
    let filename = '';
    let models = [];
    let audioPath = '';

    // If multipart form-data (production path): parse file and models
    if (req.headers['content-type']?.includes('multipart/form-data')) {
      const uploadDir = path.join('/tmp', 'audio_clips');
      if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

      const form = formidable({
        uploadDir,
        keepExtensions: true,
        maxFileSize: 100 * 1024 * 1024,
        filter: ({ mimetype }) => !!mimetype && mimetype.startsWith('audio/'),
      });

      const [fields, files] = await form.parse(req);
      models = JSON.parse(Array.isArray(fields.models) ? fields.models[0] : fields.models || '[]');
      const file = Array.isArray(files.file) ? files.file[0] : files.file;
      if (!file) {
        return res.status(400).json({ error: 'No audio file provided' });
      }
      const ext = path.extname(file.originalFilename || 'audio');
      const base = path.basename(file.originalFilename || 'audio', ext);
      const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      filename = `${ts}_${base}${ext}`;
      audioPath = path.join(uploadDir, filename);
      fs.renameSync(file.filepath, audioPath);
    } else {
      // JSON body (local Flask-compatible path)
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

        // Save transcript to file
        const transcriptFile = path.join(resultsDir, `${filename}_${modelId}.txt`);
        fs.writeFileSync(transcriptFile, transcript, 'utf-8');

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

    res.status(200).json({
      message: 'Transcription completed',
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
