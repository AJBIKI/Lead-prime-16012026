from typing import TypedDict, Annotated, List, Dict
import operator
from langgraph.graph import StateGraph, END
from agent_prospector import search_leads
from agent_researcher import research_company

# 1. Define the State
# 1. Define the State
class AgentState(TypedDict):
    icp: str
    config: Dict # API keys and preferences
    leads: List[Dict] # Simplified list of leads found
    reports: List[Dict] # Deep dive reports
    errors: List[str]

# 2. Define the Nodes
def prospect_node(state: AgentState):
    print(f"--- PROSPECTING: {state['icp']} ---")
    try:
        # search_leads returns {"raw_results": [...]}
        output = search_leads(state['icp']) 
        raw_leads = output.get("raw_results", [])
        
        # Simple normalization for the MVP
        # DDGS returns list of dicts: [{'title':..., 'href':..., 'body':...}]
        normalized_leads = []
        for item in raw_leads:
            if 'href' in item:
                normalized_leads.append({
                    "company_name": item.get('title', 'Unknown'),
                    "website": item.get('href'),
                    "context": item.get('body', '')
                })
        
        return {"leads": normalized_leads}
    except Exception as e:
        return {"errors": [f"Prospecting Error: {str(e)}"]}

def research_node(state: AgentState):
    print("--- RESEARCHING ---")
    reports = []
    leads = state.get("leads", [])
    config = state.get("config", {})
    
    # Limit to top 3 for MVP speed/safety
    for lead in leads[:3]:
        url = lead.get("website")
        if url:
            print(f"Researching: {url}")
            try:
                # agent_researcher is now a function, not a Tool
                report = research_company(url, config)
                
                # Combine original lead data with research
                enriched_data = {**lead, "deep_dive": report}
                reports.append(enriched_data)
            except Exception as e:
                print(f"Failed to research {url}: {e}")
                state["errors"].append(f"Research Error {url}: {str(e)}")
    
    return {"reports": reports}

# 3. Define the Graph
workflow = StateGraph(AgentState)

workflow.add_node("prospector", prospect_node)
workflow.add_node("researcher", research_node)

workflow.set_entry_point("prospector")
workflow.add_edge("prospector", "researcher")
workflow.add_edge("researcher", END)

# 4. Compile
app = workflow.compile()

if __name__ == "__main__":
    # Test Run
    result = app.invoke({"icp": "AI agent startups in San Francisco", "leads": [], "reports": [], "errors": []})
    import json
    print(json.dumps(result, indent=2))
