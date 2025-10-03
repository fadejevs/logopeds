const https = require('https');
const fs = require('fs');
const path = require('path');

class WhisperTranscriber {
  constructor() {
    this.name = 'OpenAI Whisper';
    this.language = 'lv'; // Latvian
    
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OpenAI API key not configured');
    }
    this.apiKey = process.env.OPENAI_API_KEY;
  }

  async transcribe(audioFilePath) {
    try {
      // Read the audio file
      const audioBuffer = fs.readFileSync(audioFilePath);
      const filename = path.basename(audioFilePath);
      
      // Create multipart form data manually
      const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
      const formData = this.buildFormData(audioBuffer, filename, boundary);
      
      return new Promise((resolve, reject) => {
        const options = {
          method: 'POST',
          hostname: 'api.openai.com',
          path: '/v1/audio/transcriptions',
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
            if (res.statusCode === 200) {
              resolve(data.trim());
            } else {
              try {
                const errorData = JSON.parse(data);
                reject(new Error(`OpenAI API error: ${res.statusCode} - ${errorData.error?.message || data}`));
              } catch (e) {
                reject(new Error(`OpenAI API error: ${res.statusCode} - ${data}`));
              }
            }
          });
        });

        req.on('error', (error) => {
          reject(new Error(`Whisper transcription request failed: ${error.message}`));
        });

        req.write(formData);
        req.end();
      });
      
    } catch (error) {
      throw new Error(`Whisper transcription failed: ${error.message}`);
    }
  }

  buildFormData(audioBuffer, filename, boundary) {
    const parts = [];
    
    // Add file field
    parts.push(`--${boundary}\r\n`);
    parts.push(`Content-Disposition: form-data; name="file"; filename="${filename}"\r\n`);
    parts.push(`Content-Type: application/octet-stream\r\n\r\n`);
    
    // Add model field
    parts.push(`\r\n--${boundary}\r\n`);
    parts.push(`Content-Disposition: form-data; name="model"\r\n\r\n`);
    parts.push(`whisper-1\r\n`);
    
    // Add language field
    parts.push(`--${boundary}\r\n`);
    parts.push(`Content-Disposition: form-data; name="language"\r\n\r\n`);
    parts.push(`lv\r\n`);
    
    // Add response_format field
    parts.push(`--${boundary}\r\n`);
    parts.push(`Content-Disposition: form-data; name="response_format"\r\n\r\n`);
    parts.push(`text\r\n`);
    
    // End boundary
    parts.push(`--${boundary}--\r\n`);
    
    // Combine text parts
    const header = Buffer.from(parts.slice(0, 3).join(''), 'utf8');
    const footer = Buffer.from(parts.slice(3).join(''), 'utf8');
    
    return Buffer.concat([header, audioBuffer, footer]);
  }
}

module.exports = { WhisperTranscriber };
