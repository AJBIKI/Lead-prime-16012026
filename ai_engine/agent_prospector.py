from duckduckgo_search import DDGS
from pydantic import BaseModel, Field

# Define the output structure
class Lead(BaseModel):
    company_name: str = Field(description="Name of the company found")
    website: str = Field(description="URL of the company website")
    context: str = Field(description="Brief description of why this company matches the ICP")




def search_leads(icp: str):
    """
    Executes a search for leads matching the ICP using multi-engine search.
    Uses SerpAPI (Google) if available, falls back to DuckDuckGo.
    """
    from search_engine import get_search_engine
    
    # Try multiple search strategies
    queries = [
        f"{icp} company website",  # Direct company search
        f"{icp} startups",  # Startup-focused
        f"{icp} companies",  # General companies
        icp  # Fallback to raw query
    ]
    
    search_engine = get_search_engine()
    raw_results = []
    
    for q in queries:
        print(f"DEBUG: Searching for: {q}")
        try:
            raw_results = search_engine.search(q, max_results=20)
            if raw_results:
                print(f"DEBUG: Found {len(raw_results)} raw results.")
                break  # Stop if we found something
        except Exception as e:
            print(f"DEBUG: Search failed for '{q}': {e}")
            continue
        
    # Expanded blacklist for better filtering
    blacklist = [
        "wikipedia.org", "linkedin.com/lists", "clutch.co", "yelp.com", 
        "top10", "best of", "google.com/search", "support.google.com", 
        "play.google.com", "youtube.com", "docs.google.com",
        "facebook.com", "twitter.com", "instagram.com",
        "crunchbase.com/lists", "angellist.com/lists",
        # Non-English sites
        "zhihu.com", "baidu.com", "weibo.com", "qq.com",
        "yandex.ru", "vk.com", "mail.ru"
    ]
    
    # Non-English TLDs to skip (blacklist approach is better than whitelist)
    non_english_tlds = [".cn", ".ru", ".jp", ".kr", ".tw", ".hk"]
    
    filtered_results = []
    seen_domains = set()
    
    print(f"DEBUG: Filtering {len(raw_results)} results...")
    
    for r in raw_results:
        href = r.get('href', '').lower()
        title = r.get('title', '').lower()
        
        # Skip if in blacklist
        if any(b in href for b in blacklist):
            print(f"DEBUG: Blacklisted: {href[:60]}...")
            continue
        
        # Skip if title looks like a list/directory
        if any(word in title for word in ['list of', 'top ', 'best ', 'directory']):
            print(f"DEBUG: Skipped list page: {title[:60]}...")
            continue
        
        # Skip non-English TLDs
        if any(tld in href for tld in non_english_tlds):
            print(f"DEBUG: Skipped non-English TLD: {href[:60]}...")
            continue
    
    print(f"DEBUG: Filtering {len(raw_results)} results...")
    
    for r in raw_results:
        href = r.get('href', '').lower()
        title = r.get('title', '').lower()
        
        # Skip if in blacklist
        if any(b in href for b in blacklist):
            print(f"DEBUG: Blacklisted: {href[:60]}...")
            continue
        
        # Skip if title looks like a list/directory
        if any(word in title for word in ['list of', 'top ', 'best ', 'directory']):
            print(f"DEBUG: Skipped list page: {title[:60]}...")
            continue
            
        # Deduplicate domains
        try:
            domain = href.split('/')[2] if '//' in href else href
        except:
            continue
            
        if domain in seen_domains:
            continue
        seen_domains.add(domain)
        
        print(f"DEBUG: ✓ Accepted: {href[:60]}...")
        filtered_results.append(r)
        
        if len(filtered_results) >= 5:
            break
            
    print(f"DEBUG: Returning {len(filtered_results)} filtered leads.")
    return {"raw_results": filtered_results}

if __name__ == "__main__":
    # Test
    print(search_leads("Series B Fintech startups in London"))
