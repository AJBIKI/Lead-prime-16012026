# Language Filtering Fix

## Problem
DuckDuckGo was returning Chinese websites (zhihu.com, baidu.com) for English queries like "OpenAI San Francisco" and "AI startups in San Francisco".

## Root Cause
DuckDuckGo's free API doesn't properly filter by language/region, so it returns results from all languages based on keyword matching.

## Fixes Applied

### 1. Region Parameter
Added `region='us-en'` to force English results:
```python
ddgs.text(query, region='us-en', max_results=20)
```

### 2. Chinese Domain Blacklist
Added common Chinese sites to blacklist:
- zhihu.com (Chinese Q&A site)
- baidu.com (Chinese search engine)
- weibo.com (Chinese social media)
- qq.com (Chinese messaging)

Also added Russian sites:
- yandex.ru, vk.com, mail.ru

### 3. English TLD Whitelist
Only accept domains ending in:
- .com, .io, .ai, .co, .net, .org

This filters out most non-English sites.

## Testing

**Restart AI Engine** and try:
```
"OpenAI"
"Anthropic"
"Stripe"
```

You should now see actual English company websites instead of Chinese Q&A sites.

## If Still Getting Chinese Results

This means DuckDuckGo's API is fundamentally broken for your region. Your only options:

1. **Use SerpAPI** (recommended):
   - Get free key: https://serpapi.com/users/sign_up
   - Add to `.env`: `SERPAPI_API_KEY=your_key`
   - Uses Google search (always returns correct language)

2. **Use specific company names** instead of generic searches:
   - ✅ "OpenAI" → finds openai.com
   - ❌ "AI startups" → finds random sites

3. **Wait for Phase 2.5** where I'll add:
   - Bing Search API
   - Direct company database (Crunchbase, etc.)
   - Manual CSV upload option
