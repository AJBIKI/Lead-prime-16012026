# Phase 4.7: Advanced Model Configuration

This phase introduces granular control over AI configurations, specifically allowing users to unlock premium models when bringing their own API keys.

## Features

### 1. Conditional Model Selection (OpenAI)
- **Goal**: Allow users to choose their preferred OpenAI model (e.g., `gpt-4-turbo`, `gpt-4o`) ONLY if they provide their own API key.
- **Default Behavior**: If using the system/developer key, the model is strictly locked to `gpt-4o-mini` (Cost Control).

## Implementation Checklist

### Frontend (Settings Page)
- [ ] **Validation Logic**: Check if the user has entered/saved a personal OpenAI key.
- [ ] **UI Update**: 
    - Convert "Preferred Model" from a simple toggle to a more detailed selector.
    - If `OpenAI` is selected:
        - Show a "Model Version" dropdown (e.g., `gpt-4o-mini`, `gpt-4o`, `gpt-4-turbo`).
        - **DISABLE** this dropdown (lock to `gpt-4o-mini`) if no personal key is present.
        - **ENABLE** this dropdown if a personal key is detected.
        - Add a tooltip/helper text explaining: "Enter your own API Key to unlock advanced models".

### Backend
- [ ] **Database Schema**: Update `User` model (if needed) to store `settings.openai_model` preference (separate from the generic `preferred_model` provider flag).
- [ ] **API Routes (`settings.js`)**: 
    - Accept and save the specific model version.
    - Validate that a user isn't trying to save a premium model without a key (server-side enforcement).
- [ ] **AI Engine Interface (`agents.js`)**: 
    - Pass the specific model version to the Python engine in the `config` object.

### AI Engine (Python)
- [ ] **LLM Service (`llm_service.py`)**: 
    - Update `LLMService` initialization to accept a dynamic `model` choice.
    - Ensure the logic respects the passed config:
        - If `api_key` is provided (User Key) -> Use `config.model`.
        - If `api_key` is None (Dev Key) -> Ignore `config.model` and force `gpt-4o-mini`.
    - **Strict Fallback Protection**: 
        - If the User Key is provided but FAILS (e.g. invalid key), the system might try to fallback.
        - **Requirement**: If falling back to the Developer Key, YOU MUST FORCE RESET the model to `gpt-4o-mini`. 
        - **NEVER** allow a fallback execution to run on premium models (e.g. GPT-4) using the Developer Key.

## Testing
- [ ] Verify UI locks dropdown when key is empty.
- [ ] Verify UI unlocks dropdown when key is added.
- [ ] Test campaign execution with Dev Key (should use mini).
- [ ] Test campaign execution with User Key + GPT-4 (should use GPT-4).
