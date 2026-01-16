from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from graph import app as agent_app
from routes_email import router as email_router
import uvicorn
import os
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="Lead Gen AI Engine")

# Include email generation routes
app.include_router(email_router)

class ProspectRequest(BaseModel):
    icp: str
    config: dict = None

@app.get("/")
def root():
    return {"status": "AI Engine Operational", "mode": "Deep Tech"}

@app.get("/health")
def health_check():
    """Health check endpoint for Docker/Load Balancer"""
    return {
        "status": "healthy",
        "service": "ai-engine",
        "version": "1.0.0"
    }

@app.post("/prospect")
def prospect(request: ProspectRequest):
    try:
        # Run the LangGraph workflow
        result = agent_app.invoke({
            "icp": request.icp, 
            "config": request.config or {}, 
            "leads": [], 
            "reports": [], 
            "errors": []
        })
        return {
            "status": "success", 
            "data": {
                "leads": result.get("leads"),
                "reports": result.get("reports"),
                "errors": result.get("errors")
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
