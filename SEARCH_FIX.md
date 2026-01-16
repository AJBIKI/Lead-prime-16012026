# Search Quality Fix

## Problem
DuckDuckGo search API is unreliable:
- Returns 0 results for many queries
- Inconsistent availability
- Rate limiting issues

## Solution: Multi-Engine Search

I've implemented a **fallback search system** that tries multiple sources:

### Priority Order:
1. **SerpAPI (Google Search)** - Most reliable, requires API key
2. **DuckDuckGo** - Free fallback
3. **Broader Query** - Last resort (uses fewer keywords)

### How to Enable Better Search

**Option 1: Free (Current)**
- Uses DuckDuckGo only
- Works but unreliable
- No setup needed

**Option 2: Reliable (Recommended)**
- Get a free SerpAPI key: https://serpapi.com/users/sign_up
  - Free tier: 100 searches/month
  - Uses Google's search engine (much more reliable)
  
- Add to `ai_engine/.env`:
  ```bash
  SERPAPI_API_KEY=your_key_here
  ```

- Restart AI Engine

### What You'll See

**With SerpAPI**:
```
DEBUG: Trying SerpAPI for: AI startups in San Francisco
DEBUG: SerpAPI returned 10 results
DEBUG: ✓ Accepted: https://openai.com...
DEBUG: ✓ Accepted: https://anthropic.com...
DEBUG: Returning 5 filtered leads.
```

**Without SerpAPI** (current):
```
DEBUG: Trying DuckDuckGo for: AI startups in San Francisco
DEBUG: DuckDuckGo returned 0 results
DEBUG: Trying broader query...
DEBUG: Returning 1 filtered leads.
```

### Alternative: Use Different Search Terms

If you don't want to use SerpAPI, try more specific ICPs:
- ❌ "AI startups in San Francisco" (too broad)
- ✅ "OpenAI San Francisco" (specific company)
- ✅ "YCombinator AI companies" (known list)
- ✅ "Anthropic Claude AI" (specific product)

The search works better with **specific company names** or **known directories** rather than generic categories.
