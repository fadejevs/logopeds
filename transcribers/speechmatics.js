const fetch = require('node-fetch');
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
    const uploadUrl = `${this.baseUrl}/jobs`;
    
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

    const formData = new FormData();
    formData.append('data_file', new Blob([fs.readFileSync(audioFilePath)], { type: mimeType }), path.basename(audioFilePath));
    formData.append('config', JSON.stringify(jobConfig));

    const response = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: formData
    });

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.id;
  }

  async waitForCompletion(jobId, timeout = 300000) {
    const statusUrl = `${this.baseUrl}/jobs/${jobId}`;
    const resultUrl = `${this.baseUrl}/jobs/${jobId}/transcript?format=txt`;
    
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      const statusResponse = await fetch(statusUrl, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });
      
      if (!statusResponse.ok) {
        throw new Error(`Status check failed: ${statusResponse.status}`);
      }
      
      const statusData = await statusResponse.json();
      const jobStatus = statusData.job?.status;
      
      if (jobStatus === 'done') {
        const resultResponse = await fetch(resultUrl, {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`
          }
        });
        
        if (!resultResponse.ok) {
          throw new Error(`Result fetch failed: ${resultResponse.status}`);
        }
        
        const transcript = await resultResponse.text();
        return { transcript: transcript.trim() };
      }
      
      if (jobStatus === 'rejected') {
        throw new Error(`Job rejected: ${JSON.stringify(statusData)}`);
      }
      
      // Wait 2 seconds before checking again
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    throw new Error(`Transcription timeout after ${timeout}ms`);
  }
}

module.exports = { SpeechmaticsTranscriber };
