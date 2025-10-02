import fs from 'fs';
import path from 'path';

export default async function handler(req, res) {
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
    const { filename, models } = req.body || {};
    if (!filename || !models || !Array.isArray(models)) {
      return res.status(400).json({ error: 'Missing required fields: filename and models array' });
    }

    const audioPath = path.join('/tmp', 'audio_clips', filename);
    if (!fs.existsSync(audioPath)) {
      return res.status(404).json({ error: 'Audio file not found', path: audioPath });
    }

    const results = [];

    // Only Whisper and AssemblyAI enabled here to keep function lean
    const { WhisperTranscriber } = await import('../transcribers/whisper.js');
    const AssemblyAITranscriber = (await import('../transcribers/assemblyai.js')).default;

    for (const modelId of models) {
      const start = Date.now();
      try {
        let transcript = '';
        if (modelId === 'whisper') {
          if (!process.env.OPENAI_API_KEY) throw new Error('OpenAI API key not configured');
          const transcriber = new WhisperTranscriber();
          transcript = await transcriber.transcribe(audioPath);
        } else if (modelId === 'assemblyai') {
          if (!process.env.ASSEMBLYAI_API_KEY) throw new Error('AssemblyAI API key not configured');
          const transcriber = new AssemblyAITranscriber(process.env.ASSEMBLYAI_API_KEY);
          const buffer = fs.readFileSync(audioPath);
          transcript = await transcriber.transcribe(buffer);
        } else if (modelId === 'speechmatics') {
          const { SpeechmaticsTranscriber } = await import('../transcribers/speechmatics.js');
          const transcriber = new SpeechmaticsTranscriber();
          transcript = await transcriber.transcribe(audioPath);
        } else {
          throw new Error(`Unknown model: ${modelId}`);
        }

        results.push({
          model_id: modelId,
          status: 'success',
          transcript,
          processing_time: (Date.now() - start) / 1000,
        });
      } catch (err) {
        results.push({
          model_id: modelId,
          status: 'error',
          error: err.message,
          processing_time: (Date.now() - start) / 1000,
        });
      }
    }

    res.status(200).json({
      message: 'Transcription completed',
      results,
      summary_file: ''
    });
  } catch (error) {
    res.status(500).json({ error: 'Transcription failed', message: error.message });
  }
}

