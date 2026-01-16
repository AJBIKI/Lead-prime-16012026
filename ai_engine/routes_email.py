"""
FastAPI endpoint for email generation
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Dict, List, Optional
from agent_emailer import EmailAgent
import logging

router = APIRouter()
email_agent = EmailAgent()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class EmailGenerationRequest(BaseModel):
    lead_dossier: Dict
    user_context: Dict
    template_category: Optional[str] = None


class EmailGenerationResponse(BaseModel):
    subject: str
    body: str
    template_id: str
    template_category: str
    template_match_score: float
    tokens: int
    cost: float
    llm_provider: str


@router.post("/generate-email", response_model=EmailGenerationResponse)
async def generate_email(request: EmailGenerationRequest):
    """
    Generate personalized email for a lead
    
    Args:
        request: EmailGenerationRequest with lead_dossier and user_context
    
    Returns:
        Generated email with metadata
    """
    try:
        logger.info(f"Generating email for {request.lead_dossier.get('company_name', 'Unknown')}")
        
        # Generate email
        result = email_agent.generate_email(
            lead_dossier=request.lead_dossier,
            user_context=request.user_context,
            template_category=request.template_category
        )
        
        if "error" in result:
            raise HTTPException(status_code=500, detail=result["error"])
        
        return EmailGenerationResponse(**result)
        
    except Exception as e:
        logger.error(f"Email generation error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
