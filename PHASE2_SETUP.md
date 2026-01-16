# Phase 2 Setup Guide

## Prerequisites
You need API keys for at least ONE of these LLM providers:
- **OpenAI** (Recommended): https://platform.openai.com/api-keys
- **Google Gemini** (Cheapest): https://makersuite.google.com/app/apikey
- **HuggingFace** (Free tier): https://huggingface.co/settings/tokens

## Configuration

1. **Copy the environment template**:
   ```bash
   cd ai_engine
   cp .env.example .env
   ```

2. **Add your API keys** to `.env`:
   ```bash
   # Choose your primary provider
   LLM_PROVIDER=openai  # or 'gemini' or 'huggingface'
   
   # Add the corresponding API key
   OPENAI_API_KEY=sk-...
   GOOGLE_API_KEY=AI...
   HUGGINGFACE_API_KEY=hf_...
   ```

3. **Install new dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

## What Changed in Phase 2

### 1. LLM-Powered Research
The Researcher Agent now extracts **structured insights** instead of raw text:

**Before (Phase 1)**:
```json
{
  "raw_content_preview": "Welcome to Acme Corp. We build software...",
  "full_content_length": 5000
}
```

**After (Phase 2)**:
```json
{
  "company_name": "Acme Corp",
  "company_summary": "Acme builds AI-powered analytics for B2B SaaS companies.",
  "value_proposition": "10x faster insights with zero setup",
  "target_customers": ["B2B SaaS", "Enterprise"],
  "technologies": ["React", "Python", "AWS"],
  "pain_points": ["Manual reporting", "Data silos"],
  "recent_news": ["Series A $10M raised"],
  "extraction_tokens": 450,
  "extraction_cost": 0.0012
}
```

### 2. Multi-Provider Support
The system automatically falls back if your primary provider fails:
- OpenAI fails → Try Gemini → Try HuggingFace

### 3. Cost Tracking
Every LLM call is logged with:
- Tokens used
- Cost in USD
- Provider used
- Latency

## Testing Phase 2

1. **Start all services** (same as Phase 1):
   ```bash
   # Terminal 1
   cd ai_engine && python main.py
   
   # Terminal 2
   cd server && node index.js
   
   # Terminal 3
   cd client && npm run dev
   ```

2. **Run a campaign** at http://localhost:3000

3. **Check the terminal** for LLM extraction logs:
   ```
   ✓ Extracted insights from https://stripe.com using openai (450 tokens, $0.0012)
   ```

4. **View the database** to see structured data:
   ```bash
   # In MongoDB shell or Compass
   db.leads.findOne()
   ```

## Cost Estimates

For a typical 50-lead campaign:
- **OpenAI (gpt-4o-mini)**: ~$0.50
- **Google Gemini (flash)**: ~$0.10
- **HuggingFace**: ~$0.05 (free tier)

## Troubleshooting

**Error: "LLM returned invalid JSON"**
- The LLM failed to return valid JSON
- System automatically falls back to raw text
- Try switching to a different provider

**Error: "All LLM providers failed"**
- Check your API keys in `.env`
- Verify you have credits/quota remaining
- Check network connectivity

**High costs**
- Switch to Gemini (`LLM_PROVIDER=gemini`)
- Reduce `max_tokens` in `agent_researcher.py`
- Limit leads per campaign

## Next Steps

Phase 2 is now ready! The system will:
1. Find leads (Prospector)
2. Visit their websites (Scraper)
3. **Extract structured insights (LLM)** ← NEW!
4. Save to MongoDB with rich metadata

You can now build on this foundation to add:
- Email generation
- Semantic search
- Campaign management
