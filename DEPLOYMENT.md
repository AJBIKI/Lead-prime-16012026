# Deployment Guide

This guide covers deploying the Lead Generator to production using Railway or Render.

## Prerequisites

- GitHub repository (already set up ✅)
- Railway or Render account
- MongoDB Atlas account (for production database)
- Domain name (optional)

---

## Option 1: Deploy to Railway (Recommended)

Railway offers the easiest deployment with automatic Docker support.

### Step 1: Set up MongoDB Atlas

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a free cluster
3. Create a database user
4. Whitelist all IPs (0.0.0.0/0) for Railway access
5. Get your connection string (looks like: `mongodb+srv://user:pass@cluster.mongodb.net/lead_generator`)

### Step 2: Deploy to Railway

1. Go to [Railway](https://railway.app/)
2. Click "New Project" → "Deploy from GitHub repo"
3. Select your `Lead-prime-16012026` repository
4. Railway will detect `docker-compose.yml` and create 3 services automatically

### Step 3: Configure Environment Variables

For each service, add the environment variables:

#### **Backend Service**
```
PORT=5000
MONGODB_URI=<your_mongodb_atlas_connection_string>
NODE_ENV=production
OPENAI_API_KEY=<your_openai_key>
GOOGLE_CLIENT_ID=<your_google_client_id>
GOOGLE_CLIENT_SECRET=<your_google_client_secret>
GOOGLE_REDIRECT_URI=https://your-backend-url.railway.app/api/auth/google/callback
GOOGLE_APP_REDIRECT_URI=https://your-backend-url.railway.app/api/app-auth/google/callback
ENCRYPTION_KEY=<generate_new_32_char_key>
JWT_SECRET=<generate_new_jwt_secret>
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=<your_email>
SMTP_PASS=<your_app_password>
FROM_EMAIL=<your_email>
FROM_NAME=<your_name>
AI_ENGINE_URL=https://your-ai-engine-url.railway.app
```

#### **AI Engine Service**
```
OPENAI_API_KEY=<your_openai_key>
GOOGLE_API_KEY=<your_gemini_key>
SERP_API_KEY=<your_serpapi_key>
```

#### **Frontend Service**
```
NEXT_PUBLIC_API_URL=https://your-backend-url.railway.app
```

### Step 4: Update Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Update authorized redirect URIs:
   - `https://your-backend-url.railway.app/api/auth/google/callback`
   - `https://your-backend-url.railway.app/api/app-auth/google/callback`
3. Update authorized JavaScript origins:
   - `https://your-frontend-url.railway.app`

### Step 5: Deploy!

Railway will automatically deploy all services. Check the logs for any errors.

---

## Option 2: Deploy to Render

### Step 1: Set up MongoDB Atlas
(Same as Railway - see above)

### Step 2: Create Services on Render

1. Go to [Render](https://render.com/)
2. Create **3 Web Services**:

#### **Backend Service**
- **Name**: lead-generator-backend
- **Environment**: Docker
- **Dockerfile Path**: `server/Dockerfile`
- **Port**: 5000

#### **AI Engine Service**
- **Name**: lead-generator-ai-engine
- **Environment**: Docker
- **Dockerfile Path**: `ai_engine/Dockerfile`
- **Port**: 8000

#### **Frontend Service**
- **Name**: lead-generator-frontend
- **Environment**: Docker
- **Dockerfile Path**: `client/Dockerfile`
- **Port**: 3000

### Step 3: Configure Environment Variables
(Same as Railway - see above, but use Render URLs)

### Step 4: Update Google OAuth
(Same as Railway - see above, but use Render URLs)

---

## Post-Deployment Checklist

- [ ] Test Google OAuth login
- [ ] Test lead generation with a sample ICP
- [ ] Verify Settings page (API key encryption)
- [ ] Check Analytics dashboard
- [ ] Test email generation (if SMTP configured)
- [ ] Monitor logs for errors
- [ ] Set up custom domain (optional)

---

## Troubleshooting

### Issue: "Cannot connect to MongoDB"
**Solution**: Check MongoDB Atlas IP whitelist (should be 0.0.0.0/0)

### Issue: "Google OAuth redirect mismatch"
**Solution**: Verify redirect URIs in Google Cloud Console match your deployed URLs

### Issue: "AI Engine timeout"
**Solution**: Increase timeout in backend or check AI Engine logs

### Issue: "CORS errors"
**Solution**: Update `NEXT_PUBLIC_API_URL` in frontend environment variables

---

## Monitoring & Logs

### Railway
- View logs in Railway dashboard
- Set up log drains (optional)

### Render
- View logs in Render dashboard
- Set up alerts (optional)

---

## Scaling

### Railway
- Automatically scales based on traffic
- Upgrade plan for more resources

### Render
- Manually scale instances
- Upgrade plan for auto-scaling

---

## Cost Estimate

### Free Tier (Both Platforms)
- **Railway**: $5/month credit (enough for small usage)
- **Render**: Free tier available (with limitations)

### Paid Tier
- **Railway**: ~$10-20/month for 3 services
- **Render**: ~$15-25/month for 3 services
- **MongoDB Atlas**: Free tier (512MB) or $9/month (2GB)

---

## Security Notes

1. **Never commit `.env` files** ✅ (Already gitignored)
2. **Use strong encryption keys** (32+ characters)
3. **Rotate credentials regularly**
4. **Enable 2FA on all accounts**
5. **Monitor for suspicious activity**

---

## Next Steps

After deployment:
1. Test all features thoroughly
2. Set up monitoring/alerts
3. Configure custom domain
4. Enable SSL (automatic on Railway/Render)
5. Set up backups for MongoDB
