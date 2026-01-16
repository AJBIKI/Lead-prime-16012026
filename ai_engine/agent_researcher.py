from langchain.tools import tool
from pydantic import BaseModel, Field
from playwright.sync_api import sync_playwright
from bs4 import BeautifulSoup
import re

class ResearchInput(BaseModel):
    url: str = Field(description="The URL of the company website to research")

class ResearchOutput(BaseModel):
    summary: str = Field(description="Summary of the company")
    technologies: list[str] = Field(description="List of technologies detected (simulated)")
    key_personnel: list[str] = Field(description="Potential key contacts found")

def clean_text(text):
    return re.sub(r'\s+', ' ', text).strip()

def scrape_website(url: str):
    """
    Scrapes the landing page of the given URL.
    """
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page()
            # Set a realistic user agent
            page.set_extra_http_headers({"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"})
            
            page.goto(url, timeout=60000, wait_until="domcontentloaded")
            content = page.content()
            browser.close()
            
            soup = BeautifulSoup(content, 'html.parser')
            # Kill scripts and styles
            for script in soup(["script", "style", "nav", "footer"]):
                script.extract()
            
            text = soup.get_text()
            return clean_text(text)[:5000] # Return first 5000 chars to avoid token limits
            
    except Exception as e:
        return f"Error scraping {url}: {str(e)}"

# Removed @tool decorator to allow passing config
def research_company(url: str, config: dict = None):
    """
    Performs a deep-dive research on a company website using LLM extraction.
    Args:
        url: Company website URL
        config: Dict containing API keys and preferences
    """
    from llm_service import LLMService
    import json
    
    # Step 1: Scrape the website
    raw_text = scrape_website(url)
    
    if raw_text.startswith("Error"):
        return {
            "source_url": url,
            "error": raw_text,
            "company_summary": None
        }
    
    # Step 2: Use LLM to extract structured insights
    try:
        # STRICT PROVIDER SELECTION:
        # Use the preferred_model from config (user's choice in Settings)
        # Do NOT automatically switch providers based on key availability
        provider = config.get("preferred_model", "gemini") if config else "gemini"
        
        # Map provider to key name in the config dict
        key_map = {
            "openai": "openai_key",
            "gemini": "gemini_key",
            "huggingface": "huggingface_key"
        }
        key_name = key_map.get(provider)
        
        # Get the user's key for the selected provider (may be None)
        # If None, LLMService will fallback to the Developer/System key
        api_key = config.get(key_name) if config and key_name else None
        
        # Get the specific model version (for OpenAI)
        model = config.get("openai_model") if provider == "openai" else None
        
        print(f"[RESEARCHER] Using provider: {provider}, model: {model}, has_user_key: {api_key is not None}")
        
        llm = LLMService(provider=provider, model=model, api_key=api_key)
        
        extraction_prompt = f"""
Analyze this company website content and extract key information in JSON format.

Website Content:
{raw_text[:4000]}

Extract the following:
1. company_name: The company's name
2. company_summary: A 2-sentence summary of what they do
3. value_proposition: Their main value prop or unique selling point
4. target_customers: List of customer types they serve (max 3)
5. technologies: List of technologies mentioned (max 5)
6. pain_points: List of potential pain points or challenges they address (max 3)
7. recent_news: Any recent news, funding, or achievements mentioned (max 2)

Return ONLY valid JSON, no other text.
"""
        
        system_prompt = "You are a B2B research analyst. Extract structured data from company websites. Return only valid JSON."
        
        response = llm.generate(
            prompt=extraction_prompt,
            system_prompt=system_prompt,
            max_tokens=800,
            temperature=0.3,  # Low temperature for factual extraction
            json_mode=True
        )
        
        # Parse the JSON response
        try:
            extracted_data = json.loads(response["content"])
        except json.JSONDecodeError as e:
            print(f"JSON parsing error: {e}")
            # Try to extract JSON from markdown code blocks
            content = response["content"]
            if "```json" in content:
                json_start = content.find("```json") + 7
                json_end = content.find("```", json_start)
                if json_end > json_start:
                    try:
                        extracted_data = json.loads(content[json_start:json_end].strip())
                    except:
                        raise e
                else:
                    raise e
            else:
                raise e
        
        # Add metadata
        extracted_data["source_url"] = url
        extracted_data["extraction_tokens"] = response["tokens"]
        extracted_data["extraction_cost"] = response["cost"]
        extracted_data["llm_provider"] = response["provider"]
        
        print(f"✓ Extracted insights from {url} using {response['provider']} ({response['tokens']} tokens, ${response['cost']:.4f})")
        
        return extracted_data
        
    except json.JSONDecodeError as e:
        print(f"JSON parsing error: {e}")
        # Fallback to raw text if LLM fails to return valid JSON
        return {
            "source_url": url,
            "raw_content_preview": raw_text[:500],
            "full_content_length": len(raw_text),
            "error": "LLM returned invalid JSON"
        }
    except Exception as e:
        print(f"❌ LLM extraction error for {url}: {e}")
        print(f"   Error type: {type(e).__name__}")
        import traceback
        traceback.print_exc()
        return {
            "source_url": url,
            "raw_content_preview": raw_text[:500] if 'raw_text' in locals() else "No content scraped",
            "error": str(e)
        }

if __name__ == "__main__":
    # Test
    print(research_company.invoke({"url": "https://example.com"}))
