# Strict Model Enforcement Plan (AI Engine)

## Goal
Enforce strict cost controls in the AI Engine (`llm_service.py`).
1.  **Dynamic Model Support**: Respect the model passed from the Node.js backend (e.g., `gpt-4-turbo`) **IF AND ONLY IF** a User Key is provided.
2.  **Strict Fallback**: If the User Key fails (or is missing) and the system falls back to the System/Developer Key, it **MUST** force the model to `gpt-4o-mini`.

## Logic Flow

### Current `__init__`
```python
self.model = model or "gpt-4o-mini"
self.api_key = api_key
```

### Proposed `__init__` Logic
```python
# If NO user key is provided, FORCE mini immediately
if not api_key and provider == "openai":
    self.model = "gpt-4o-mini"
else:
    self.model = model or "gpt-4o-mini"
```

### Proposed `_fallback_generate` Logic (The Critical Fix)
When falling back from a failed User Key attempt to a generic OpenAI attempt:
```python
def _fallback_generate(self, ...):
    print("Attempting fallback...")
    
    # CRITICAL: If falling back to OpenAI Developer Key, we MUST downgrade model
    try:
        fallback = LLMService(
            provider="openai",
            model="gpt-4o-mini", # <--- FORCE DOWNGRADE
            api_key=None         # Use System/Developer Key
        )
        return fallback.generate(...)
    except...
```

## Verification Plan
1.  **Manual Test**:
    -   Set `openai_model` to `gpt-4o` in Settings (mocking a request).
    -   Trigger a campaign with an **INVALID** User Key.
    -   Verify logs: Should see "LLM Error... Attempting fallback" followed by a successful generation using `gpt-4o-mini`.
2.  **Code Review**:
    -   Verify `_fallback_generate` explicitly hardcodes `model="gpt-4o-mini"`.
