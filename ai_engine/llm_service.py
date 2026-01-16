"""
LLM Service Layer - Unified interface for multiple LLM providers
Supports: OpenAI, Google Gemini, HuggingFace
"""

import os
from typing import Optional, Dict, Any, List
from enum import Enum
import time
from dotenv import load_dotenv

load_dotenv()

class LLMProvider(Enum):
    OPENAI = "openai"
    GEMINI = "gemini"
    HUGGINGFACE = "huggingface"

class LLMService:
    def __init__(self, provider: str = None, model: str = None, api_key: str = None):
        """
        Initialize LLM service with specified provider
        
        Args:
            provider: 'openai', 'gemini', or 'huggingface'
            model: Specific model name (optional, uses defaults)
            api_key: User-provided API key (optional, uses env vars otherwise)
        """
        self.provider = provider or os.getenv("LLM_PROVIDER", "openai")
        self.api_key = api_key
        
        # STRICT COST CONTROL:
        # If using OpenAI and NO user key is provided (falling back to Dev Key),
        # force the model to be 'gpt-4o-mini' to protect developer quota.
        if self.provider == "openai" and not self.api_key:
            self.model = "gpt-4o-mini"
        else:
            self.model = model
            
        self.total_tokens = 0
        self.total_cost = 0.0
        
        # Initialize the appropriate client
        self._init_client()
    
    def _init_client(self):
        """Initialize the LLM client based on provider"""
        if self.provider == "openai":
            from openai import OpenAI
            key = self.api_key or os.getenv("OPENAI_API_KEY")
            self.client = OpenAI(api_key=key)
            self.model = self.model or "gpt-4o-mini"  # Cost-effective default
            
        elif self.provider == "gemini":
            import google.generativeai as genai
            key = self.api_key or os.getenv("GOOGLE_API_KEY")
            genai.configure(api_key=key)
            self.client = genai.GenerativeModel(self.model or 'gemini-1.5-flash')
            
        elif self.provider == "huggingface":
            from huggingface_hub import InferenceClient
            key = self.api_key or os.getenv("HUGGINGFACE_API_KEY")
            self.client = InferenceClient(token=key)
            self.model = self.model or "meta-llama/Llama-3.2-3B-Instruct"
        
        else:
            raise ValueError(f"Unsupported provider: {self.provider}")
    
    def generate(
        self, 
        prompt: str, 
        system_prompt: Optional[str] = None,
        max_tokens: int = 1000,
        temperature: float = 0.7,
        json_mode: bool = False
    ) -> Dict[str, Any]:
        """
        Generate text using the configured LLM provider
        
        Returns:
            {
                "content": str,
                "tokens": int,
                "cost": float,
                "provider": str,
                "model": str
            }
        """
        start_time = time.time()
        
        try:
            if self.provider == "openai":
                response = self._generate_openai(prompt, system_prompt, max_tokens, temperature, json_mode)
            elif self.provider == "gemini":
                response = self._generate_gemini(prompt, system_prompt, max_tokens, temperature)
            elif self.provider == "huggingface":
                response = self._generate_huggingface(prompt, system_prompt, max_tokens, temperature)
            
            # Track usage
            self.total_tokens += response.get("tokens", 0)
            self.total_cost += response.get("cost", 0.0)
            
            response["latency"] = time.time() - start_time
            return response
            
        except Exception as e:
            print(f"LLM Error ({self.provider}): {str(e)}")
            # Fallback to cheaper provider if available
            return self._fallback_generate(prompt, system_prompt, max_tokens, temperature)

    def _generate_openai(self, prompt, system_prompt, max_tokens, temperature, json_mode):
        """OpenAI-specific generation"""
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})
        
        kwargs = {
            "model": self.model,
            "messages": messages,
            "max_tokens": max_tokens,
            "temperature": temperature
        }
        
        if json_mode:
            kwargs["response_format"] = {"type": "json_object"}
        
        response = self.client.chat.completions.create(**kwargs)
        
        tokens = response.usage.total_tokens
        # Pricing (as of 2024): gpt-4o-mini ~$0.15/1M input, $0.60/1M output
        cost = (response.usage.prompt_tokens * 0.15 + response.usage.completion_tokens * 0.60) / 1_000_000
        
        return {
            "content": response.choices[0].message.content,
            "tokens": tokens,
            "cost": cost,
            "provider": "openai",
            "model": self.model
        }
    
    def _generate_gemini(self, prompt, system_prompt, max_tokens, temperature):
        """Google Gemini-specific generation"""
        full_prompt = f"{system_prompt}\n\n{prompt}" if system_prompt else prompt
        
        response = self.client.generate_content(
            full_prompt,
            generation_config={
                "max_output_tokens": max_tokens,
                "temperature": temperature
            }
        )
        
        # Gemini pricing: Flash is very cheap (~$0.075/1M input)
        tokens = response.usage_metadata.total_token_count if hasattr(response, 'usage_metadata') else 0
        cost = tokens * 0.075 / 1_000_000
        
        return {
            "content": response.text,
            "tokens": tokens,
            "cost": cost,
            "provider": "gemini",
            "model": self.model or "gemini-1.5-flash"
        }
    
    def _generate_huggingface(self, prompt, system_prompt, max_tokens, temperature):
        """HuggingFace-specific generation"""
        full_prompt = f"{system_prompt}\n\n{prompt}" if system_prompt else prompt
        
        response = self.client.text_generation(
            full_prompt,
            model=self.model,
            max_new_tokens=max_tokens,
            temperature=temperature
        )
        
        # HuggingFace Inference API pricing varies, estimate conservatively
        tokens = len(response.split()) * 1.3  # Rough token estimate
        cost = tokens * 0.001 / 1_000_000  # Very cheap
        
        return {
            "content": response,
            "tokens": int(tokens),
            "cost": cost,
            "provider": "huggingface",
            "model": self.model
        }


    def _fallback_generate(self, prompt, system_prompt, max_tokens, temperature):
        """Fallback to a different provider if primary fails"""
        print(f"Attempting fallback from {self.provider}...")
        
        # CRITICAL FIX: If using OpenAI with a User key that failed,
        # retry with the Developer key (api_key=None)
        if self.provider == "openai" and self.api_key is not None:
            try:
                print("[FALLBACK] User OpenAI key failed. Retrying with Developer OpenAI key...")
                fallback = LLMService(
                    provider="openai",
                    model="gpt-4o-mini",  # Force cheap model for developer key
                    api_key=None  # Use developer/system key
                )
                print("[FALLBACK] Fallback LLMService created successfully, generating...")
                result = fallback.generate(prompt, system_prompt, max_tokens, temperature)
                print(f"[FALLBACK] Success! Used Developer {result.get('provider')} key with model {result.get('model')}")
                return result
            except Exception as e:
                print(f"❌ [FALLBACK] Developer OpenAI key also failed: {str(e)}")
                import traceback
                traceback.print_exc()
        
        # Try OpenAI as fallback (for non-OpenAI providers)
        elif self.provider != "openai":
            try:
                print("[FALLBACK] Creating fallback LLMService with Developer OpenAI key...")
                fallback = LLMService(
                    provider="openai",
                    model="gpt-4o-mini", 
                    api_key=None
                )
                print("[FALLBACK] Fallback LLMService created successfully, generating...")
                result = fallback.generate(prompt, system_prompt, max_tokens, temperature)
                print(f"[FALLBACK] Success! Used {result.get('provider')} with model {result.get('model')}")
                return result
            except Exception as e:
                print(f"❌ [FALLBACK] OpenAI fallback also failed: {str(e)}")
                import traceback
                traceback.print_exc()
        else:
            print(f"[FALLBACK] Using Developer OpenAI key already, no further fallback available")
        
        # Last resort: return error with details
        return {
            "content": f"Error: All LLM providers failed. Prompt: {prompt[:100]}...",
            "tokens": 0,
            "cost": 0.0,
            "provider": "none",
            "model": "error"
        }
    
    def get_usage_stats(self) -> Dict[str, Any]:
        """Get cumulative usage statistics"""
        return {
            "total_tokens": self.total_tokens,
            "total_cost": round(self.total_cost, 4),
            "provider": self.provider,
            "model": self.model
        }


# Convenience function for quick usage
def generate_text(prompt: str, provider: str = "openai", **kwargs) -> str:
    """Quick helper to generate text"""
    service = LLMService(provider=provider)
    response = service.generate(prompt, **kwargs)
    return response["content"]


if __name__ == "__main__":
    # Test the service
    service = LLMService(provider="openai")
    
    result = service.generate(
        prompt="Extract the company name and industry from: 'Stripe is a fintech company that provides payment processing.'",
        system_prompt="You are a data extraction assistant. Return JSON only.",
        json_mode=True,
        max_tokens=100
    )
    
    print("Response:", result["content"])
    print("Stats:", service.get_usage_stats())
