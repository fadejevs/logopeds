/**
 * AssemblyAI transcription service for Vercel serverless
 */

const https = require('https');
const http = require('http');
const { URL } = require('url');

class AssemblyAITranscriber {
  constructor(apiKey) {
    if (!apiKey) {
      throw new Error('AssemblyAI API key is required');
    }
    this.apiKey = apiKey;
    this.baseUrl = 'https://api.assemblyai.com/v2';
    this.name = 'AssemblyAI';
    this.language = 'lv';
  }

  /**
   * Upload file to AssemblyAI
   */
  async uploadFile(fileBuffer) {
    return new Promise((resolve, reject) => {
      const options = {
        method: 'POST',
        hostname: 'api.assemblyai.com',
        path: '/v2/upload',
        headers: {
          'authorization': this.apiKey,
          'content-type': 'application/octet-stream',
          'content-length': fileBuffer.length
        }
      };

      const req = https.request(options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          if (res.statusCode === 200) {
            const result = JSON.parse(data);
            resolve(result.upload_url);
          } else {
            reject(new Error(`Upload failed: ${res.statusCode} - ${data}`));
          }
        });
      });

      req.on('error', (error) => {
        reject(new Error(`Upload request failed: ${error.message}`));
      });

      req.write(fileBuffer);
      req.end();
    });
  }

  /**
   * Request transcription
   */
  async requestTranscription(audioUrl) {
    return new Promise((resolve, reject) => {
      const postData = JSON.stringify({
        audio_url: audioUrl,
        language_code: 'lv',
        speech_model: 'best'
      });

      const options = {
        method: 'POST',
        hostname: 'api.assemblyai.com',
        path: '/v2/transcript',
        headers: {
          'authorization': this.apiKey,
          'content-type': 'application/json',
          'content-length': Buffer.byteLength(postData)
        }
      };

      const req = https.request(options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          if (res.statusCode === 200) {
            const result = JSON.parse(data);
            resolve(result.id);
          } else {
            reject(new Error(`Transcription request failed: ${res.statusCode} - ${data}`));
          }
        });
      });

      req.on('error', (error) => {
        reject(new Error(`Transcription request failed: ${error.message}`));
      });

      req.write(postData);
      req.end();
    });
  }

  /**
   * Poll for transcription completion
   */
  async waitForCompletion(transcriptId, maxWait = 300000) {
    const startTime = Date.now();
    const pollInterval = 3000; // 3 seconds

    while (Date.now() - startTime < maxWait) {
      const result = await this.checkStatus(transcriptId);
      
      if (result.status === 'completed') {
        if (!result.text) {
          throw new Error('No transcription text returned');
        }
        return result.text;
      } else if (result.status === 'error') {
        throw new Error(`Transcription failed: ${result.error || 'Unknown error'}`);
      }

      // Still processing - wait before polling again
      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }

    throw new Error(`Transcription timed out after ${maxWait / 1000} seconds`);
  }

  /**
   * Check transcription status
   */
  async checkStatus(transcriptId) {
    return new Promise((resolve, reject) => {
      const options = {
        method: 'GET',
        hostname: 'api.assemblyai.com',
        path: `/v2/transcript/${transcriptId}`,
        headers: {
          'authorization': this.apiKey
        }
      };

      const req = https.request(options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          if (res.statusCode === 200) {
            resolve(JSON.parse(data));
          } else {
            reject(new Error(`Status check failed: ${res.statusCode} - ${data}`));
          }
        });
      });

      req.on('error', (error) => {
        reject(new Error(`Status check request failed: ${error.message}`));
      });

      req.end();
    });
  }

  /**
   * Main transcribe method
   */
  async transcribe(fileBuffer) {
    try {
      console.log('Starting AssemblyAI transcription...');
      
      // Step 1: Upload file
      const uploadUrl = await this.uploadFile(fileBuffer);
      console.log('File uploaded successfully');
      
      // Step 2: Request transcription
      const transcriptId = await this.requestTranscription(uploadUrl);
      console.log(`Transcription requested, ID: ${transcriptId}`);
      
      // Step 3: Wait for completion
      const transcript = await this.waitForCompletion(transcriptId);
      console.log('Transcription completed successfully');
      
      return transcript;
    } catch (error) {
      console.error('AssemblyAI transcription error:', error);
      throw new Error(`AssemblyAI transcription failed: ${error.message}`);
    }
  }
}

module.exports = AssemblyAITranscriber;

