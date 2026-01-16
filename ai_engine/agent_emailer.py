"""
Email Generation Agent
Uses vector template retrieval + hybrid LLM personalization for cost-optimized email generation
"""

import os
import re
from typing import Dict, List, Optional
from vector_store import EmailTemplateStore
from llm_service import LLMService
from dotenv import load_dotenv

load_dotenv()


class EmailAgent:
    def __init__(self):
        """Initialize email agent with template store and LLM service"""
        self.template_store = EmailTemplateStore()
        self.llm_gemini = LLMService(provider="gemini")  # Cheap for bulk
        self.llm_gpt = LLMService(provider="openai")     # Better for VIPs
        
    def _is_high_value_lead(self, dossier: Dict) -> bool:
        """
        Determine if lead is high-value (use GPT-4o-mini) or bulk (use Gemini Flash)
        
        Criteria for high-value:
        - Series A+ funding
        - Known/large companies
        - >50 employees (if available)
        """
        company_name = dossier.get("company_name", "").lower()
        summary = dossier.get("company_summary", "").lower()
        
        # Check for funding indicators
        high_value_keywords = [
            "series a", "series b", "series c", "series d",
            "unicorn", "ipo", "publicly traded",
            "fortune 500", "enterprise"
        ]
        
        # Check for known companies (simple heuristic)
        known_companies = [
            "google", "microsoft", "amazon", "meta", "apple",
            "anthropic", "openai", "stripe", "airbnb"
        ]
        
        # High-value if matches criteria
        if any(keyword in summary for keyword in high_value_keywords):
            return True
        
        if any(company in company_name for company in known_companies):
            return True
        
        return False
    
    def _extract_variables_from_dossier(self, dossier: Dict, user_context: Dict) -> Dict:
        """
        Extract variables from lead dossier for template personalization
        
        Args:
            dossier: Lead research data
            user_context: Sender information
        
        Returns:
            Dict of variables to fill in template
        """
        variables = {
            # Company info
            "Name": "there",  # Default if no contact name
            "company": dossier.get("company_name", "your company"),
            "Company": dossier.get("company_name", "your company"),
            
            # Pain points & goals
            "pain point": dossier.get("pain_points", ["growth"])[0] if dossier.get("pain_points") else "growth",
            "goal": dossier.get("pain_points", ["improving results"])[0] if dossier.get("pain_points") else "improving results",
            "problem": dossier.get("pain_points", ["challenges"])[0] if dossier.get("pain_points") else "challenges",
            
            # Value prop & industry
            "value_prop": dossier.get("value_proposition", "your solution"),
            "industry": dossier.get("target_customers", ["businesses"])[0] if dossier.get("target_customers") else "businesses",
            "target type": dossier.get("target_customers", ["companies"])[0] if dossier.get("target_customers") else "companies",
            
            # Technologies
            "technology": dossier.get("technologies", ["technology"])[0] if dossier.get("technologies") else "technology",
            
            # Sender info
            "Your Name": user_context.get("sender_name", "John"),
            "your solution": user_context.get("solution", "our platform"),
            "Website": user_context.get("website", "example.com"),
            
            # Generic placeholders
            "something specific": dossier.get("company_summary", "your recent work")[:100],
            "result": "better results",
            "metric": "conversions",
            "time": "30 days"
        }
        
        return variables
    
    def _fill_template(self, template: Dict, variables: Dict, llm_service: LLMService) -> Dict:
        """
        Fill template with variables using LLM for intelligent personalization
        
        Args:
            template: Email template
            variables: Variables extracted from dossier
            llm_service: LLM to use (Gemini or GPT)
        
        Returns:
            Personalized email with metadata
        """
        # Create personalization prompt
        prompt = f"""You are an expert cold email writer. Personalize this email template using the provided information.

TEMPLATE:
Subject: {template['subject']}

Body:
{template['body']}

AVAILABLE INFORMATION:
{chr(10).join(f'- {k}: {v}' for k, v in variables.items())}

INSTRUCTIONS:
1. Replace ALL placeholders [like this] with appropriate values from the information
2. If a placeholder has no exact match, use the most relevant information
3. Keep the tone and style of the original template
4. Make it sound natural and personalized
5. Keep it concise (under 150 words)
6. Return ONLY the personalized email (subject and body)

FORMAT:
Subject: <personalized subject>

<personalized body>
"""
        
        # Generate with LLM
        response = llm_service.generate(
            prompt=prompt,
            max_tokens=400,
            temperature=0.7
        )
        
        # Parse subject and body
        content = response["content"]
        lines = content.strip().split("\n")
        
        subject = ""
        body_lines = []
        found_subject = False
        
        for line in lines:
            if line.startswith("Subject:"):
                subject = line.replace("Subject:", "").strip()
                found_subject = True
            elif found_subject and line.strip():
                body_lines.append(line)
        
        body = "\n".join(body_lines).strip()
        
        # Fallback if parsing failed
        if not subject:
            subject = template["subject"]
            body = content
        
        return {
            "subject": subject,
            "body": body,
            "template_id": template["id"],
            "template_category": template.get("category", "unknown"),
            "tokens": response["tokens"],
            "cost": response["cost"],
            "llm_provider": llm_service.provider
        }
    
    def generate_email(
        self,
        lead_dossier: Dict,
        user_context: Dict,
        template_category: Optional[str] = None
    ) -> Dict:
        """
        Generate personalized email for a lead
        
        Args:
            lead_dossier: Lead research data (from agent_researcher)
            user_context: Sender information (name, company, solution, etc.)
            template_category: Optional category filter for templates
        
        Returns:
            Personalized email with metadata
        """
        print(f"\n--- GENERATING EMAIL for {lead_dossier.get('company_name', 'Unknown')} ---")
        
        # Step 1: Create search query from dossier
        query_parts = []
        if lead_dossier.get("company_summary"):
            query_parts.append(lead_dossier["company_summary"])
        if lead_dossier.get("pain_points"):
            query_parts.append(" ".join(lead_dossier["pain_points"]))
        if lead_dossier.get("value_proposition"):
            query_parts.append(lead_dossier["value_proposition"])
        
        query = " ".join(query_parts)[:500]  # Limit query length
        
        # Step 2: Search for similar templates
        print(f"Searching templates for: {query[:100]}...")
        similar_templates = self.template_store.search_similar(
            query=query,
            top_k=3,
            category_filter=template_category
        )
        
        if not similar_templates:
            return {"error": "No matching templates found"}
        
        # Get best match
        best_match = similar_templates[0]
        print(f"✓ Best template: {best_match['subject']} (score: {best_match['score']:.3f})")
        
        # Step 3: Get full template
        full_template = self.template_store.get_template_by_id(best_match["id"])
        if not full_template:
            return {"error": "Template not found"}
        
        # Step 4: Extract variables
        variables = self._extract_variables_from_dossier(lead_dossier, user_context)
        
        # Step 5: Determine LLM to use (using OpenAI for all due to Gemini issues)
        # is_high_value = self._is_high_value_lead(lead_dossier)
        # llm_service = self.llm_gpt if is_high_value else self.llm_gemini
        llm_service = self.llm_gpt  # Using OpenAI for all emails
        
        # priority = "HIGH-VALUE" if is_high_value else "BULK"
        print(f"Using {llm_service.provider} for email generation")
        
        # Step 6: Personalize with LLM
        personalized = self._fill_template(full_template, variables, llm_service)
        
        print(f"✓ Email generated using {personalized['llm_provider']} ({personalized['tokens']} tokens, ${personalized['cost']:.5f})")
        
        # Add similarity score
        personalized["template_match_score"] = best_match["score"]
        
        return personalized


def test_email_generation():
    """Test the email agent with a sample dossier"""
    agent = EmailAgent()
    
    # Sample lead dossier (from Phase 2 research)
    sample_dossier = {
        "company_name": "Anthropic",
        "company_summary": "AI safety and research company building reliable, interpretable AI systems",
        "value_proposition": "Safe, steerable AI aligned with human values",
        "target_customers": ["Enterprise", "Developers", "Researchers"],
        "technologies": ["Claude", "Constitutional AI", "Python"],
        "pain_points": ["AI safety", "Alignment challenges"],
        "recent_news": ["Series C funding", "Claude 3 launch"]
    }
    
    # User context
    user_context = {
        "sender_name": "John Doe",
        "company": "AI Solutions Inc",
        "solution": "AI safety consulting",
        "website": "aisolutions.com"
    }
    
    # Generate email
    email = agent.generate_email(sample_dossier, user_context)
    
    print("\n" + "="*60)
    print("GENERATED EMAIL:")
    print("="*60)
    print(f"\nSubject: {email['subject']}")
    print(f"\n{email['body']}")
    print("\n" + "="*60)
    print(f"Template: {email['template_id']} ({email['template_category']})")
    print(f"Match Score: {email['template_match_score']:.3f}")
    print(f"LLM: {email['llm_provider']}")
    print(f"Cost: ${email['cost']:.5f}")
    print("="*60)


if __name__ == "__main__":
    test_email_generation()
