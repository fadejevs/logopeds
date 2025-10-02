"""OpenAI Whisper transcription service."""

import torch
from pathlib import Path
from typing import Optional

try:
    import whisper
    WHISPER_AVAILABLE = True
except ImportError:
    WHISPER_AVAILABLE = False

from .base import BaseTranscriber, TranscriptionError
from config import MODELS


class WhisperTranscriber(BaseTranscriber):
    """OpenAI Whisper transcription service."""
    
    def __init__(self, model_size: str = "medium"):
        super().__init__(
            name=MODELS["whisper"]["name"],
            language=MODELS["whisper"]["language"]
        )
        
        if not WHISPER_AVAILABLE:
            raise ImportError("Whisper library not installed. Install with: pip install openai-whisper")
        
        self.model_size = model_size
        self.model = None
        self._load_model()
    
    def _load_model(self):
        """Load the Whisper model."""
        try:
            self.logger.info(f"Loading Whisper {self.model_size} model...")
            self.model = whisper.load_model(self.model_size)
            self.logger.info("Whisper model loaded successfully")
        except Exception as e:
            raise TranscriptionError(f"Failed to load Whisper model: {str(e)}")
    
    def transcribe(self, audio_file_path: Path) -> str:
        """Transcribe audio using OpenAI Whisper."""
        if not self.validate_audio_file(audio_file_path):
            raise TranscriptionError(f"Invalid audio file: {audio_file_path}")
        
        if self.model is None:
            raise TranscriptionError("Whisper model not loaded")
        
        try:
            # Transcribe with language forced to Latvian
            result = self.model.transcribe(
                str(audio_file_path),
                language=self.language,
                word_timestamps=False,  # We only want text
                fp16=torch.cuda.is_available()  # Use GPU if available
            )
            
            # Extract text
            transcript = result.get("text", "").strip()
            
            if not transcript:
                raise TranscriptionError("No transcript generated")
            
            return transcript
            
        except Exception as e:
            self.logger.error(f"Whisper transcription failed: {str(e)}")
            raise TranscriptionError(f"Whisper transcription failed: {str(e)}")
    
    def get_model_info(self) -> dict:
        """Get information about the loaded model."""
        return {
            "model_size": self.model_size,
            "language": self.language,
            "device": "cuda" if torch.cuda.is_available() else "cpu"
        }
