import React, { useState, useEffect } from 'react';
import {
  ThemeProvider,
  createTheme,
  CssBaseline,
  Container,
  AppBar,
  Toolbar,
  Typography,
  Box,
  Tabs,
  Tab,
  Alert,
  CircularProgress,
  Snackbar,
  Chip
} from '@mui/material';
import UploadTab from './components/UploadTab';
import ResultsTab from './components/ResultsTab';
import { API_BASE_URL } from './utils/api';

// Create Material-UI theme - Clean and minimal
const theme = createTheme({
  palette: {
    primary: {
      main: '#2c3e50', // Professional dark blue-gray
      light: '#34495e',
      dark: '#1a252f',
    },
    secondary: {
      main: '#3498db', // Clean blue accent
      light: '#5dade2',
      dark: '#2980b9',
    },
    background: {
      default: '#f8f9fa',
      paper: '#ffffff',
    },
    text: {
      primary: '#2c3e50',
      secondary: '#7f8c8d',
    },
    mode: 'light',
  },
  typography: {
    fontFamily: '"Inter", "SF Pro Display", -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", sans-serif',
    h4: {
      fontWeight: 700,
      fontSize: '1.75rem',
      letterSpacing: '-0.02em',
    },
    h5: {
      fontWeight: 600,
      fontSize: '1.5rem',
      letterSpacing: '-0.01em',
    },
    h6: {
      fontWeight: 600,
      fontSize: '1.125rem',
    },
    body1: {
      fontSize: '0.95rem',
      lineHeight: 1.6,
    },
    button: {
      fontWeight: 500,
    },
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 8,
          padding: '10px 24px',
          fontSize: '0.95rem',
          fontWeight: 500,
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          },
        },
        contained: {
          '&:hover': {
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
          border: '1px solid #e9ecef',
          transition: 'all 0.2s ease',
          '&:hover': {
            boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
          },
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          fontWeight: 500,
        },
      },
    },
  },
});

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 4 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

function App() {
  const [currentTab, setCurrentTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error' | 'warning' | 'info'
  });
  const [availableTranscribers, setAvailableTranscribers] = useState<any[]>([]);
  const [selectedModels, setSelectedModels] = useState<string[]>([]);

  // Check backend health on app start
  useEffect(() => {
    checkBackendHealth();
  }, []);

  const checkBackendHealth = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/health`);
      const data = await response.json();
      
      if (data.status === 'healthy') {
        setAvailableTranscribers(data.available_transcribers || []);
        setSelectedModels(data.available_transcribers || []);
        showSnackbar('Backend connected successfully', 'success');
      } else {
        showSnackbar('Backend health check failed', 'error');
      }
    } catch (error) {
      console.error('Backend health check failed:', error);
      showSnackbar('Cannot connect to backend. Please ensure the Flask server is running.', 'error');
    }
  };

  const showSnackbar = (message: string, severity: 'success' | 'error' | 'warning' | 'info') => {
    setSnackbar({
      open: true,
      message,
      severity
    });
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  };

  const handleTranscriptionComplete = () => {
    setCurrentTab(1); // Switch to results tab
    showSnackbar('Transcription completed! Check the results tab.', 'success');
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ flexGrow: 1 }}>
        <AppBar position="static" elevation={0} sx={{ bgcolor: 'white', color: 'primary.main', borderBottom: '1px solid #e9ecef' }}>
          <Toolbar sx={{ py: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box sx={{ 
                width: 40, 
                height: 40, 
                borderRadius: 2,
                bgcolor: '',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '1.25rem',
                fontWeight: 600,
              }}>
                🇱🇻
              </Box>
              <Box>
                <Typography variant="h6" component="div" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                 Transkripcijas tests
                </Typography>
              </Box>
            </Box>
            <Box sx={{ flexGrow: 1 }} />
          </Toolbar>
        </AppBar>

        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
          <Box sx={{ 
            bgcolor: 'white',
            borderRadius: 3,
            border: '1px solid #e9ecef',
            overflow: 'hidden',
          }}>
            <Box sx={{ 
              borderBottom: 1, 
              borderColor: 'divider',
              px: 2,
            }}>
              <Tabs 
                value={currentTab} 
                onChange={handleTabChange} 
                aria-label="transcription tabs"
                sx={{
                  '& .MuiTab-root': {
                    textTransform: 'none',
                    fontWeight: 500,
                    fontSize: '0.95rem',
                    minHeight: 56,
                  },
                }}
              >
                <Tab label="Upload & Transcribe" />
                <Tab label="Results" />
              </Tabs>
            </Box>

          <TabPanel value={currentTab} index={0}>
            <UploadTab
              onTranscriptionComplete={handleTranscriptionComplete}
              availableTranscribers={availableTranscribers}
              selectedModels={selectedModels}
              onModelsChange={setSelectedModels}
              onLoadingChange={setLoading}
              onShowSnackbar={showSnackbar}
            />
          </TabPanel>

          <TabPanel value={currentTab} index={1}>
            <ResultsTab
              onShowSnackbar={showSnackbar}
              onTranscriptionComplete={(filename) => {
                // Refresh files list when transcription completes
                console.log('Transcription completed for:', filename);
              }}
            />
          </TabPanel>

          </Box>
        </Container>

        {loading && (
          <Box
            sx={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              bgcolor: 'rgba(0,0,0,0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 9999,
            }}
          >
            <Box sx={{ textAlign: 'center', color: 'white' }}>
              <CircularProgress size={60} sx={{ mb: 2 }} />
              <Typography variant="h6">Processing transcription...</Typography>
              <Typography variant="body2" sx={{ mt: 1 }}>
                This may take a few moments
              </Typography>
            </Box>
          </Box>
        )}
      </Box>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </ThemeProvider>
  );
}

export default App;