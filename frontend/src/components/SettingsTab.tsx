import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Alert,
  Chip,
  Button,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Tooltip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import {
  CheckCircle,
  Error as ErrorIcon,
  Warning,
  Info,
  ExpandMore,
  Refresh,
  Settings as SettingsIcon,
  Api,
  Language,
  Speed,
} from '@mui/icons-material';
import { apiService } from '../utils/api';

interface SettingsTabProps {
  availableTranscribers: string[];
  onShowSnackbar: (message: string, severity: 'success' | 'error' | 'warning' | 'info') => void;
}

interface HealthInfo {
  status: string;
  available_transcribers: string[];
  timestamp: string;
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
  whisper: 'Open-source speech recognition model',
  assemblyai: 'High-accuracy speech recognition with excellent Latvian support',
};

const modelFeatures: { [key: string]: string[] } = {
  speechmatics: ['Enhanced Latvian support', 'Real-time processing', 'High accuracy'],
  google: ['Latest models', 'Cloud processing', 'Multiple languages'],
  whisper: ['Local processing', 'No API key required', 'Open source'],
  assemblyai: ['High accuracy', 'Fast processing', 'Easy integration'],
};

const SettingsTab: React.FC<SettingsTabProps> = ({
  availableTranscribers,
  onShowSnackbar,
}) => {
  const [healthInfo, setHealthInfo] = useState<HealthInfo | null>(null);
  const [loading, setLoading] = useState(false);

  const checkHealth = async () => {
    setLoading(true);
    try {
      const response = await apiService.checkHealth();
      setHealthInfo(response);
      onShowSnackbar('Health check completed', 'success');
    } catch (error) {
      console.error('Health check failed:', error);
      onShowSnackbar('Health check failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkHealth();
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle color="success" />;
      case 'warning':
        return <Warning color="warning" />;
      case 'error':
        return <ErrorIcon color="error" />;
      default:
        return <Info color="info" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'success';
      case 'warning':
        return 'warning';
      case 'error':
        return 'error';
      default:
        return 'info';
    }
  };

  return (
    <Box>
      <Typography variant="h5" gutterBottom sx={{ fontWeight: 600, mb: 3 }}>
        System Settings & Status
      </Typography>

      <Grid container spacing={3}>
        {/* System Status */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <SettingsIcon sx={{ mr: 1 }} />
                <Typography variant="h6">System Status</Typography>
              </Box>

              {healthInfo ? (
                <Box>
                  <Alert
                    severity={getStatusColor(healthInfo.status) as any}
                    icon={getStatusIcon(healthInfo.status)}
                    sx={{ mb: 2 }}
                  >
                    Backend Status: {healthInfo.status.toUpperCase()}
                  </Alert>

                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      Last checked: {new Date(healthInfo.timestamp).toLocaleString()}
                    </Typography>
                  </Box>

                  <Button
                    variant="outlined"
                    startIcon={<Refresh />}
                    onClick={checkHealth}
                    disabled={loading}
                    size="small"
                  >
                    Refresh Status
                  </Button>
                </Box>
              ) : (
                <Alert severity="info">
                  Click "Refresh Status" to check system health
                </Alert>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Available Models */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Api sx={{ mr: 1 }} />
                <Typography variant="h6">Available Models</Typography>
              </Box>

              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {availableTranscribers.length} of 4 models available
              </Typography>

              <List dense>
                {availableTranscribers.map((modelId) => (
                  <ListItem key={modelId}>
                    <ListItemIcon>
                      <CheckCircle color="success" />
                    </ListItemIcon>
                    <ListItemText
                      primary={modelNames[modelId] || modelId}
                      secondary={modelDescriptions[modelId] || 'Description not available'}
                    />
                  </ListItem>
                ))}
              </List>

              {availableTranscribers.length < 4 && (
                <Alert severity="warning" sx={{ mt: 2 }}>
                  Some models may not be available. Check your API keys and configuration.
                </Alert>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Model Details */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Model Information & Features
              </Typography>

              <Grid container spacing={2}>
                {Object.entries(modelNames).map(([modelId, modelName]) => (
                  <Grid item xs={12} md={6} key={modelId}>
                    <Accordion>
                      <AccordionSummary expandIcon={<ExpandMore />}>
                        <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                          <Typography variant="subtitle1" sx={{ flexGrow: 1 }}>
                            {modelName}
                          </Typography>
                          <Chip
                            label={availableTranscribers.includes(modelId) ? 'Available' : 'Unavailable'}
                            color={availableTranscribers.includes(modelId) ? 'success' : 'default'}
                            size="small"
                          />
                        </Box>
                      </AccordionSummary>
                      <AccordionDetails>
                        <Box>
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                            {modelDescriptions[modelId]}
                          </Typography>

                          <Typography variant="subtitle2" gutterBottom>
                            Features:
                          </Typography>
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                            {modelFeatures[modelId]?.map((feature) => (
                              <Chip
                                key={feature}
                                label={feature}
                                size="small"
                                variant="outlined"
                              />
                            ))}
                          </Box>

                          <Typography variant="subtitle2" gutterBottom>
                            Language Support:
                          </Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Language fontSize="small" />
                            <Typography variant="body2">
                              Latvian (lv) - Forced language detection
                            </Typography>
                          </Box>
                        </Box>
                      </AccordionDetails>
                    </Accordion>
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Configuration Help */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Configuration Help
              </Typography>

              <Alert severity="info" sx={{ mb: 2 }}>
                To enable all transcription models, ensure you have the required API keys configured in your .env file.
              </Alert>

              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" gutterBottom>
                    Required API Keys:
                  </Typography>
                  <List dense>
                    <ListItem>
                      <ListItemText
                        primary="Speechmatics"
                        secondary="Get from speechmatics.com"
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText
                        primary="Google Cloud"
                        secondary="Download credentials.json from Google Cloud Console"
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText
                        primary="Anthropic"
                        secondary="Get from console.anthropic.com"
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText
                        primary="Whisper"
                        secondary="No API key required (local model)"
                      />
                    </ListItem>
                  </List>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" gutterBottom>
                    File Requirements:
                  </Typography>
                  <List dense>
                    <ListItem>
                      <ListItemText
                        primary="Supported Formats"
                        secondary="WAV, MP3, M4A, FLAC, OGG"
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText
                        primary="Recommended"
                        secondary="WAV format, 16kHz sample rate"
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText
                        primary="File Size"
                        secondary="Up to 100MB per file"
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText
                        primary="Language"
                        secondary="Latvian (automatically forced)"
                      />
                    </ListItem>
                  </List>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default SettingsTab;
