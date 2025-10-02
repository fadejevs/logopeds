"""Speechmatics transcription service."""

import json
import time
import requests
from pathlib import Path
from typing import Optional

from .base import BaseTranscriber, TranscriptionError
from config import MODELS


class SpeechmaticsTranscriber(BaseTranscriber):
    """Speechmatics transcription service."""
    
    def __init__(self, api_key: Optional[str] = None):
        super().__init__(
            name=MODELS["speechmatics"]["name"],
            language=MODELS["speechmatics"]["language"]
        )
        
        self.api_key = api_key or MODELS["speechmatics"]["api_key"]
        if not self.api_key:
            raise ValueError("Speechmatics API key is required")
        
        self.base_url = "https://asr.api.speechmatics.com/v2"
        self.headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
    
    def transcribe(self, audio_file_path: Path) -> str:
        """Transcribe audio using Speechmatics API."""
        if not self.validate_audio_file(audio_file_path):
            raise TranscriptionError(f"Invalid audio file: {audio_file_path}")
        
        try:
            # Upload the file
            job_id = self._upload_file(audio_file_path)
            
            # Wait for transcription to complete
            result = self._wait_for_completion(job_id)
            
            # Extract text
            if result and "transcript" in result:
                return result["transcript"]
            else:
                raise TranscriptionError("No transcript found in response")
                
        except Exception as e:
            self.logger.error(f"Speechmatics transcription failed: {str(e)}")
            raise TranscriptionError(f"Speechmatics transcription failed: {str(e)}")
    
    def _upload_file(self, audio_file_path: Path) -> str:
        """Upload audio file and start transcription job."""
        upload_url = f"{self.base_url}/jobs"
        
        # Prepare job configuration
        job_config = {
            "type": "transcription",
            "transcription_config": {
                "language": self.language,
                "operating_point": "enhanced"
            }
        }
        
        # Detect mime type based on file extension
        mime_type = 'audio/mpeg'  # default
        ext = audio_file_path.suffix.lower()
        if ext in ['.wav']:
            mime_type = 'audio/wav'
        elif ext in ['.mp3']:
            mime_type = 'audio/mpeg'
        elif ext in ['.m4a', '.mp4']:
            mime_type = 'audio/mp4'
        elif ext in ['.flac']:
            mime_type = 'audio/flac'
        elif ext in ['.ogg']:
            mime_type = 'audio/ogg'
        
        # Upload file - remove Content-Type header for multipart/form-data
        headers = {
            "Authorization": self.headers["Authorization"]
        }
        
        with open(audio_file_path, 'rb') as audio_file:
            files = {
                'data_file': (audio_file_path.name, audio_file, mime_type),
                'config': (None, json.dumps(job_config), 'application/json')
            }
            
            response = requests.post(upload_url, headers=headers, files=files)
            response.raise_for_status()
            
            job_data = response.json()
            return job_data["id"]
    
    def _wait_for_completion(self, job_id: str, timeout: int = 300) -> dict:
        """Wait for transcription job to complete."""
        status_url = f"{self.base_url}/jobs/{job_id}"
        result_url = f"{self.base_url}/jobs/{job_id}/transcript?format=txt"
        
        start_time = time.time()
        
        while time.time() - start_time < timeout:
            status_response = requests.get(status_url, headers=self.headers)
            status_response.raise_for_status()
            
            status_data = status_response.json()
            job_status = status_data.get("job", {}).get("status")
            
            if job_status == "done":
                # Get the transcript
                result_response = requests.get(result_url, headers=self.headers)
                result_response.raise_for_status()
                
                # Ensure proper UTF-8 encoding for Latvian characters
                result_response.encoding = 'utf-8'
                return {"transcript": result_response.text.strip()}
            
            elif job_status == "rejected":
                raise TranscriptionError(f"Job rejected: {status_data}")
            
            time.sleep(2)
        
        raise TranscriptionError(f"Transcription timeout after {timeout} seconds")
