"""Google Speech-to-Text transcription service."""

import os
from pathlib import Path
from typing import Optional

try:
    from google.cloud import speech
    GOOGLE_AVAILABLE = True
except ImportError:
    GOOGLE_AVAILABLE = False

from .base import BaseTranscriber, TranscriptionError
from config import MODELS


class GoogleTranscriber(BaseTranscriber):
    """Google Speech-to-Text transcription service."""
    
    def __init__(self, credentials_path: Optional[str] = None, project_id: Optional[str] = None):
        super().__init__(
            name=MODELS["google"]["name"],
            language=MODELS["google"]["language"]
        )
        
        if not GOOGLE_AVAILABLE:
            raise ImportError("Google Cloud Speech library not installed. Install with: pip install google-cloud-speech")
        
        # Set up credentials
        credentials_path = credentials_path or MODELS["google"]["api_key"]
        project_id = project_id or os.getenv("GOOGLE_CLOUD_PROJECT")
        
        if credentials_path and os.path.exists(credentials_path):
            os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = credentials_path
        
        if not project_id:
            raise ValueError("Google Cloud project ID is required")
        
        try:
            self.client = speech.SpeechClient()
        except Exception as e:
            raise ValueError(f"Failed to initialize Google Speech client: {str(e)}")
    
    def transcribe(self, audio_file_path: Path) -> str:
        """Transcribe audio using Google Speech-to-Text."""
        if not self.validate_audio_file(audio_file_path):
            raise TranscriptionError(f"Invalid audio file: {audio_file_path}")
        
        try:
            # Read audio file
            with open(audio_file_path, "rb") as audio_file:
                content = audio_file.read()
            
            # Configure recognition
            audio = speech.RecognitionAudio(content=content)
            config = speech.RecognitionConfig(
                encoding=speech.RecognitionConfig.AudioEncoding.ENCODING_UNSPECIFIED,
                sample_rate_hertz=16000,  # Common sample rate
                language_code=self.language,
                enable_automatic_punctuation=False,  # Raw output as requested
                model="latest_long",  # Better for longer audio
                use_enhanced=True  # Use enhanced model if available
            )
            
            # Perform transcription
            response = self.client.recognize(config=config, audio=audio)
            
            # Extract text from results
            if response.results:
                # Combine all results
                transcript_parts = []
                for result in response.results:
                    if result.alternatives:
                        transcript_parts.append(result.alternatives[0].transcript)
                
                return " ".join(transcript_parts).strip()
            else:
                raise TranscriptionError("No transcription results returned")
                
        except Exception as e:
            self.logger.error(f"Google Speech-to-Text transcription failed: {str(e)}")
            raise TranscriptionError(f"Google Speech-to-Text transcription failed: {str(e)}")
    
    def _detect_audio_encoding(self, audio_file_path: Path) -> speech.RecognitionConfig.AudioEncoding:
        """Detect audio encoding from file extension."""
        extension = audio_file_path.suffix.lower()
        
        encoding_map = {
            ".wav": speech.RecognitionConfig.AudioEncoding.LINEAR16,
            ".flac": speech.RecognitionConfig.AudioEncoding.FLAC,
            ".mp3": speech.RecognitionConfig.AudioEncoding.ENCODING_UNSPECIFIED,
            ".m4a": speech.RecognitionConfig.AudioEncoding.ENCODING_UNSPECIFIED,
            ".ogg": speech.RecognitionConfig.AudioEncoding.OGG_OPUS,
        }
        
        return encoding_map.get(extension, speech.RecognitionConfig.AudioEncoding.ENCODING_UNSPECIFIED)
