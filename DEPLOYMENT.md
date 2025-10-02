# 🚀 Deployment Guide - Vercel

## Quick Deploy to Vercel

### 1. **Install Vercel CLI**
```bash
npm install -g vercel
```

### 2. **Set Environment Variables**
```bash
vercel env add SPEECHMATICS_API_KEY
vercel env add ANTHROPIC_API_KEY
vercel env add GOOGLE_APPLICATION_CREDENTIALS  # Optional
vercel env add GOOGLE_CLOUD_PROJECT_ID  # Optional
```

### 3. **Deploy**
```bash
vercel --prod
```

## 📋 **What This Gives You:**

✅ **Single URL** - Everything works from one link  
✅ **No Backend Management** - Vercel handles everything  
✅ **Automatic Scaling** - Handles multiple users  
✅ **Free Hosting** - Up to Vercel limits  
✅ **Easy Sharing** - Just send the Vercel URL  

## 🔧 **Current Limitations:**

❌ **Whisper** - Not available in serverless (would need API)  
❌ **Grok** - Anthropic doesn't do audio transcription  
✅ **Speechmatics** - Works perfectly!  

## 🎯 **For Your Client:**

1. **Upload Latvian audio files**
2. **Select Speechmatics** (only working model in deployment)
3. **Get transcriptions instantly**
4. **Compare results** side-by-side

## 💡 **Next Steps:**

1. **Deploy now** with just Speechmatics
2. **Add Whisper API** later if needed
3. **Client can test immediately**

## 🚀 **Ready to Deploy?**

Run: `vercel --prod` and share the URL with your client!
