# Archana Pathology Lab - Production Deployment Guide

## 🔧 Critical Changes Made

### ✅ FIXED: Environment Variable Management
1. **Removed `.env.example`** - Single source of truth is runtime `.env`
2. **Added validation** - Backend fails fast if required variables missing
3. **Added logging** - Startup clearly shows which variables are loaded
4. **No more hardcoded credentials** - All values from `process.env`

### ✅ FIXED: OTP Email System
1. **Non-blocking email** - Registration API responds instantly (< 100ms)
2. **30-second timeout** - Email sending won't hang the entire app
3. **Fire-and-forget** - OTP emails send async in background via `setImmediate()`
4. **Fallback logging** - Development mode logs OTP for testing

### ✅ FIXED: Backend Startup
1. **Validates required env vars** - `DATABASE_URL`, `SESSION_SECRET`, `JWT_SECRET`
2. **Clear error messages** - Shows exactly which variables are missing
3. **Environment logging** - Displays configuration status on startup

## 📋 Environment Variables Required

### Critical (Required for Startup)
```
DATABASE_URL          # PostgreSQL connection string
SESSION_SECRET        # Min 32 random characters
JWT_SECRET            # Min 32 random characters
```

### Email Configuration (Choose ONE)

**Option A: Brevo SMTP (Recommended)**
```
BREVO_SMTP_HOST       # smtp-relay.brevo.com
BREVO_SMTP_PORT       # 587
BREVO_SMTP_USER       # your-brevo-email@example.com
BREVO_SMTP_PASS       # your-brevo-api-key
```

**Option B: Gmail**
```
EMAIL_USER            # your-email@gmail.com
EMAIL_PASS            # app-specific password (NOT Gmail password)
```

### Optional (for Payments)
```
RAZORPAY_KEY_ID       # Leave empty to disable payments
RAZORPAY_KEY_SECRET
```

### Production URLs
```
FRONTEND_URL          # e.g., https://archanapathalogy.com
API_URL               # e.g., https://archanapathalogy.com/api
```

### Application
```
NODE_ENV              # "production" or "development"
PORT                  # 5000 (default)
```

## 🚀 Deployment Instructions

### 1. Set Environment Variables
In your hosting platform (Render, Replit, etc.):
- Add all required variables from above
- Use Brevo SMTP for production (more reliable than Gmail)
- Keep SESSION_SECRET and JWT_SECRET as secrets

### 2. Verify Startup
```bash
npm run dev  # or npm start for production
```

You should see:
```
✅ Environment Variables Loaded:
   DATABASE_URL: postgresql://...
   NODE_ENV: production
   EMAIL_USER: ✅ Configured
   BREVO_SMTP: ✅ Configured
   RAZORPAY: ✅ Configured
✅ Database tables ensured
Seeding database...
[express] Server running at http://localhost:5000
```

### 3. Test Registration Flow
```bash
curl -X POST http://localhost:5000/api/auth/request-otp \
  -H "Content-Type: application/json" \
  -d '{"contact":"user@example.com","purpose":"email_verification"}'
```

Expected: Instant response (~50ms), email sent in background

### 4. Deploy to Production

**Option 1: Render**
- Deploy from GitHub
- Add environment variables in Render dashboard
- Uses `npm run build && npm start` from deploy config

**Option 2: Replit**
- Already configured in replit.md
- Deploy using Replit's built-in publish feature

**Option 3: Other Platforms**
- Use `npm run build` to compile TypeScript
- Run `npm start` to launch
- Ensure `NODE_ENV=production`

## 🔐 Security Best Practices

1. **Never commit .env** - Already in .gitignore
2. **Never use .env.example with real values** - Removed from project
3. **Use environment-specific secrets** - Each platform (dev/prod) has separate values
4. **Rotate RAZORPAY secrets** - If compromised, regenerate immediately
5. **Firebase service account** - Keep private, never share JSON

## 📊 What Was Wrong & How It's Fixed

### Issue 1: .env.example in Production
**Problem:** .env.example had template values that got mixed up with real values  
**Fix:** Completely removed .env.example, only .env used at runtime

### Issue 2: Registration API Hanging
**Problem:** API waited for email to send (5-30 seconds delay)  
**Fix:** Email now sends async, API returns immediately with 200 OK

### Issue 3: Silent Failures
**Problem:** Missing env vars went unnoticed until runtime errors  
**Fix:** Backend validates all required vars on startup, fails with clear error

### Issue 4: Unclear Email Configuration
**Problem:** Multiple email systems (Brevo/Gmail) without clear priority  
**Fix:** Brevo takes priority if configured, Gmail as fallback, dev mode logs OTP

### Issue 5: Production CORS Issues
**Problem:** Frontend couldn't reach API on custom domain  
**Fix:** Added `FRONTEND_URL` and `API_URL` env vars for production

## ✅ Testing Checklist

- [ ] All environment variables set
- [ ] Backend starts without errors
- [ ] OTP requests return instantly
- [ ] Emails arrive (or log in console for dev mode)
- [ ] Registration endpoint accessible
- [ ] Login accepts valid credentials
- [ ] JWT tokens work correctly
- [ ] Database tables created successfully
- [ ] No 401/403/500 errors on production domain

## 🎯 Next Steps

1. Set the required environment variables
2. Restart the application
3. Monitor startup logs for configuration status
4. Test registration flow
5. Verify emails deliver (check spam folder too)

## 📞 Support

If you encounter issues:
1. Check startup logs for missing environment variables
2. Verify email service is correctly configured
3. Ensure DATABASE_URL has proper credentials
4. Check CORS settings if frontend can't reach API
