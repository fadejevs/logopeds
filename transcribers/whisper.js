import fs from 'fs';
import FormData from 'form-data';
import fetch from 'node-fetch';

export class WhisperTranscriber {
  constructor() {
    this.name = 'OpenAI Whisper';
    this.language = 'lv'; // Latvian
    
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OpenAI API key not configured');
    }
  }

  async transcribe(audioFilePath) {
    try {
      // Read the audio file
      const audioBuffer = fs.readFileSync(audioFilePath);
      
      // Create form data for OpenAI Whisper API
      const formData = new FormData();
      formData.append('file', audioBuffer, {
        filename: 'audio.wav',
        contentType: 'audio/wav'
      });
      formData.append('model', 'whisper-1');
      formData.append('language', 'lv'); // Latvian
      formData.append('response_format', 'text');
      
      // Call OpenAI Whisper API
      const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          ...formData.getHeaders(),
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`OpenAI API error: ${response.status} ${response.statusText} - ${errorData.error?.message || 'Unknown error'}`);
      }

      const transcript = await response.text();
      return transcript.trim();
      
    } catch (error) {
      throw new Error(`Whisper transcription failed: ${error.message}`);
    }
  }
}

// Alternative local implementation (for development)
export class LocalWhisperTranscriber {
  constructor() {
    this.name = 'Whisper (Local)';
    this.language = 'lv';
  }

  async transcribe(audioFilePath) {
    try {
      // This would use the local whisper binary
      // For Vercel deployment, this won't work, so we use the API version above
      
      console.log('Local Whisper transcription requested for:', audioFilePath);
      
      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      return 'Local Whisper not available in serverless environment. Please use OpenAI Whisper API.';
      
    } catch (error) {
      throw new Error(`Local Whisper transcription failed: ${error.message}`);
    }
  }
}