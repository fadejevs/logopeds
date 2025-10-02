import axios from 'axios';

// Use Vercel API routes when deployed, local backend when developing
export const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://logopeds.vercel.app' 
  : 'http://localhost:5001';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 300000, // 5 minutes timeout for transcription
});

// Add request interceptor for debugging
api.interceptors.request.use(
  (config) => {
    console.log('API Request:', config.method?.toUpperCase(), config.url);
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor for debugging
api.interceptors.response.use(
  (response) => {
    console.log('API Response:', response.status, response.config.url);
    return response;
  },
  (error) => {
    console.error('API Error:', error.response?.status, error.config?.url, error.message);
    return Promise.reject(error);
  }
);

export interface FileInfo {
  filename: string;
  size: number;
  upload_time: string;
}

export interface TranscriptionResult {
  model_id: string;
  status: 'success' | 'error';
  transcript?: string;
  error?: string;
  processing_time: number;
}

export interface FileResults {
  filename: string;
  results: TranscriptionResult[];
}

export interface TranscriptionResponse {
  message: string;
  results: TranscriptionResult[];
  summary_file: string;
}

export const apiService = {
  // Health check
  async checkHealth() {
    const response = await api.get('/api/health');
    return response.data;
  },

  // Get available transcribers
  async getTranscribers() {
    const response = await api.get('/api/transcribers');
    return response.data;
  },

  // Upload audio file
  async uploadFile(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await api.post('/api/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Transcribe audio (two-step for local development)
  async transcribeAudio(filename: string, models: string[]) {
    const response = await api.post('/api/transcribe', { filename, models });
    return response.data;
  },

  // Transcribe audio directly with file (single-step for production)
  async transcribeAudioDirect(file: File, models: string[]) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('models', JSON.stringify(models));
    
    const response = await api.post('/api/transcribe', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Get transcription results
  async getResults(filename: string) {
    const response = await api.get(`/api/results/${filename}`);
    return response.data;
  },

  // List uploaded files
  async listFiles() {
    const response = await api.get('/api/files');
    return response.data;
  },

  // Download file
  async downloadFile(filename: string) {
    const response = await api.get(`/api/download/${filename}`, {
      responseType: 'blob',
    });
    return response.data;
  },

  // Delete results for a specific file
  async deleteResults(filename: string) {
    const response = await api.delete(`/api/results/${filename}`);
    return response.data;
  },

  // Bulk delete results for multiple files
  async bulkDeleteResults(filenames: string[]) {
    const response = await api.delete('/api/results/bulk', {
      data: { filenames }
    });
    return response.data;
  },

  // Delete audio file and its results
  async deleteAudioFile(filename: string) {
    const response = await api.delete(`/api/files/${filename}`);
    return response.data;
  },
};

export default api;