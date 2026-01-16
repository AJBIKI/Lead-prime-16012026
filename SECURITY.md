# Environment Configuration

## Required Environment Variables

Copy `.env.example` to `.env` and fill in your actual values:

```bash
cp server/.env.example server/.env
cp ai_engine/.env.example ai_engine/.env
```

### Backend (`server/.env`)

| Variable | Description | Required |
|----------|-------------|----------|
| `PORT` | Server port | Yes |
| `MONGODB_URI` | MongoDB connection string | Yes |
| `OPENAI_API_KEY` | OpenAI API key (fallback for users without keys) | Yes |
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID | Yes |
| `GOOGLE_CLIENT_SECRET` | Google OAuth Client Secret | Yes |
| `ENCRYPTION_KEY` | 32-character key for encrypting user API keys | Yes |
| `JWT_SECRET` | Secret for JWT token signing | Yes |
| `SMTP_USER` | Email address for sending emails | Optional |
| `SMTP_PASS` | SMTP app password | Optional |

### AI Engine (`ai_engine/.env`)

| Variable | Description | Required |
|----------|-------------|----------|
| `OPENAI_API_KEY` | OpenAI API key (fallback) | Yes |
| `GOOGLE_API_KEY` | Google Gemini API key (fallback) | Yes |
| `SERP_API_KEY` | SerpAPI key for web search | Yes |

## Security Best Practices

1. **Never commit `.env` files** - They are gitignored by default
2. **Rotate credentials regularly** - Especially after any potential exposure
3. **Use app-specific passwords** - For SMTP (Gmail), use app passwords, not your main password
4. **Generate strong keys** - Use `openssl rand -base64 32` for encryption keys
5. **Different keys per environment** - Use different credentials for dev/staging/production

## Generating Secure Keys

```bash
# Generate encryption key
node -e "console.log(require('crypto').randomBytes(32).toString('base64').slice(0, 32))"

# Generate JWT secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

## Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URIs:
   - `http://localhost:5000/api/auth/google/callback`
   - `http://localhost:5000/api/app-auth/google/callback`
6. Copy Client ID and Client Secret to `.env`

## SMTP Setup (Gmail)

1. Enable 2-Factor Authentication on your Google account
2. Go to [App Passwords](https://myaccount.google.com/apppasswords)
3. Generate a new app password for "Mail"
4. Use this 16-character password in `SMTP_PASS`
