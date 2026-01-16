"""
Multi-Source Search Engine
Provides reliable company discovery using multiple search providers with automatic fallback
"""

import os
from typing import List, Dict
from duckduckgo_search import DDGS
from dotenv import load_dotenv

load_dotenv()

class SearchEngine:
    def __init__(self):
        self.serpapi_key = os.getenv("SERPAPI_API_KEY")
        
    def search(self, query: str, max_results: int = 10) -> List[Dict]:
        """
        Search using multiple engines with automatic fallback
        Priority: SerpAPI (Google) -> DuckDuckGo -> Manual fallback
        """
        results = []
        
        # Try SerpAPI first (most reliable, uses Google)
        if self.serpapi_key:
            print(f"DEBUG: Trying SerpAPI for: {query}")
            results = self._search_serpapi(query, max_results)
            if results:
                print(f"DEBUG: SerpAPI returned {len(results)} results")
                return results
        
        # Fallback to DuckDuckGo
        print(f"DEBUG: Trying DuckDuckGo for: {query}")
        results = self._search_duckduckgo(query, max_results)
        if results:
            print(f"DEBUG: DuckDuckGo returned {len(results)} results")
            return results
        
        # Last resort: Try a broader query
        print(f"DEBUG: Trying broader query...")
        broad_query = query.split()[0:3]  # Take first 3 words
        results = self._search_duckduckgo(" ".join(broad_query), max_results)
        
        return results
    
    def _search_serpapi(self, query: str, max_results: int) -> List[Dict]:
        """Search using SerpAPI (Google Search API)"""
        try:
            import requests
            
            if not self.serpapi_key or self.serpapi_key == "your_serpapi_key_here":
                print("DEBUG: SerpAPI key not configured")
                return []
            
            params = {
                "q": query,
                "api_key": self.serpapi_key,
                "num": max_results,
                "engine": "google"
            }
            
            print(f"DEBUG: Calling SerpAPI with key: {self.serpapi_key[:10]}...")
            response = requests.get("https://serpapi.com/search", params=params, timeout=10)
            
            if response.status_code != 200:
                print(f"DEBUG: SerpAPI HTTP {response.status_code}: {response.text[:200]}")
                return []
            
            data = response.json()
            
            if "error" in data:
                print(f"DEBUG: SerpAPI error: {data['error']}")
                return []
            
            results = []
            for item in data.get("organic_results", [])[:max_results]:
                results.append({
                    "title": item.get("title", ""),
                    "href": item.get("link", ""),
                    "body": item.get("snippet", "")
                })
            
            return results
            
        except Exception as e:
            print(f"DEBUG: SerpAPI exception: {type(e).__name__}: {e}")
            return []
    
    def _search_duckduckgo(self, query: str, max_results: int) -> List[Dict]:
        """Search using DuckDuckGo"""
        try:
            with DDGS() as ddgs:
                results = list(ddgs.text(query, max_results=max_results))
                return results
        except Exception as e:
            print(f"DEBUG: DuckDuckGo error: {e}")
            return []


# Singleton instance
_search_engine = None

def get_search_engine():
    global _search_engine
    if _search_engine is None:
        _search_engine = SearchEngine()
    return _search_engine
