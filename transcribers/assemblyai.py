"""AssemblyAI transcription service."""

import os
import time
import requests
from pathlib import Path
from typing import Optional

from .base import BaseTranscriber, TranscriptionError


class AssemblyAITranscriber(BaseTranscriber):
    """AssemblyAI transcription service with Latvian support."""
    
    def __init__(self, api_key: Optional[str] = None):
        super().__init__(
            name="AssemblyAI",
            language="lv"
        )
        
        self.api_key = api_key or os.getenv('ASSEMBLYAI_API_KEY')
        if not self.api_key:
            raise ValueError("AssemblyAI API key is required")
        
        self.base_url = "https://api.assemblyai.com/v2"
        self.headers = {
            "authorization": self.api_key,
            "content-type": "application/json"
        }
    
    def transcribe(self, audio_file_path: Path) -> str:
        """Transcribe audio using AssemblyAI."""
        if not self.validate_audio_file(audio_file_path):
            raise TranscriptionError(f"Invalid audio file: {audio_file_path}")
        
        try:
            self.logger.info(f"Starting AssemblyAI transcription for: {audio_file_path}")
            
            # Step 1: Upload the audio file
            upload_url = self._upload_file(audio_file_path)
            self.logger.info(f"File uploaded successfully")
            
            # Step 2: Request transcription
            transcript_id = self._request_transcription(upload_url)
            self.logger.info(f"Transcription requested, ID: {transcript_id}")
            
            # Step 3: Poll for completion
            transcript = self._wait_for_completion(transcript_id)
            self.logger.info(f"Transcription completed successfully")
            
            return transcript
            
        except Exception as e:
            self.logger.error(f"AssemblyAI transcription failed: {str(e)}")
            raise TranscriptionError(f"AssemblyAI transcription failed: {str(e)}")
    
    def _upload_file(self, file_path: Path) -> str:
        """Upload audio file to AssemblyAI and get upload URL."""
        upload_endpoint = f"{self.base_url}/upload"
        
        with open(file_path, 'rb') as f:
            response = requests.post(
                upload_endpoint,
                headers={"authorization": self.api_key},
                data=f
            )
        
        if response.status_code != 200:
            raise TranscriptionError(f"Upload failed: {response.status_code} - {response.text}")
        
        return response.json()['upload_url']
    
    def _request_transcription(self, audio_url: str) -> str:
        """Request transcription from AssemblyAI."""
        transcript_endpoint = f"{self.base_url}/transcript"
        
        json_data = {
            "audio_url": audio_url,
            "language_code": "lv",  # Latvian language
            "speech_model": "best"  # Use the best available model
        }
        
        response = requests.post(
            transcript_endpoint,
            json=json_data,
            headers=self.headers
        )
        
        if response.status_code != 200:
            raise TranscriptionError(f"Transcription request failed: {response.status_code} - {response.text}")
        
        return response.json()['id']
    
    def _wait_for_completion(self, transcript_id: str, max_wait: int = 300) -> str:
        """Poll AssemblyAI API until transcription is complete."""
        polling_endpoint = f"{self.base_url}/transcript/{transcript_id}"
        
        start_time = time.time()
        
        while time.time() - start_time < max_wait:
            response = requests.get(polling_endpoint, headers=self.headers)
            
            if response.status_code != 200:
                raise TranscriptionError(f"Polling failed: {response.status_code} - {response.text}")
            
            result = response.json()
            status = result['status']
            
            if status == 'completed':
                # Ensure UTF-8 encoding for Latvian characters
                transcript = result.get('text', '')
                if not transcript:
                    raise TranscriptionError("No transcription text returned")
                return transcript
            
            elif status == 'error':
                error_msg = result.get('error', 'Unknown error')
                raise TranscriptionError(f"Transcription failed: {error_msg}")
            
            # Still processing - wait before polling again
            time.sleep(3)
        
        raise TranscriptionError(f"Transcription timed out after {max_wait} seconds")

