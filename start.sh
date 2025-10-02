#!/bin/bash

echo "🚀 Starting Latvian Audio Transcription System"
echo "=============================================="

# Check if backend directory exists
if [ ! -f "backend/app.py" ]; then
    echo "❌ Error: backend/app.py not found"
    exit 1
fi

# Start backend
echo "📦 Starting Flask backend server..."
cd backend

# Install dependencies if needed
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

source venv/bin/activate
pip install -r requirements.txt > /dev/null 2>&1

echo ""
echo "🔧 Backend server starting..."
echo "Backend: http://localhost:5000"
echo "Frontend: Start with 'cd frontend && npm start'"
echo ""
echo "Press Ctrl+C to stop"
echo ""

python app.py
