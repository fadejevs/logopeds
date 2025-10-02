#!/usr/bin/env python3
"""
Flask backend API for Latvian Audio Transcription Frontend
"""

import os
import logging
import json
from pathlib import Path
from datetime import datetime
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import pandas as pd
from werkzeug.utils import secure_filename
from dotenv import load_dotenv

# Load environment variables from parent directory
load_dotenv(dotenv_path=Path('../.env'))

# Import our transcription services
import sys
sys.path.append('..')
from transcribers import (
    SpeechmaticsTranscriber,
    GoogleTranscriber,
    WhisperTranscriber,
    GrokTranscriber,
    TranscriptionError
)

app = Flask(__name__)
CORS(app)

# Configuration
UPLOAD_FOLDER = Path('../audio_clips')
RESULTS_FOLDER = Path('../transcriptions')
ALLOWED_EXTENSIONS = {'wav', 'mp3', 'm4a', 'flac', 'ogg'}

# Ensure directories exist
UPLOAD_FOLDER.mkdir(exist_ok=True)
RESULTS_FOLDER.mkdir(exist_ok=True)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Global transcriber instances
transcribers = {}

def allowed_file(filename):
    """Check if file extension is allowed."""
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def initialize_transcribers():
    """Initialize available transcription services."""
    global transcribers
    
    # Try to initialize each transcriber
    try:
        transcribers['speechmatics'] = SpeechmaticsTranscriber()
        logger.info("✓ Speechmatics transcriber initialized")
    except Exception as e:
        logger.warning(f"✗ Speechmatics: {e}")
    
    try:
        transcribers['google'] = GoogleTranscriber()
        logger.info("✓ Google Speech-to-Text transcriber initialized")
    except Exception as e:
        logger.warning(f"✗ Google STT: {e}")
    
    try:
        transcribers['whisper'] = WhisperTranscriber()
        logger.info("✓ Whisper transcriber initialized")
    except Exception as e:
        logger.warning(f"✗ Whisper: {e}")
    
    try:
        transcribers['grok'] = GrokTranscriber()
        logger.info("✓ Grok transcriber initialized")
    except Exception as e:
        logger.warning(f"✗ Grok: {e}")
    
    return transcribers

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint."""
    return jsonify({
        'status': 'healthy',
        'available_transcribers': list(transcribers.keys()),
        'timestamp': datetime.now().isoformat()
    })

@app.route('/api/transcribers', methods=['GET'])
def get_transcribers():
    """Get available transcription services."""
    return jsonify({
        'transcribers': [
            {
                'id': key,
                'name': transcriber.name,
                'status': 'available'
            }
            for key, transcriber in transcribers.items()
        ]
    })

@app.route('/api/upload', methods=['POST'])
def upload_file():
    """Upload audio file."""
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
    
    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"{timestamp}_{filename}"
        
        file_path = UPLOAD_FOLDER / filename
        file.save(file_path)
        
        return jsonify({
            'message': 'File uploaded successfully',
            'filename': filename,
            'file_path': str(file_path)
        })
    
    return jsonify({'error': 'Invalid file type'}), 400

@app.route('/api/transcribe', methods=['POST'])
def transcribe_audio():
    """Transcribe audio file using selected models."""
    data = request.get_json()
    
    if not data or 'filename' not in data:
        return jsonify({'error': 'No filename provided'}), 400
    
    filename = data['filename']
    selected_models = data.get('models', list(transcribers.keys()))
    
    file_path = UPLOAD_FOLDER / filename
    if not file_path.exists():
        return jsonify({'error': 'File not found'}), 404
    
    results = []
    
    for model_id in selected_models:
        if model_id not in transcribers:
            continue
        
        transcriber = transcribers[model_id]
        result = {
            'model_id': model_id,
            'model_name': transcriber.name,
            'status': 'processing',
            'transcript': '',
            'error': '',
            'processing_time': 0
        }
        
        try:
            start_time = datetime.now()
            logger.info(f"Transcribing {filename} with {transcriber.name}")
            
            transcript = transcriber.transcribe(file_path)
            
            end_time = datetime.now()
            processing_time = (end_time - start_time).total_seconds()
            
            result.update({
                'status': 'success',
                'transcript': transcript,
                'processing_time': processing_time
            })
            
            # Save individual transcript file
            output_filename = f"{file_path.stem}_{model_id}.txt"
            output_path = RESULTS_FOLDER / output_filename
            with open(output_path, 'w', encoding='utf-8') as f:
                f.write(transcript)
            
            logger.info(f"✓ {transcriber.name} completed in {processing_time:.2f}s")
            
        except TranscriptionError as e:
            result.update({
                'status': 'error',
                'error': str(e)
            })
            logger.error(f"✗ {transcriber.name} failed: {e}")
        
        except Exception as e:
            result.update({
                'status': 'error',
                'error': f"Unexpected error: {str(e)}"
            })
            logger.error(f"✗ {transcriber.name} unexpected error: {e}")
        
        results.append(result)
    
    # Create summary report
    create_summary_report(filename, results)
    
    return jsonify({
        'filename': filename,
        'results': results,
        'summary': {
            'total_models': len(results),
            'successful': len([r for r in results if r['status'] == 'success']),
            'failed': len([r for r in results if r['status'] == 'error'])
        }
    })

def create_summary_report(filename, results):
    """Create summary report for the transcription results."""
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    
    # Create DataFrame
    df_data = []
    for result in results:
        df_data.append({
            'timestamp': timestamp,
            'filename': filename,
            'model_id': result['model_id'],
            'model_name': result['model_name'],
            'status': result['status'],
            'processing_time': result.get('processing_time', 0),
            'transcript': result.get('transcript', ''),
            'error': result.get('error', '')
        })
    
    df = pd.DataFrame(df_data)
    
    # Save to CSV
    csv_filename = f"transcription_{timestamp}.csv"
    csv_path = RESULTS_FOLDER / csv_filename
    df.to_csv(csv_path, index=False, encoding='utf-8')
    
    # Save to Excel
    excel_filename = f"transcription_{timestamp}.xlsx"
    excel_path = RESULTS_FOLDER / excel_filename
    with pd.ExcelWriter(excel_path, engine='openpyxl') as writer:
        df.to_excel(writer, sheet_name='Transcription Results', index=False)
    
    logger.info(f"Summary report saved: {csv_path}")

@app.route('/api/results/<filename>', methods=['GET'])
def get_results(filename):
    """Get transcription results for a specific file."""
    # Look for result files
    result_files = list(RESULTS_FOLDER.glob(f"{Path(filename).stem}_*.txt"))
    
    if not result_files:
        return jsonify({'error': 'No results found'}), 404
    
    results = []
    for file_path in result_files:
        model_id = file_path.stem.split('_')[-1]
        with open(file_path, 'r', encoding='utf-8') as f:
            transcript = f.read()
        
        results.append({
            'model_id': model_id,
            'transcript': transcript,
            'file_path': str(file_path)
        })
    
    return jsonify({
        'filename': filename,
        'results': results
    })

@app.route('/api/results/<filename>', methods=['DELETE'])
def delete_results(filename):
    """Delete all transcription results for a specific file."""
    try:
        # Find all result files for this audio file
        result_files = list(RESULTS_FOLDER.glob(f"{Path(filename).stem}_*.txt"))
        
        if not result_files:
            return jsonify({'error': 'No results found'}), 404
        
        # Delete all result files
        deleted_files = []
        for file_path in result_files:
            try:
                file_path.unlink()  # Delete the file
                deleted_files.append(str(file_path.name))
                logger.info(f"Deleted result file: {file_path}")
            except Exception as e:
                logger.error(f"Failed to delete {file_path}: {e}")
        
        # Also try to delete any Excel/CSV summary files
        summary_files = list(RESULTS_FOLDER.glob(f"{Path(filename).stem}_summary.*"))
        for file_path in summary_files:
            try:
                file_path.unlink()
                deleted_files.append(str(file_path.name))
                logger.info(f"Deleted summary file: {file_path}")
            except Exception as e:
                logger.error(f"Failed to delete {file_path}: {e}")
        
        return jsonify({
            'message': f'Deleted {len(deleted_files)} files',
            'deleted_files': deleted_files
        })
        
    except Exception as e:
        logger.error(f"Error deleting results for {filename}: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/results/bulk', methods=['DELETE'])
def bulk_delete_results():
    """Delete results for multiple files."""
    try:
        data = request.get_json()
        filenames = data.get('filenames', [])
        
        if not filenames:
            return jsonify({'error': 'No filenames provided'}), 400
        
        all_deleted = []
        errors = []
        
        for filename in filenames:
            try:
                result_files = list(RESULTS_FOLDER.glob(f"{Path(filename).stem}_*.txt"))
                summary_files = list(RESULTS_FOLDER.glob(f"{Path(filename).stem}_summary.*"))
                
                deleted_for_file = []
                for file_path in result_files + summary_files:
                    try:
                        file_path.unlink()
                        deleted_for_file.append(str(file_path.name))
                    except Exception as e:
                        logger.error(f"Failed to delete {file_path}: {e}")
                
                if deleted_for_file:
                    all_deleted.extend(deleted_for_file)
                    logger.info(f"Deleted {len(deleted_for_file)} files for {filename}")
                    
            except Exception as e:
                errors.append(f"{filename}: {str(e)}")
                logger.error(f"Error deleting results for {filename}: {e}")
        
        response = {
            'message': f'Deleted {len(all_deleted)} files',
            'deleted_files': all_deleted
        }
        
        if errors:
            response['errors'] = errors
            
        return jsonify(response)
        
    except Exception as e:
        logger.error(f"Error in bulk delete: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/files/<filename>', methods=['DELETE'])
def delete_audio_file(filename):
    """Delete an audio file and its transcription results."""
    try:
        # Delete from audio_clips folder
        audio_path = AUDIO_FOLDER / filename
        deleted_files = []
        
        if audio_path.exists():
            audio_path.unlink()
            deleted_files.append(f"audio:{filename}")
            logger.info(f"Deleted audio file: {audio_path}")
        
        # Delete transcription results
        result_files = list(RESULTS_FOLDER.glob(f"{Path(filename).stem}_*.txt"))
        summary_files = list(RESULTS_FOLDER.glob(f"{Path(filename).stem}_summary.*"))
        
        for file_path in result_files + summary_files:
            try:
                file_path.unlink()
                deleted_files.append(str(file_path.name))
                logger.info(f"Deleted result file: {file_path}")
            except Exception as e:
                logger.error(f"Failed to delete {file_path}: {e}")
        
        return jsonify({
            'message': f'Deleted {len(deleted_files)} files',
            'deleted_files': deleted_files
        })
        
    except Exception as e:
        logger.error(f"Error deleting file {filename}: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/download/<path:filename>', methods=['GET'])
def download_file(filename):
    """Download a file from the results folder."""
    file_path = RESULTS_FOLDER / filename
    if file_path.exists():
        return send_file(file_path, as_attachment=True)
    else:
        return jsonify({'error': 'File not found'}), 404

@app.route('/api/files', methods=['GET'])
def list_files():
    """List uploaded audio files."""
    files = []
    for file_path in UPLOAD_FOLDER.glob('*'):
        if file_path.is_file() and allowed_file(file_path.name):
            files.append({
                'filename': file_path.name,
                'size': file_path.stat().st_size,
                'upload_time': datetime.fromtimestamp(file_path.stat().st_mtime).isoformat()
            })
    
    return jsonify({'files': files})

if __name__ == '__main__':
    # Initialize transcribers on startup
    initialize_transcribers()
    
    if not transcribers:
        logger.error("No transcription services available!")
        logger.error("Please check your API keys and configuration.")
    else:
        logger.info(f"Starting server with {len(transcribers)} transcription services")
    
    app.run(debug=True, host='0.0.0.0', port=5001)
