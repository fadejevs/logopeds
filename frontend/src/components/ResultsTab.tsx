import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Alert,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import {
  Download,
  Visibility,
  Refresh,
  ContentCopy,
  CheckCircle,
  Error as ErrorIcon,
  Schedule,
  Delete,
  SelectAll,
  Clear,
} from '@mui/icons-material';
import { apiService, TranscriptionResult } from '../utils/api';

interface ResultsTabProps {
  onShowSnackbar: (message: string, severity: 'success' | 'error' | 'warning' | 'info') => void;
  onTranscriptionComplete?: (filename: string) => void;
}

interface FileInfo {
  filename: string;
  size: number;
  upload_time: string;
}

interface FileResults {
  filename: string;
  results: TranscriptionResult[];
}

const modelNames: { [key: string]: string } = {
  speechmatics: 'Speechmatics',
  google: 'Google Speech-to-Text',
  whisper: 'OpenAI Whisper',
  assemblyai: 'AssemblyAI',
};

const ResultsTab: React.FC<ResultsTabProps> = ({ onShowSnackbar, onTranscriptionComplete }) => {
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [selectedFile, setSelectedFile] = useState<string>('');
  const [fileResults, setFileResults] = useState<FileResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<string | null>(null);
  const [filesWithResults, setFilesWithResults] = useState<Set<string>>(new Set());

  // localStorage functions
  const getFilesWithResults = (): Set<string> => {
    try {
      const stored = localStorage.getItem('filesWithResults');
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  };

  const saveFilesWithResults = (files: Set<string>) => {
    try {
      localStorage.setItem('filesWithResults', JSON.stringify(Array.from(files)));
    } catch (error) {
      console.error('Failed to save files with results:', error);
    }
  };

  const addFileWithResults = (filename: string) => {
    const updated = new Set(filesWithResults);
    updated.add(filename);
    setFilesWithResults(updated);
    saveFilesWithResults(updated);
  };

  const removeFileWithResults = (filename: string) => {
    const updated = new Set(filesWithResults);
    updated.delete(filename);
    setFilesWithResults(updated);
    saveFilesWithResults(updated);
  };

  const [transcriptDialog, setTranscriptDialog] = useState<{
    open: boolean;
    title: string;
    content: string;
  }>({
    open: false,
    title: '',
    content: '',
  });

  useEffect(() => {
    loadFiles();
    setFilesWithResults(getFilesWithResults());
    // Always merge local session history into the list for live demo simplicity
    try {
      const historyRaw = localStorage.getItem('transcriptionHistory');
      const history = historyRaw ? JSON.parse(historyRaw) : [];
      if (history.length > 0) {
        const localFiles = history.map((h: any, idx: number) => ({
          filename: h.filename || `session-${idx + 1}`,
          size: 0,
          upload_time: new Date(h.timestamp || Date.now()).toISOString(),
        }));
        setFiles(prev => {
          const existing = new Set(prev.map(f => f.filename));
          const merged = [...prev];
          for (const lf of localFiles) {
            if (!existing.has(lf.filename)) merged.unshift(lf);
          }
          return merged;
        });
      }
    } catch {}
  }, []);

  // Refresh when Upload tab signals completion (same tab navigation)
  useEffect(() => {
    const i = setInterval(() => {
      try {
        const stamp = sessionStorage.getItem('refreshResults');
        if (stamp && stamp !== (window as any)._lastRefreshResults) {
          (window as any)._lastRefreshResults = stamp;
          loadFiles();
        }
      } catch {}
    }, 1500);
    return () => clearInterval(i);
  }, []);

  const getLocalHistoryFiles = (): FileInfo[] => {
    try {
      const historyRaw = localStorage.getItem('transcriptionHistory');
      const history = historyRaw ? JSON.parse(historyRaw) : [];
      return (history || []).map((h: any, idx: number) => ({
        filename: h.filename || `session-${idx + 1}`,
        size: 0,
        upload_time: new Date(h.timestamp || Date.now()).toISOString(),
      }));
    } catch {
      return [];
    }
  };

  const mergeUnique = (a: FileInfo[], b: FileInfo[]): FileInfo[] => {
    const map = new Map<string, FileInfo>();
    [...a, ...b].forEach((f) => { map.set(f.filename, f); });
    // newest first
    return Array.from(map.values()).sort((x, y) => new Date(y.upload_time).getTime() - new Date(x.upload_time).getTime());
  };

  const loadFiles = async () => {
    // Start with local session history so UI is never empty on live
    const localFiles = getLocalHistoryFiles();
    if (localFiles.length > 0) {
      setFiles(localFiles);
    }
    try {
      const response = await apiService.listFiles();
      const serverFiles = (response.files || []).sort((a: FileInfo, b: FileInfo) =>
        new Date(b.upload_time).getTime() - new Date(a.upload_time).getTime()
      );
      setFiles((prev) => mergeUnique(prev.length ? prev : localFiles, serverFiles));
    } catch (error) {
      // Keep local files if server listing fails
      console.error('Failed to load files:', error);
    }
  };

  const loadFileResults = async (filename: string) => {
    setLoading(true);
    try {
      // First try to get results from localStorage
      const localStorageKey = `transcription_results_${filename}`;
      const storedResults = localStorage.getItem(localStorageKey);
      
      if (storedResults) {
        const parsedResults = JSON.parse(storedResults);
        setFileResults(parsedResults);
        addFileWithResults(filename);
        setLoading(false);
        return;
      }
      
      // If not in localStorage, try API
      const response = await apiService.getResults(filename);
      setFileResults(response);
      
      // Store in localStorage for future use
      if (response && response.results && response.results.length > 0) {
        localStorage.setItem(localStorageKey, JSON.stringify(response));
        addFileWithResults(filename);
      }
    } catch (error) {
      console.error('Failed to load results:', error);
      onShowSnackbar('No results found for this file', 'warning');
      setFileResults(null);
      // Remove from files with results if no results found
      removeFileWithResults(filename);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (filename: string) => {
    setSelectedFile(filename);
    loadFileResults(filename);
  };

  const handleDeleteClick = (filename: string) => {
    setFileToDelete(filename);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!fileToDelete) return;
    
    try {
      setLoading(true);
      await apiService.deleteResults(fileToDelete);
      // Also remove from localStorage tracking
      removeFileWithResults(fileToDelete);
      onShowSnackbar(`Results for ${fileToDelete} deleted successfully`, 'success');
      setDeleteDialogOpen(false);
      setFileToDelete(null);
      loadFiles(); // Refresh the files list
      if (selectedFile === fileToDelete) {
        setSelectedFile('');
        setFileResults(null);
      }
    } catch (error: any) {
      onShowSnackbar(`Failed to delete results: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedFiles.length === 0) return;
    
    // Only delete files that actually have results
    const filesToDelete = selectedFiles.filter(filename => filesWithResults.has(filename));
    
    if (filesToDelete.length === 0) {
      onShowSnackbar('No files with transcription results selected', 'warning');
      return;
    }
    
    try {
      setLoading(true);
      const response = await apiService.bulkDeleteResults(filesToDelete);
      
      // Remove from localStorage tracking
      filesToDelete.forEach(filename => removeFileWithResults(filename));
      
      onShowSnackbar(`Deleted ${response.deleted_files.length} transcription results successfully`, 'success');
      setSelectedFiles([]);
      loadFiles(); // Refresh the files list
      if (selectedFiles.includes(selectedFile)) {
        setSelectedFile('');
        setFileResults(null);
      }
    } catch (error: any) {
      onShowSnackbar(`Failed to delete files: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAll = () => {
    const filesWithResultsList = files.filter(f => filesWithResults.has(f.filename)).map(f => f.filename);
    
    if (selectedFiles.length === filesWithResultsList.length && filesWithResultsList.length > 0) {
      setSelectedFiles([]);
    } else {
      setSelectedFiles(filesWithResultsList);
    }
  };

  const handleFileCheckboxChange = (filename: string, checked: boolean) => {
    if (checked) {
      setSelectedFiles(prev => [...prev, filename]);
    } else {
      setSelectedFiles(prev => prev.filter(f => f !== filename));
    }
  };

  const handleDownloadTranscript = async (filename: string, modelId: string) => {
    try {
      const response = await apiService.downloadFile(`${filename}_${modelId}.txt`);
      
      // Create blob and download
      const blob = new Blob([response], { type: 'text/plain' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${filename}_${modelId}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      onShowSnackbar('Transcript downloaded successfully', 'success');
    } catch (error) {
      console.error('Download failed:', error);
      onShowSnackbar('Download failed', 'error');
    }
  };

  const handleViewTranscript = (modelId: string, transcript: string) => {
    setTranscriptDialog({
      open: true,
      title: `${modelNames[modelId] || modelId} - Transcript`,
      content: transcript,
    });
  };

  const handleCopyTranscript = (transcript: string) => {
    navigator.clipboard.writeText(transcript).then(() => {
      onShowSnackbar('Transcript copied to clipboard', 'success');
    }).catch(() => {
      onShowSnackbar('Failed to copy transcript', 'error');
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <Box>
      <Grid container spacing={4}>
        {/* Files List */}
        <Grid item xs={12} md={5}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">
                  Uploaded Files ({files.length})
                </Typography>
                {files.length > 0 && (
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                      size="small"
                      startIcon={<SelectAll />}
                      onClick={handleSelectAll}
                      variant="outlined"
                      disabled={filesWithResults.size === 0}
                    >
                      {selectedFiles.length === Array.from(filesWithResults).length && filesWithResults.size > 0 ? 'Clear All' : 'Select All'}
                    </Button>
                    {selectedFiles.length > 0 && (
                      <Button
                        size="small"
                        startIcon={<Delete />}
                        onClick={handleBulkDelete}
                        variant="contained"
                        color="error"
                        disabled={loading}
                      >
                        Delete ({selectedFiles.length})
                      </Button>
                    )}
                  </Box>
                )}
              </Box>
              
              {files.length === 0 ? (
                <Alert severity="info">
                  No files uploaded yet. Go to the Upload tab to get started.
                </Alert>
              ) : (
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell padding="checkbox">
                          <input
                            type="checkbox"
                            checked={selectedFiles.length === files.length && files.length > 0}
                            onChange={handleSelectAll}
                          />
                        </TableCell>
                        <TableCell>File</TableCell>
                        <TableCell align="right">Size</TableCell>
                        <TableCell align="right">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {files.map((file, index) => (
                        <TableRow
                          key={file.filename}
                          hover
                          selected={selectedFile === file.filename}
                          sx={{ cursor: 'pointer' }}
                        >
                          <TableCell padding="checkbox">
                            {filesWithResults.has(file.filename) && (
                              <input
                                type="checkbox"
                                checked={selectedFiles.includes(file.filename)}
                                onChange={(e) => handleFileCheckboxChange(file.filename, e.target.checked)}
                                onClick={(e) => e.stopPropagation()}
                              />
                            )}
                          </TableCell>
                          <TableCell onClick={() => handleFileSelect(file.filename)}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Box sx={{ 
                                minWidth: 24, 
                                height: 24, 
                                borderRadius: '50%', 
                                bgcolor: index === 0 ? 'primary.main' : 'grey.300',
                                color: index === 0 ? 'white' : 'grey.600',
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'center',
                                fontSize: '0.75rem',
                                fontWeight: 600
                              }}>
                                {index + 1}
                              </Box>
                              <Box sx={{ flex: 1 }}>
                                <Typography variant="body2" noWrap>
                                  {file.filename}
                                </Typography>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                                  <Typography variant="caption" color="text.secondary">
                                    {formatDate(file.upload_time)}
                                  </Typography>
                                  {index === 0 && (
                                  ``
                                  )}
                                </Box>
                              </Box>
                            </Box>
                          </TableCell>
                          <TableCell align="right" onClick={() => handleFileSelect(file.filename)}>
                            <Typography variant="body2">
                              {formatFileSize(file.size)}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            {filesWithResults.has(file.filename) && (
                              <Tooltip title="Delete results for this file">
                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteClick(file.filename);
                                  }}
                                  disabled={loading}
                                >
                                  <Delete fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            )}
                            {!filesWithResults.has(file.filename) && (
                              <Typography variant="caption" color="text.secondary">
                                No results
                              </Typography>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Results */}
        <Grid item xs={12} md={7}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  {selectedFile ? `Transcription Results` : 'Select a file to view results'}
                </Typography>
              </Box>
              
              {selectedFile && (
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3, pb: 2, borderBottom: '1px solid #e0e0e0' }}>
                  📁 {selectedFile}
                </Typography>
              )}

              {selectedFile && (
                <>
                  {loading ? (
                    <Box sx={{ textAlign: 'center', py: 4 }}>
                      <Typography>Loading results...</Typography>
                    </Box>
                  ) : fileResults ? (
                    <Box sx={{ mb: 4 }}>
                      <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600, color: 'primary.main' }}>
                        📝 Transcription Results
                      </Typography>
                      <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
                        <Table>
                        <TableHead>
                          <TableRow>
                            <TableCell>Model</TableCell>
                            <TableCell>Status</TableCell>
                            <TableCell>Transcript Preview</TableCell>
                            <TableCell align="center">Actions</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {fileResults.results.map((result) => (
                            <TableRow key={result.model_id}>
                              <TableCell>
                                <Typography variant="body2" fontWeight={500}>
                                  {modelNames[result.model_id] || result.model_id}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Chip
                                  icon={result.status === 'success' ? <CheckCircle /> : <ErrorIcon />}
                                  label={result.status === 'success' ? 'Success' : 'Error'}
                                  color={result.status === 'success' ? 'success' : 'error'}
                                  size="small"
                                />
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2" noWrap sx={{ maxWidth: 300 }}>
                                  {result.transcript ? result.transcript.substring(0, 100) : 'No transcript available'}
                                  {result.transcript && result.transcript.length > 100 ? '...' : ''}
                                </Typography>
                              </TableCell>
                              <TableCell align="center">
                                <Tooltip title="View full transcript">
                                  <IconButton
                                    size="small"
                                    onClick={() => handleViewTranscript(result.model_id, result.transcript || '')}
                                    disabled={!result.transcript}
                                  >
                                    <Visibility />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Copy transcript">
                                  <IconButton
                                    size="small"
                                    onClick={() => handleCopyTranscript(result.transcript || '')}
                                    disabled={!result.transcript}
                                  >
                                    <ContentCopy />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Download transcript">
                                  <IconButton
                                    size="small"
                                    onClick={() => handleDownloadTranscript(selectedFile, result.model_id)}
                                  >
                                    <Download />
                                  </IconButton>
                                </Tooltip>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                        </Table>
                      </TableContainer>
                    </Box>
                    ) : (
                    <Alert severity="info">
                      No transcription results found for this file. Try running a transcription first.
                    </Alert>
                  )}
                </>
              )}

              {!selectedFile && files.length > 0 && (
                <Alert severity="info">
                  Select a file from the list to view its transcription results.
                </Alert>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Transcript Dialog */}
      <Dialog
        open={transcriptDialog.open}
        onClose={() => setTranscriptDialog({ ...transcriptDialog, open: false })}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>{transcriptDialog.title}</DialogTitle>
        <DialogContent>
          <TextField
            multiline
            fullWidth
            rows={15}
            value={transcriptDialog.content}
            variant="outlined"
            InputProps={{
              readOnly: true,
            }}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => handleCopyTranscript(transcriptDialog.content)}
            startIcon={<ContentCopy />}
          >
            Copy
          </Button>
          <Button
            onClick={() => setTranscriptDialog({ ...transcriptDialog, open: false })}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Delete color="error" />
            Confirm Delete
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete all transcription results for{' '}
            <strong>{fileToDelete}</strong>?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            This action cannot be undone. The audio file itself will remain in the system.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleDeleteConfirm}
            color="error"
            variant="contained"
            disabled={loading}
          >
            {loading ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ResultsTab;
