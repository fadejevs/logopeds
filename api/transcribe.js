import fs from 'fs';
import path from 'path';

// Import transcription services
import { SpeechmaticsTranscriber } from '../transcribers/speechmatics.js';
import { WhisperTranscriber } from '../transcribers/whisper.js';
import { GoogleSTTTranscriber, GoogleCloudSTTTranscriber } from '../transcribers/google.js';
import AssemblyAITranscriber from '../transcribers/assemblyai.js';

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
    const { filename, models } = req.body;

    if (!filename || !models || !Array.isArray(models)) {
      return res.status(400).json({ 
        error: 'Missing required fields: filename and models array' 
      });
    }

    const audioPath = path.join(process.cwd(), 'audio_clips', filename);
    
    if (!fs.existsSync(audioPath)) {
      return res.status(404).json({ 
        error: 'Audio file not found' 
      });
    }

    // Create results directory
    const resultsDir = path.join(process.cwd(), 'transcriptions');
    if (!fs.existsSync(resultsDir)) {
      fs.mkdirSync(resultsDir, { recursive: true });
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
    res.status(500).json({ 
      error: 'Transcription failed',
      message: error.message 
    });
  }
}
