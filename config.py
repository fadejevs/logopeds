"""Configuration settings for the transcription service."""

import os
from pathlib import Path

# Base directories
BASE_DIR = Path(__file__).parent
OUTPUT_DIR = BASE_DIR / "transcriptions"
AUDIO_DIR = BASE_DIR / "audio_clips"

# Create directories if they don't exist
OUTPUT_DIR.mkdir(exist_ok=True)
AUDIO_DIR.mkdir(exist_ok=True)

# API Keys (load from environment variables)
SPEECHMATICS_API_KEY = os.getenv("SPEECHMATICS_API_KEY")
GOOGLE_APPLICATION_CREDENTIALS = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
GOOGLE_CLOUD_PROJECT = os.getenv("GOOGLE_CLOUD_PROJECT")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")

# Model configurations
MODELS = {
    "speechmatics": {
        "name": "Speechmatics",
        "language": "lv",
        "requires_api_key": True,
        "api_key": SPEECHMATICS_API_KEY
    },
    "google": {
        "name": "Google Speech-to-Text",
        "language": "lv-LV",
        "requires_api_key": True,
        "api_key": GOOGLE_APPLICATION_CREDENTIALS
    },
    "whisper": {
        "name": "OpenAI Whisper",
        "language": "lv",
        "model_size": "medium",
        "requires_api_key": False
    },
    "grok": {
        "name": "Grok (Anthropic)",
        "language": "lv",
        "requires_api_key": True,
        "api_key": ANTHROPIC_API_KEY
    }
}

# Supported audio formats
SUPPORTED_AUDIO_FORMATS = [".wav", ".mp3", ".m4a", ".flac", ".ogg"]

# Logging configuration
LOG_FORMAT = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
