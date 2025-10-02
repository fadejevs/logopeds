"""Base class for all transcription services."""

import logging
from abc import ABC, abstractmethod
from pathlib import Path
from typing import Optional


class BaseTranscriber(ABC):
    """Base class for all transcription services."""
    
    def __init__(self, name: str, language: str = "lv"):
        self.name = name
        self.language = language
        self.logger = logging.getLogger(f"transcriber.{name.lower()}")
    
    @abstractmethod
    def transcribe(self, audio_file_path: Path) -> str:
        """
        Transcribe an audio file.
        
        Args:
            audio_file_path: Path to the audio file
            
        Returns:
            Transcription text
            
        Raises:
            TranscriptionError: If transcription fails
        """
        pass
    
    def validate_audio_file(self, audio_file_path: Path) -> bool:
        """Validate that the audio file exists and is supported."""
        if not audio_file_path.exists():
            self.logger.error(f"Audio file not found: {audio_file_path}")
            return False
        
        if audio_file_path.suffix.lower() not in [".wav", ".mp3", ".m4a", ".flac", ".ogg"]:
            self.logger.error(f"Unsupported audio format: {audio_file_path.suffix}")
            return False
        
        return True


class TranscriptionError(Exception):
    """Custom exception for transcription errors."""
    pass
