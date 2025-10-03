const https = require('https');
const fs = require('fs');
const path = require('path');

class SpeechmaticsTranscriber {
  constructor() {
    this.apiKey = process.env.SPEECHMATICS_API_KEY;
    this.baseUrl = 'https://asr.api.speechmatics.com/v2';
    
    if (!this.apiKey) {
      throw new Error('Speechmatics API key is required');
    }
  }

  async transcribe(audioFilePath) {
    try {
      // Upload file and start transcription
      const jobId = await this.uploadFile(audioFilePath);
      
      // Wait for completion
      const result = await this.waitForCompletion(jobId);
      
      return result.transcript;
    } catch (error) {
      throw new Error(`Speechmatics transcription failed: ${error.message}`);
    }
  }

  async uploadFile(audioFilePath) {
    const audioBuffer = fs.readFileSync(audioFilePath);
    const filename = path.basename(audioFilePath);
    
    // Detect mime type
    const ext = path.extname(audioFilePath).toLowerCase();
    let mimeType = 'audio/mpeg';
    if (ext === '.wav') mimeType = 'audio/wav';
    else if (ext === '.mp3') mimeType = 'audio/mpeg';
    else if (ext === '.m4a' || ext === '.mp4') mimeType = 'audio/mp4';
    else if (ext === '.flac') mimeType = 'audio/flac';
    else if (ext === '.ogg') mimeType = 'audio/ogg';

    const jobConfig = {
      type: 'transcription',
      transcription_config: {
        language: 'lv', // Latvian
        operating_point: 'enhanced'
      }
    };

    // Create multipart form data manually
    const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
    const formData = this.buildFormData(audioBuffer, filename, mimeType, jobConfig, boundary);

    return new Promise((resolve, reject) => {
      const options = {
        method: 'POST',
        hostname: 'asr.api.speechmatics.com',
        path: '/v2/jobs',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': `multipart/form-data; boundary=${boundary}`,
          'Content-Length': Buffer.byteLength(formData)
        }
      };

      const req = https.request(options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          if (res.statusCode === 200 || res.statusCode === 201) {
            try {
              const result = JSON.parse(data);
              resolve(result.id);
            } catch (e) {
              reject(new Error(`Failed to parse response: ${data}`));
            }
          } else {
            reject(new Error(`Upload failed: ${res.statusCode} ${res.statusText} - ${data}`));
          }
        });
      });

      req.on('error', (error) => {
        reject(new Error(`Upload request failed: ${error.message}`));
      });

      req.write(formData);
      req.end();
    });
  }

  buildFormData(audioBuffer, filename, mimeType, config, boundary) {
    const parts = [];
    
    // Add data_file field
    parts.push(`--${boundary}\r\n`);
    parts.push(`Content-Disposition: form-data; name="data_file"; filename="${filename}"\r\n`);
    parts.push(`Content-Type: ${mimeType}\r\n\r\n`);
    
    // Add config field
    const configStr = JSON.stringify(config);
    parts.push(`\r\n--${boundary}\r\n`);
    parts.push(`Content-Disposition: form-data; name="config"\r\n\r\n`);
    parts.push(`${configStr}\r\n`);
    
    // End boundary
    parts.push(`--${boundary}--\r\n`);
    
    // Combine parts
    const header = Buffer.from(parts.slice(0, 3).join(''), 'utf8');
    const footer = Buffer.from(parts.slice(3).join(''), 'utf8');
    
    return Buffer.concat([header, audioBuffer, footer]);
  }

  async waitForCompletion(jobId, timeout = 300000) {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      try {
        // Check job status
        const statusData = await this.checkStatus(jobId);
        const jobStatus = statusData.job?.status;
        
        if (jobStatus === 'done') {
          // Get transcript
          const transcript = await this.getTranscript(jobId);
          return { transcript: transcript.trim() };
        }
        
        if (jobStatus === 'rejected') {
          throw new Error(`Job rejected: ${JSON.stringify(statusData)}`);
        }
        
        // Wait 2 seconds before checking again
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        if (Date.now() - startTime >= timeout) {
          throw new Error(`Transcription timeout after ${timeout}ms`);
        }
        throw error;
      }
    }
    
    throw new Error(`Transcription timeout after ${timeout}ms`);
  }

  async checkStatus(jobId) {
    return new Promise((resolve, reject) => {
      const options = {
        method: 'GET',
        hostname: 'asr.api.speechmatics.com',
        path: `/v2/jobs/${jobId}`,
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      };

      const req = https.request(options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          if (res.statusCode === 200) {
            try {
              resolve(JSON.parse(data));
            } catch (e) {
              reject(new Error(`Failed to parse status response: ${data}`));
            }
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

  async getTranscript(jobId) {
    return new Promise((resolve, reject) => {
      const options = {
        method: 'GET',
        hostname: 'asr.api.speechmatics.com',
        path: `/v2/jobs/${jobId}/transcript?format=txt`,
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      };

      const req = https.request(options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          if (res.statusCode === 200) {
            resolve(data);
          } else {
            reject(new Error(`Result fetch failed: ${res.statusCode} - ${data}`));
          }
        });
      });

      req.on('error', (error) => {
        reject(new Error(`Transcript fetch request failed: ${error.message}`));
      });

      req.end();
    });
  }
}

module.exports = { SpeechmaticsTranscriber };
