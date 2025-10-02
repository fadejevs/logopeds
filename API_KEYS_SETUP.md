# 🔑 API Keys Setup Guide

## 📋 **Required API Keys for All Models**

To enable all 4 transcription models from the user story, you need to set up the following API keys in your Vercel dashboard:

### 1. **Speechmatics** ✅ (Already configured)
- **Environment Variable:** `SPEECHMATICS_API_KEY`
- **Current Value:** `OsEvQd4pG7eaOsKPV0lT87yHL55mfBZ9`
- **Status:** ✅ Working

### 2. **OpenAI Whisper** ❌ (Needs setup)
- **Environment Variable:** `OPENAI_API_KEY`
- **How to get:**
  1. Go to [OpenAI Platform](https://platform.openai.com/)
  2. Sign up/Login
  3. Go to API Keys section
  4. Create new API key
  5. Copy the key (starts with `sk-`)
- **Cost:** Pay-per-use (very affordable for testing)
- **Latvian Support:** ✅ Excellent

### 3. **Google Speech-to-Text** ❌ (Needs setup)
- **Environment Variable:** `GOOGLE_CLOUD_API_KEY`
- **How to get:**
  1. Go to [Google Cloud Console](https://console.cloud.google.com/)
  2. Create/Select a project
  3. Enable Speech-to-Text API
  4. Go to Credentials → Create API Key
  5. Copy the API key
- **Cost:** Pay-per-use (free tier available)
- **Latvian Support:** ✅ Good

### 4. **Anthropic Claude** ❌ (Needs setup)
- **Environment Variable:** `ANTHROPIC_API_KEY`
- **How to get:**
  1. Go to [Anthropic Console](https://console.anthropic.com/)
  2. Sign up/Login
  3. Go to API Keys section
  4. Create new API key
  5. Copy the key (starts with `sk-ant-`)
- **Cost:** Pay-per-use
- **Note:** Claude doesn't do direct audio transcription, but can enhance transcripts

## 🚀 **How to Add API Keys to Vercel**

1. **Go to Vercel Dashboard** → Your Project → Settings → Environment Variables
2. **Add each key:**
   - Name: `OPENAI_API_KEY`
   - Value: `sk-your-openai-key-here`
   - Environment: Production, Preview, Development
3. **Repeat for all keys**
4. **Redeploy** (automatic)

## 📊 **Model Comparison**

| Model | Latvian Support | Cost | Speed | Accuracy |
|-------|----------------|------|-------|----------|
| **Speechmatics** | ✅ Excellent | $$$ | Fast | High |
| **OpenAI Whisper** | ✅ Excellent | $ | Medium | Very High |
| **Google STT** | ✅ Good | $$ | Fast | High |
| **Anthropic Claude** | ❌ Text only | $$ | N/A | N/A |

## 🎯 **Recommended Setup Order**

1. **Speechmatics** ✅ (Already working)
2. **OpenAI Whisper** (Best value, excellent quality)
3. **Google STT** (Good alternative)
4. **Anthropic Claude** (For transcript enhancement)

## 🧪 **Testing**

Once you add the API keys:
1. Upload a Latvian audio file
2. Select multiple models
3. Compare results side-by-side
4. See which works best for your use case

## 💡 **Tips**

- **Start with OpenAI Whisper** - best balance of cost and quality
- **Keep Speechmatics** - already working well
- **Test with different audio qualities** to see which models handle them best
- **Use Claude for post-processing** if you need transcript enhancement
