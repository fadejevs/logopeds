import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

export class WhisperTranscriber {
  constructor() {
    this.name = 'Whisper';
    this.language = 'lv'; // Latvian
  }

  async transcribe(audioFilePath) {
    try {
      // Use whisper command line tool
      const result = await this.runWhisper(audioFilePath);
      return result.trim();
    } catch (error) {
      throw new Error(`Whisper transcription failed: ${error.message}`);
    }
  }

  runWhisper(audioFilePath) {
    return new Promise((resolve, reject) => {
      // For Vercel deployment, we'll need to use a different approach
      // since whisper binary won't be available
      
      // For now, return a placeholder - in production you'd use:
      // 1. A Whisper API service
      // 2. Or pre-process audio locally and upload results
      
      console.log('Whisper transcription requested for:', audioFilePath);
      
      // Simulate processing time
      setTimeout(() => {
        resolve('Whisper transcription not available in serverless environment. Please use Speechmatics or Grok for deployment.');
      }, 1000);
      
      // Uncomment below for local development with whisper installed:
      /*
      const whisper = spawn('whisper', [
        audioFilePath,
        '--language', 'lv',
        '--model', 'medium',
        '--output_format', 'txt',
        '--fp16', 'False'
      ]);

      let output = '';
      let error = '';

      whisper.stdout.on('data', (data) => {
        output += data.toString();
      });

      whisper.stderr.on('data', (data) => {
        error += data.toString();
      });

      whisper.on('close', (code) => {
        if (code === 0) {
          // Read the output file
          const outputFile = audioFilePath.replace(/\.[^/.]+$/, '.txt');
          if (fs.existsSync(outputFile)) {
            const transcript = fs.readFileSync(outputFile, 'utf-8');
            resolve(transcript);
          } else {
            resolve(output);
          }
        } else {
          reject(new Error(`Whisper failed: ${error}`));
        }
      });
      */
    });
  }
}
