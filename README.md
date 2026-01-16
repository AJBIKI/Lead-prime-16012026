# 🚀 The Revenue Engine: AI-Powered Lead Generation Platform

**The Revenue Engine** is an intelligent lead generation and research platform powered by autonomous AI agents. Automatically discover, research, and qualify potential customers with deep company insights.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)
![Python](https://img.shields.io/badge/python-3.11-blue.svg)
![Docker](https://img.shields.io/badge/docker-ready-blue.svg)

---

## 🚀 Overview

Unlike traditional tools that just give you a static list of emails, this system employs **Autonomous AI Agents** to:

1. **Find** companies matching your Ideal Customer Profile (ICP) using real-time search
2. **Visit** their actual websites (using headless browsers) to "read" their value proposition
3. **Generate** a "Deep-Dive Dossier" with key insights, technologies used, and context for outreach
4. **Save** all data to a persistent database for your CRM pipeline

---

## ✨ Key Features

### 🎯 **AI-Powered Prospecting**
- Intelligent web search for companies matching your ICP
- Multi-source data aggregation (SerpAPI, DuckDuckGo)
- Smart filtering and deduplication
- Blacklist filtering for aggregators

### 🔍 **Deep Company Research**
- Automated company analysis using GPT-4 / Gemini
- Extracts:
  - Company summary & value proposition
  - Target customers & pain points
  - Technologies used
  - Recent news & developments
  - Key personnel

### 📊 **Analytics Dashboard**
- Campaign performance tracking
- Cost analysis (API usage)
- Lead quality metrics
- Historical trends with Recharts

### ⚙️ **Advanced Settings**
- **Multi-Model Support**: Choose between OpenAI (GPT-4, GPT-4-turbo, GPT-4o-mini) or Google Gemini
- **API Key Management**: Bring your own keys or use developer fallback
- **Smart Fallback**: Automatically switches to developer key if user key fails
- **Cost Protection**: Enforces cheap models when using developer quota

### 📧 **Email Generation**
- AI-generated personalized outreach emails
- Template management
- Context-aware messaging based on research

### 📜 **Campaign History**
- Track all your searches
- Revisit past campaigns
- Export lead data

---

## 🏗️ Architecture

The system follows a **Hybrid Microservices** architecture to ensure scalability and separation of concerns:

```
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│   Next.js       │─────▶│   Express.js    │─────▶│   FastAPI       │
│   Frontend      │      │   Backend       │      │   AI Engine     │
│   (Port 3000)   │      │   (Port 5000)   │      │   (Port 8000)   │
└─────────────────┘      └─────────────────┘      └─────────────────┘
                                 │
                                 ▼
                         ┌─────────────────┐
                         │   MongoDB       │
                         │   Database      │
                         └─────────────────┘
```

---

## 📊 System Diagrams

### 1️⃣ Full Application Architecture

```mermaid
graph TB
    subgraph "Client Layer"
        UI[Next.js Frontend<br/>Port 3000]
        UI -->|React Components| DASH[Dashboard]
        UI -->|React Components| SETTINGS[Settings]
        UI -->|React Components| ANALYTICS[Analytics]
    end
    
    subgraph "Authentication"
        UI -->|OAuth 2.0| CLERK[Clerk Auth]
        CLERK -->|JWT Token| UI
        CLERK -->|User Profile| GOOGLE[Google OAuth]
    end
    
    subgraph "API Gateway Layer"
        UI -->|HTTP/REST| BACKEND[Express.js Backend<br/>Port 5000]
        BACKEND -->|Auth Middleware| JWT[JWT Verification]
        BACKEND -->|Encryption| CRYPTO[AES-256-GCM]
    end
    
    subgraph "AI Processing Layer"
        BACKEND -->|HTTP/REST| AI[FastAPI AI Engine<br/>Port 8000]
        AI -->|LangGraph| AGENTS[AI Agents]
        AGENTS -->|Orchestration| PROSPECTOR[Prospector Agent]
        AGENTS -->|Orchestration| RESEARCHER[Researcher Agent]
    end
    
    subgraph "External Services"
        PROSPECTOR -->|Search API| SERP[SerpAPI]
        PROSPECTOR -->|Fallback Search| DDG[DuckDuckGo]
        RESEARCHER -->|Headless Browser| PLAYWRIGHT[Playwright]
        RESEARCHER -->|LLM Analysis| LLM[OpenAI / Gemini]
    end
    
    subgraph "Data Layer"
        BACKEND -->|Mongoose ODM| MONGO[(MongoDB)]
        MONGO -->|Collections| USERS[Users]
        MONGO -->|Collections| CAMPAIGNS[Campaigns]
        MONGO -->|Collections| LEADS[Leads]
    end
    
    subgraph "Monitoring & Logs"
        BACKEND -->|Winston| LOGS[Application Logs]
        AI -->|Python Logging| AILOGS[AI Engine Logs]
    end
    
    style UI fill:#3b82f6,color:white
    style BACKEND fill:#10b981,color:white
    style AI fill:#f59e0b,color:white
    style MONGO fill:#8b5cf6,color:white
```

### 2️⃣ Database Schema

```mermaid
erDiagram
    USERS ||--o{ CAMPAIGNS : creates
    USERS ||--o{ LEADS : owns
    CAMPAIGNS ||--o{ LEADS : contains
    
    USERS {
        ObjectId _id PK
        string email UK
        string password_hash
        string google_id
        string clerk_id
        object settings
        string openai_key_encrypted
        string gemini_key_encrypted
        string openai_model
        string preferred_model
        datetime createdAt
        datetime updatedAt
    }
    
    CAMPAIGNS {
        ObjectId _id PK
        ObjectId userId FK
        string name
        string icp
        string status
        int lead_count
        int email_count
        float total_cost
        datetime createdAt
        datetime completedAt
    }
    
    LEADS {
        ObjectId _id PK
        ObjectId userId FK
        ObjectId campaignId FK
        string company_name
        string website
        string context
        string company_summary
        string value_proposition
        array target_customers
        array pain_points
        array technologies
        array recent_news
        array key_personnel
        int extraction_tokens
        float extraction_cost
        string llm_provider
        string email_subject
        string email_body
        boolean email_sent
        datetime email_sent_at
        string status
        datetime createdAt
    }
```

### 3️⃣ Authentication & Agent Flow

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant Clerk
    participant Backend
    participant MongoDB
    participant AI_Engine
    participant LLM
    
    %% Authentication Flow
    rect rgb(200, 220, 250)
        Note over User,MongoDB: Authentication Flow
        User->>Frontend: Click "Sign In"
        Frontend->>Clerk: Redirect to OAuth
        Clerk->>User: Google OAuth Consent
        User->>Clerk: Approve
        Clerk->>Frontend: Return JWT Token
        Frontend->>Backend: API Request + JWT
        Backend->>Backend: Verify JWT
        Backend->>MongoDB: Find/Create User
        MongoDB-->>Backend: User Document
        Backend-->>Frontend: User Session
    end
    
    %% Agent Workflow
    rect rgb(220, 250, 220)
        Note over User,LLM: Agent Workflow
        User->>Frontend: Enter ICP + Click Launch
        Frontend->>Backend: POST /api/agents/start-campaign
        Backend->>MongoDB: Create Campaign
        Backend->>MongoDB: Fetch User Settings (API Keys)
        Backend->>Backend: Decrypt API Keys
        Backend->>AI_Engine: POST /prospect (ICP + Config)
        
        AI_Engine->>AI_Engine: Initialize LangGraph
        AI_Engine->>AI_Engine: Prospector Agent
        AI_Engine->>External: Search Web (SerpAPI)
        External-->>AI_Engine: Raw Results
        AI_Engine->>AI_Engine: Filter & Deduplicate
        
        loop For Each Lead
            AI_Engine->>AI_Engine: Researcher Agent
            AI_Engine->>External: Scrape Website (Playwright)
            External-->>AI_Engine: HTML Content
            AI_Engine->>LLM: Extract Insights (GPT/Gemini)
            LLM-->>AI_Engine: Structured Data
        end
        
        AI_Engine-->>Backend: Lead Reports
        Backend->>MongoDB: Save Leads
        Backend->>MongoDB: Update Campaign Stats
        Backend-->>Frontend: Real-time Updates
        Frontend-->>User: Display Dossiers
    end
```

### 4️⃣ Complete Agent Architecture (LangGraph)

```mermaid
graph TB
    START([User ICP Input]) --> INIT[Initialize LangGraph State]
    
    subgraph "State Management"
        INIT --> STATE{Workflow State}
        STATE -->|icp| ICP_VAR[ICP Description]
        STATE -->|leads| LEADS_VAR[Lead List]
        STATE -->|reports| REPORTS_VAR[Research Reports]
        STATE -->|config| CONFIG_VAR[API Keys & Model]
    end
    
    subgraph "Prospector Agent Node"
        STATE --> PROSPECT[Prospector Agent]
        PROSPECT --> SEARCH_STRATEGY{Search Strategy}
        
        SEARCH_STRATEGY -->|Primary| SERP_SEARCH[SerpAPI Search]
        SEARCH_STRATEGY -->|Fallback| DDG_SEARCH[DuckDuckGo Search]
        
        SERP_SEARCH --> PARSE_RESULTS[Parse Search Results]
        DDG_SEARCH --> PARSE_RESULTS
        
        PARSE_RESULTS --> FILTER[Filter Pipeline]
        FILTER -->|Remove| BLACKLIST[Social Media<br/>Aggregators<br/>Lists]
        FILTER -->|Remove| DUPLICATES[Duplicate URLs]
        FILTER -->|Keep| VALID[Valid Company Sites]
        
        VALID --> UPDATE_STATE1[Update State: leads]
    end
    
    subgraph "Researcher Agent Node"
        UPDATE_STATE1 --> RESEARCH[Researcher Agent]
        RESEARCH --> ITERATE{For Each Lead}
        
        ITERATE -->|Next Lead| SCRAPE[Playwright Scraper]
        SCRAPE --> EXTRACT_HTML[Extract Text Content]
        EXTRACT_HTML --> CLEAN[Clean & Truncate]
        
        CLEAN --> LLM_CALL{LLM Provider}
        LLM_CALL -->|User Key| USER_LLM[User's OpenAI/Gemini]
        LLM_CALL -->|Fallback| DEV_LLM[Developer Key<br/>gpt-4o-mini]
        
        USER_LLM --> PARSE_JSON[Parse JSON Response]
        DEV_LLM --> PARSE_JSON
        
        PARSE_JSON --> STRUCTURE[Structure Dossier]
        STRUCTURE -->|company_summary| SUMMARY
        STRUCTURE -->|value_proposition| VALUE
        STRUCTURE -->|pain_points| PAIN
        STRUCTURE -->|technologies| TECH
        STRUCTURE -->|recent_news| NEWS
        
        SUMMARY --> DOSSIER[Complete Dossier]
        VALUE --> DOSSIER
        PAIN --> DOSSIER
        TECH --> DOSSIER
        NEWS --> DOSSIER
        
        DOSSIER --> UPDATE_STATE2[Update State: reports]
        UPDATE_STATE2 --> ITERATE
        
        ITERATE -->|All Done| COMPLETE
    end
    
    subgraph "Persistence & Response"
        COMPLETE[All Leads Researched] --> SAVE[Save to MongoDB]
        SAVE --> RESPONSE[Return to Backend]
        RESPONSE --> END([Frontend Display])
    end
    
    style START fill:#3b82f6,color:white
    style PROSPECT fill:#10b981,color:white
    style RESEARCH fill:#f59e0b,color:white
    style SAVE fill:#8b5cf6,color:white
    style END fill:#3b82f6,color:white
```

---

## 🛠️ Tech Stack

**Frontend**:
- Next.js 14 (App Router)
- React 19
- TailwindCSS + Shadcn UI
- Recharts (Analytics)
- Clerk (Authentication)

**Backend**:
- Node.js + Express
- MongoDB + Mongoose
- JWT Authentication
- AES-256-GCM Encryption
- Winston Logger

**AI Engine**:
- Python 3.11 + FastAPI
- LangChain + LangGraph
- OpenAI GPT-4 / Google Gemini
- Playwright (Web Scraping)
- SerpAPI + DuckDuckGo (Search)

---

## 🚀 Quick Start

### **Prerequisites**
- Docker & Docker Compose (recommended)
- Node.js 18+ (for local development)
- Python 3.11+ (for local development)
- MongoDB

### **Option 1: Docker (Recommended)**

```bash
# 1. Clone the repository
git clone https://github.com/AJBIKI/Lead-prime-16012026.git
cd Lead-prime-16012026

# 2. Set up environment variables
cp server/.env.example server/.env
cp ai_engine/.env.example ai_engine/.env
# Edit both .env files with your credentials

# 3. Start all services
docker-compose up -d

# 4. Access the application
# Frontend: http://localhost:3000
# Backend: http://localhost:5000
# AI Engine: http://localhost:8000
```

### **Option 2: Manual Setup**

#### **1. Setup AI Engine**
```bash
cd ai_engine
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
playwright install chromium
python main.py  # Runs on localhost:8000
```

#### **2. Setup Backend**
```bash
cd server
npm install
node index.js  # Runs on localhost:5000
```

#### **3. Setup Frontend**
```bash
cd client
npm install
npm run dev  # Runs on localhost:3000
```

---

## 🎯 Usage

1. Open your browser to `http://localhost:3000`
2. Sign in with Google OAuth
3. In the **Campaign Configuration** input, describe your target:
   - *Example*: "Series A Fintech startups in London"
   - *Example*: "AI companies building autonomous agents in San Francisco"
4. Click **Launch Discovery Engine**
5. Watch as the AI Agents populate the dashboard with live data

---

## 📖 Documentation

- **[DEPLOYMENT.md](./DEPLOYMENT.md)** - Deploy to Railway or Render
- **[SECURITY.md](./SECURITY.md)** - Environment variables & security best practices
- **[PHASE4_PLAN.md](./PHASE4_PLAN.md)** - Development roadmap
- **[PHASE4_7_PLAN.md](./PHASE4_7_PLAN.md)** - Advanced model selection feature

---

## 🔐 Security

- ✅ **AES-256-GCM Encryption** for user API keys
- ✅ **JWT Authentication** with secure cookies
- ✅ **Environment variables** for sensitive data (never committed)
- ✅ **Rate limiting** on API endpoints
- ✅ **Input validation** and sanitization
- ✅ **HTTPS** enforced in production

See [`SECURITY.md`](./SECURITY.md) for detailed security documentation.

---

## 💰 Cost Optimization

### **API Usage**
- **OpenAI GPT-4o-mini**: ~$0.15/1M input tokens, $0.60/1M output tokens
- **Google Gemini Flash**: ~$0.075/1M tokens
- **SerpAPI**: $50/month for 5,000 searches

### **Typical Costs**
- **Per Lead Research**: $0.0002 - $0.0005 (with GPT-4o-mini)
- **Per Campaign** (5 leads): ~$0.001 - $0.003

### **Cost Protection**
- User API keys for premium models
- Developer key locked to `gpt-4o-mini`
- Automatic fallback with cost enforcement

---

## 🔮 Roadmap

### ✅ **Completed**
- [x] AI-powered prospecting with Prospector Agent
- [x] Deep company research with Researcher Agent
- [x] Analytics dashboard with Recharts
- [x] Settings & API key management
- [x] Campaign history tracking
- [x] Multi-model support (OpenAI/Gemini)
- [x] Smart fallback system with cost protection
- [x] Email generation
- [x] Docker deployment setup

### 🚧 **In Progress**
- [ ] Email automation & scheduling
- [ ] Template management UI
- [ ] Follow-up sequences

### 📋 **Planned**
- [ ] Recursive crawling (About Us, Team pages)
- [ ] LinkedIn integration
- [ ] CRM integrations (Salesforce, HubSpot)
- [ ] Advanced filtering & scoring
- [ ] Team collaboration features
- [ ] Public API access

---

## 🤝 Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

---

## 📝 License

This project is licensed under the MIT License.

---

## 🙏 Acknowledgments

- OpenAI for GPT-4 API
- Google for Gemini API
- LangChain for agent framework
- Railway/Render for hosting

---

## 📧 Support

For issues and questions:
- **GitHub Issues**: [Create an issue](https://github.com/AJBIKI/Lead-prime-16012026/issues)
- **Email**: torretobraga003@gmail.com

---

## 🌟 Star History

If you find this project useful, please consider giving it a star! ⭐

---

**Built with ❤️ by Aritra**
