"""Grok (Anthropic) transcription service."""

import base64
from pathlib import Path
from typing import Optional

try:
    import anthropic
    ANTHROPIC_AVAILABLE = True
except ImportError:
    ANTHROPIC_AVAILABLE = False

from .base import BaseTranscriber, TranscriptionError
from config import MODELS


class GrokTranscriber(BaseTranscriber):
    """Grok (Anthropic) transcription service."""
    
    def __init__(self, api_key: Optional[str] = None):
        super().__init__(
            name=MODELS["grok"]["name"],
            language=MODELS["grok"]["language"]
        )
        
        if not ANTHROPIC_AVAILABLE:
            raise ImportError("Anthropic library not installed. Install with: pip install anthropic")
        
        self.api_key = api_key or MODELS["grok"]["api_key"]
        if not self.api_key:
            raise ValueError("Anthropic API key is required")
        
        try:
            self.client = anthropic.Anthropic(api_key=self.api_key)
        except Exception as e:
            raise TranscriptionError(f"Failed to initialize Anthropic client: {str(e)}")
    
    def transcribe(self, audio_file_path: Path) -> str:
        """Transcribe audio using Grok (Anthropic)."""
        if not self.validate_audio_file(audio_file_path):
            raise TranscriptionError(f"Invalid audio file: {audio_file_path}")
        
        try:
            # Read and encode audio file
            with open(audio_file_path, "rb") as audio_file:
                audio_data = audio_file.read()
            
            # Encode to base64
            audio_base64 = base64.b64encode(audio_data).decode('utf-8')
            
            # Determine MIME type based on file extension
            mime_type = self._get_mime_type(audio_file_path)
            
            # Create the message for transcription
            message = self.client.messages.create(
                model="claude-3-5-sonnet-20241022",  # Latest model that supports audio
                max_tokens=4000,
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "text",
                                "text": f"Please transcribe this audio clip in Latvian. The audio contains children's voices speaking Latvian. Return only the raw transcription text without any formatting, punctuation, or additional commentary. Focus on accuracy of the spoken words."
                            },
                            {
                                "type": "audio",
                                "source": {
                                    "type": "base64",
                                    "media_type": mime_type,
                                    "data": audio_base64
                                }
                            }
                        ]
                    }
                ]
            )
            
            # Extract transcript from response
            if message.content and len(message.content) > 0:
                transcript = message.content[0].text.strip()
                return transcript
            else:
                raise TranscriptionError("No transcription returned from Grok")
                
        except Exception as e:
            self.logger.error(f"Grok transcription failed: {str(e)}")
            raise TranscriptionError(f"Grok transcription failed: {str(e)}")
    
    def _get_mime_type(self, audio_file_path: Path) -> str:
        """Get MIME type based on file extension."""
        extension = audio_file_path.suffix.lower()
        
        mime_types = {
            ".wav": "audio/wav",
            ".mp3": "audio/mpeg",
            ".m4a": "audio/mp4",
            ".flac": "audio/flac",
            ".ogg": "audio/ogg"
        }
        
        return mime_types.get(extension, "audio/wav")
