# IMPORTANT: Railway Deployment Instructions

Railway does NOT support docker-compose deployments from a monorepo.

## How to Deploy on Railway:

You must create **3 separate services** manually:

### Service 1: Frontend
1. New → GitHub Repo → Select this repo
2. **Settings → Service Settings**
3. **Root Directory**: `client`
4. **Build Command**: (auto-detected from Dockerfile)
5. Add environment variables (see DEPLOYMENT.md)

### Service 2: Backend
1. New → GitHub Repo → Select this repo
2. **Settings → Service Settings**
3. **Root Directory**: `server`
4. **Build Command**: (auto-detected from Dockerfile)
5. Add environment variables (see DEPLOYMENT.md)

### Service 3: AI Engine
1. New → GitHub Repo → Select this repo
2. **Settings → Service Settings**
3. **Root Directory**: `ai_engine`
4. **Build Command**: (auto-detected from Dockerfile)
5. Add environment variables (see DEPLOYMENT.md)

## For Local Development:

Use the renamed file:
```bash
docker-compose -f docker-compose.local.yml up -d
```

## Alternative: Use Render

Render has better docker-compose support. See DEPLOYMENT.md for instructions.
