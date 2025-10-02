# 🔑 API Keys Setup Guide

To get all 4 transcription models working, you need to set up API keys. Currently, only **OpenAI Whisper** works (no API key needed).

## ✅ Working Models

### OpenAI Whisper (Local)
- **Status**: ✅ Working
- **API Key**: Not needed
- **Setup**: Automatic (downloads model on first use)
- **Notes**: Runs completely offline

## ⚠️ Models Needing Setup

### 1. Speechmatics

**Get API Key:**
1. Go to https://portal.speechmatics.com/
2. Sign up for free account
3. Navigate to API Keys section
4. Create new API key

**Configure:**
```bash
# Edit .env file
SPEECHMATICS_API_KEY=your_actual_key_here
```

**Free Tier**: 
- 8 hours of transcription per month
- Good for testing

---

### 2. Google Speech-to-Text

**Get Credentials:**
1. Go to https://console.cloud.google.com/
2. Create new project or select existing
3. Enable "Cloud Speech-to-Text API"
4. Go to IAM & Admin → Service Accounts
5. Create Service Account with "Speech-to-Text Client" role
6. Create Key → Download JSON file
7. Save JSON file in project folder (e.g., `google-credentials.json`)

**Configure:**
```bash
# Edit .env file
GOOGLE_APPLICATION_CREDENTIALS=./google-credentials.json
GOOGLE_CLOUD_PROJECT_ID=your-project-id
```

**Free Tier**:
- 60 minutes per month free
- Then $0.006 per 15 seconds

---

### 3. Grok (Anthropic Claude)

**Get API Key:**
1. Go to https://console.anthropic.com/
2. Sign up for account
3. Navigate to API Keys
4. Create new API key

**Configure:**
```bash
# Edit .env file
ANTHROPIC_API_KEY=your_actual_key_here
```

**Pricing**:
- Pay-as-you-go
- ~$0.015 per 1K tokens
- Free credits available for new accounts

---

## 🚀 Quick Start (Minimum Setup)

If you want to test with just 2 models:

**Option 1: Free (Whisper only)**
- Already working ✅
- No setup needed

**Option 2: Best for Testing (Whisper + Speechmatics)**
1. Get Speechmatics free API key (8 hours/month)
2. Add to `.env` file
3. Restart backend

**Option 3: All Models**
1. Set up all 3 API keys
2. Update `.env` file
3. Restart backend
4. You'll have 4 models for comparison

## 🔄 After Adding Keys

1. **Update `.env` file** with your actual keys
2. **Restart the backend**:
   ```bash
   # Kill existing backend
   pkill -f "python.*app.py"
   
   # Start fresh
   cd backend
   source venv/bin/activate
   python app.py
   ```
3. **Refresh frontend** - new models will appear in the dropdown

## 🧪 Testing

Once keys are added, go to Upload tab and you'll see:
- ✅ Whisper (always available)
- ✅ Speechmatics (if API key valid)
- ✅ Google STT (if credentials valid)
- ✅ Grok (if API key valid)

## ❓ Troubleshooting

**"Model not appearing in dropdown"**
- Check `.env` file for typos
- Restart backend completely
- Check backend logs for errors

**"API key invalid"**
- Verify key is correct in `.env`
- Check if API key has proper permissions
- Some APIs need billing enabled

**"Google credentials error"**
- Verify JSON file path is correct
- Check if Speech-to-Text API is enabled in Google Cloud
- Ensure service account has proper role

