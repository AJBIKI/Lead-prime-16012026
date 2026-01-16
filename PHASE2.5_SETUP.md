# Phase 2.5 Setup Guide: Email Generation with Pinecone

## Prerequisites

You need a **Pinecone API key** (free tier available).

---

## Step 1: Get Pinecone API Key

1. **Sign up**: https://www.pinecone.io/
2. **Create account** (free tier: 100K vectors, 1 index)
3. **Get API key**:
   - Go to: https://app.pinecone.io/
   - Click "API Keys" in left sidebar
   - Copy your API key (starts with `pcsk_...` or similar)

**No project ID needed!** The new Pinecone SDK only requires the API key.

---

## Step 2: Add API Key to Environment

Edit `ai_engine/.env`:

```bash
# Phase 2.5: Vector Database for Email Templates
PINECONE_API_KEY=pcsk_your_actual_key_here
```

---

## Step 3: Install Dependencies

```bash
cd ai_engine
pip install -r requirements.txt
```

This installs:
- `pinecone-client` - Pinecone SDK
- `sentence-transformers` - Embedding model (all-MiniLM-L6-v2)

**Note**: First run will download the embedding model (~90MB, one-time).

---

## Step 4: Seed Email Templates

```bash
cd ai_engine
python vector_store.py
```

**Expected output**:
```
Initializing Email Template Store...
Creating Pinecone index: email-templates
✓ Index 'email-templates' created
✓ Added 30 templates to Pinecone
✓ Index stats: {'total_vectors': 30, 'dimension': 384}

Top 3 matching templates:
1. Fixing [pain point] for [industry] (score: 0.856)
   Category: pain_point_focus, Tone: solution_oriented
   Preview: Hi [Name], Many [industry] teams struggle with [problem]...
```

---

## Step 5: Verify Setup

Test the vector search:

```python
from vector_store import EmailTemplateStore

store = EmailTemplateStore()

# Search for templates
results = store.search_similar(
    query="AI startup struggling with lead generation",
    top_k=3
)

for result in results:
    print(f"✓ {result['subject']} (score: {result['score']:.3f})")
```

---

## Troubleshooting

### Error: "Invalid API key"
- Check your API key in `.env`
- Make sure it starts with `pcsk_` or similar
- No quotes needed in `.env` file

### Error: "Index already exists"
- This is fine! It means you already created the index
- The code will use the existing index

### Error: "Embedding model download failed"
- Check internet connection
- Model downloads from HuggingFace (~90MB)
- Will be cached after first download

### Error: "No module named 'pinecone'"
- Run: `pip install pinecone-client`
- Make sure you're in the virtual environment

---

## What's Next?

Once templates are seeded, you can:

1. **Generate emails** using the email agent (coming next)
2. **Add more templates** via the frontend UI (Phase 2.5)
3. **Track conversion rates** for each template

---

## Cost Breakdown

**Pinecone Free Tier**:
- 100,000 vectors (you're using 30)
- 1 index
- Unlimited queries
- **Cost**: $0/month

**Embedding Model**:
- all-MiniLM-L6-v2
- Runs locally
- **Cost**: $0 (no API calls)

**Email Generation** (coming next):
- Gemini Flash: $0.000015/email
- GPT-4o-mini: $0.00003/email
- **500 emails**: ~$0.009

**Total Phase 2.5 Cost**: ~$0.009 for 500 emails!

---

## Architecture Diagram

```
User Request
    ↓
Lead Dossier (pain points, industry, etc.)
    ↓
Create embedding (all-MiniLM-L6-v2, local, FREE)
    ↓
Search Pinecone (find top 3 similar templates)
    ↓
Pick best template
    ↓
Personalize with LLM (Gemini Flash or GPT-4o-mini)
    ↓
Return personalized email
```

---

## Ready to Proceed?

Once you've completed Steps 1-4, let me know and I'll build the email generation agent!
