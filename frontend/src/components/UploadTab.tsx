import React, { useState, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  FormControl,
  FormLabel,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Chip,
  Alert,
  LinearProgress,
  Paper,
} from '@mui/material';
import {
  CloudUpload,
  Mic,
  CheckCircle,
  Error as ErrorIcon,
} from '@mui/icons-material';
import { useDropzone } from 'react-dropzone';
import { apiService, TranscriptionResponse } from '../utils/api';

interface UploadTabProps {
  onTranscriptionComplete: () => void;
  availableTranscribers: string[];
  selectedModels: string[];
  onModelsChange: (models: string[]) => void;
  onLoadingChange: (loading: boolean) => void;
  onShowSnackbar: (message: string, severity: 'success' | 'error' | 'warning' | 'info') => void;
}

const modelNames: { [key: string]: string } = {
  speechmatics: 'Speechmatics',
  google: 'Google Speech-to-Text',
  whisper: 'OpenAI Whisper',
  assemblyai: 'AssemblyAI',
};

const modelDescriptions: { [key: string]: string } = {
  speechmatics: 'Commercial speech recognition API with enhanced Latvian support',
  google: 'Google Cloud\'s speech recognition service with latest models',
  whisper: 'Open-source speech recognition model (runs locally)',
  assemblyai: 'High-accuracy speech recognition with excellent Latvian support',
};

const UploadTab: React.FC<UploadTabProps> = ({
  onTranscriptionComplete,
  availableTranscribers,
  selectedModels,
  onModelsChange,
  onLoadingChange,
  onShowSnackbar,
}) => {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [transcriptionResults, setTranscriptionResults] = useState<TranscriptionResponse | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      setUploadedFile(file);
      setTranscriptionResults(null);
      onShowSnackbar(`File selected: ${file.name}`, 'success');
    }
  }, [onShowSnackbar]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'audio/*': ['.wav', '.mp3', '.m4a', '.flac', '.ogg'],
    },
    multiple: false,
  });

  const handleModelToggle = (modelId: string) => {
    const newModels = selectedModels.includes(modelId)
      ? selectedModels.filter(id => id !== modelId)
      : [...selectedModels, modelId];
    onModelsChange(newModels);
  };

  const handleUploadAndTranscribe = async () => {
    if (!uploadedFile || selectedModels.length === 0) {
      onShowSnackbar('Please select a file and at least one model', 'warning');
      return;
    }

    setIsUploading(true);
    onLoadingChange(true);
    setUploadProgress(0);

    try {
      let transcriptionResponse;
      
      if (process.env.NODE_ENV === 'production') {
        // For Vercel, send file directly to transcribe endpoint (single-step)
        setUploadProgress(25);
        transcriptionResponse = await apiService.transcribeAudioDirect(uploadedFile, selectedModels);
        setUploadProgress(100);
      } else {
        // For local development, use two-step process
        setUploadProgress(25);
        const uploadResponse = await apiService.uploadFile(uploadedFile);
        setUploadProgress(50);
        transcriptionResponse = await apiService.transcribeAudio(
          uploadResponse.filename,
          selectedModels
        );
        setUploadProgress(100);
      }
      
      setTranscriptionResults(transcriptionResponse);
      // Persist latest results locally so Results tab can show them on Vercel (no shared FS)
      try {
        const entry = {
          timestamp: Date.now(),
          filename: (transcriptionResponse as any).filename || uploadedFile.name,
          results: (transcriptionResponse as any).results || [],
        };
        // last item convenience
        localStorage.setItem('lastTranscription', JSON.stringify(entry));
        // append to session history (per-browser)
        const historyRaw = localStorage.getItem('transcriptionHistory');
        const history = historyRaw ? JSON.parse(historyRaw) : [];
        history.unshift(entry);
        // keep last 10 items
        localStorage.setItem('transcriptionHistory', JSON.stringify(history.slice(0, 10)));
      } catch {}
      onTranscriptionComplete();
      onShowSnackbar('Transcription completed successfully!', 'success');
      
    } catch (error: any) {
      console.error('Transcription error:', error);
      onShowSnackbar(
        error.response?.data?.error || 'Transcription failed. Please try again.',
        'error'
      );
    } finally {
      setIsUploading(false);
      onLoadingChange(false);
      setUploadProgress(0);
    }
  };

  const handleClearResults = () => {
    setUploadedFile(null);
    setTranscriptionResults(null);
    setUploadProgress(0);
  };

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" gutterBottom sx={{ fontWeight: 700, mb: 1 }}>
          Upload Your Audio
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Upload a Latvian audio file and select which transcription models you want to test
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {/* Upload Section */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <CloudUpload sx={{ mr: 1, verticalAlign: 'middle' }} />
                Upload Audio File
              </Typography>
              
              <Paper
                {...getRootProps()}
                sx={{
                  p: 4,
                  textAlign: 'center',
                  border: '2px dashed',
                  borderColor: isDragActive ? 'primary.main' : 'grey.300',
                  bgcolor: isDragActive ? 'primary.50' : 'grey.50',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    borderColor: 'primary.main',
                    bgcolor: 'primary.50',
                  },
                }}
              >
                <input {...getInputProps()} />
                <Mic sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
                <Typography variant="h6" gutterBottom>
                  {isDragActive ? 'Drop the audio file here' : 'Drag & drop audio file here'}
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  or click to select a file
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Supported formats: WAV, MP3, M4A, FLAC, OGG
                </Typography>
              </Paper>

              {uploadedFile && (
                <Box sx={{ mt: 2 }}>
                  <Alert severity="success" sx={{ mb: 2 }}>
                    <Typography variant="body2">
                      <strong>Selected:</strong> {uploadedFile.name}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Size:</strong> {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
                    </Typography>
                  </Alert>
                </Box>
              )}

              {isUploading && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="body2" gutterBottom>
                    Uploading and processing...
                  </Typography>
                  <LinearProgress variant="determinate" value={uploadProgress} />
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Model Selection */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <Mic sx={{ mr: 1, verticalAlign: 'middle' }} />
                Select Transcription Models
              </Typography>
              
              <FormControl component="fieldset" fullWidth>
                <FormLabel component="legend" sx={{ mb: 2 }}>
                  Available Models ({selectedModels.length} selected)
                </FormLabel>
                <FormGroup>
                  {availableTranscribers.map((modelId) => (
                    <FormControlLabel
                      key={modelId}
                      control={
                        <Checkbox
                          checked={selectedModels.includes(modelId)}
                          onChange={() => handleModelToggle(modelId)}
                          color="primary"
                        />
                      }
                      label={
                        <Box>
                          <Typography variant="body1" fontWeight={500}>
                            {modelNames[modelId] || modelId}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {modelDescriptions[modelId] || 'Description not available'}
                          </Typography>
                        </Box>
                      }
                    />
                  ))}
                </FormGroup>
              </FormControl>

              {selectedModels.length > 0 && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="body2" gutterBottom>
                    Selected models:
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {selectedModels.map((modelId) => (
                      <Chip
                        key={modelId}
                        label={modelNames[modelId] || modelId}
                        color="primary"
                        size="small"
                        onDelete={() => handleModelToggle(modelId)}
                      />
                    ))}
                  </Box>
                </Box>
              )}

              <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
                <Button
                  variant="contained"
                  onClick={handleUploadAndTranscribe}
                  disabled={!uploadedFile || selectedModels.length === 0 || isUploading}
                  fullWidth
                >
                  Start Transcription
                </Button>
                <Button
                  variant="outlined"
                  onClick={handleClearResults}
                  disabled={isUploading}
                >
                  Clear
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Quick Results Preview */}
        {transcriptionResults && (
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  <CheckCircle sx={{ mr: 1, verticalAlign: 'middle', color: 'success.main' }} />
                  Transcription Complete
                </Typography>
                
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={4}>
                    <Typography variant="body2" color="text.secondary">
                      Total Models: {transcriptionResults.results.length}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Typography variant="body2" color="success.main">
                      Successful: {transcriptionResults.results.filter(r => r.status === 'success').length}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Typography variant="body2" color="error.main">
                      Failed: {transcriptionResults.results.filter(r => r.status === 'error').length}
                    </Typography>
                  </Grid>
                </Grid>

                <Box sx={{ mt: 2 }}>
                  <Typography variant="body2" gutterBottom>
                    Check the Results tab for detailed transcriptions and download options.
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>
    </Box>
  );
};

export default UploadTab;
