# Production Deployment Guide - Archana Pathology Lab

## Critical Fixes Applied

### 1. **Email OTP Delivery Fixed**
- **Issue**: Register endpoint was NOT sending OTP emails
- **Fix**: Modified `/api/auth/register` to call `sendOtpEmail()` asynchronously
- **Impact**: Emails now sent non-blocking (response in <300ms)

### 2. **Email Service Configuration**
- **Added Support for Brevo SMTP** (recommended for production)
- **Fallback to Gmail** if Brevo not configured
- **Non-blocking async email** sending prevents timeout issues

### 3. **Service Worker Fixed**
- Already configured with **network-first strategy for API calls**
- No caching of `/api/*` requests
- Prevents stale authentication tokens

## Environment Variables for Render

Set these on Render dashboard under Environment:

```
# Database (PostgreSQL)
DATABASE_URL=postgresql://user:password@host:port/archana_pathology

# Email - BREVO (Recommended for production reliability)
BREVO_SMTP_HOST=smtp-relay.brevo.com
BREVO_SMTP_PORT=587
BREVO_SMTP_SECURE=false
BREVO_SMTP_USER=your_brevo_email@example.com
BREVO_SMTP_PASS=your_brevo_api_key

# Alternative: Gmail (if Brevo not available)
EMAIL_USER=your_gmail@gmail.com
EMAIL_PASS=your_gmail_app_password

# Authentication
SESSION_SECRET=your-secure-random-key-min-32-characters
JWT_SECRET=your-jwt-secret-min-32-characters

# Firebase (for phone auth)
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY=your-private-key
FIREBASE_CLIENT_EMAIL=your-service-account-email

# Payment (Razorpay)
RAZORPAY_KEY_ID=rzp_live_xxxxx
RAZORPAY_KEY_SECRET=xxxxx

# Application
NODE_ENV=production
PORT=5000
FRONTEND_URL=https://archanapathalogy.in
API_URL=https://archanapathalogy.in/api
```

## Deployment Steps for Render

### Step 1: Setup PostgreSQL Database
1. Create PostgreSQL on Render.com
2. Get connection string
3. Set `DATABASE_URL` environment variable

### Step 2: Configure Email Service (Choose One)

#### Option A: Brevo (Recommended - 300 emails/day free)
1. Sign up at brevo.com
2. Go to SMTP settings
3. Copy SMTP credentials
4. Set `BREVO_SMTP_*` variables on Render

#### Option B: Gmail
1. Enable 2FA on Gmail account
2. Generate app password (16 characters)
3. Set `EMAIL_USER` and `EMAIL_PASS`

### Step 3: Set Environment Variables
1. Go to Render > Service > Environment
2. Add all variables from section above
3. **Important**: Do NOT use `cross-env` in Render. Use pure Node.js

### Step 4: Verify Build Configuration
- Build Command: `npm run build`
- Start Command: `node ./dist/index.cjs`
- **NOT**: `cross-env NODE_ENV=production node ...`

### Step 5: Test Deployment
1. Deploy on Render
2. Visit https://archanapathalogy.in/register
3. Complete registration - OTP should arrive in <2 seconds
4. Check server logs for email confirmation

## Authentication Flow

### Registration (OTP via Email)
```
POST /api/auth/register
{
  "name": "John Doe",
  "phone": "+919876543210",
  "email": "john@example.com",
  "gender": "male",
  "dob": "1990-01-15"
}

Response (FAST - <300ms):
{
  "message": "Registration successful. OTP sent to your email.",
  "patientId": "PAT001234"
}

// Email sent asynchronously in background
```

### Verify OTP
```
POST /api/auth/verify-otp
{
  "contact": "+919876543210",
  "otp": "123456",
  "purpose": "register"
}

Response:
{
  "patient": { /* patient object */ },
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

### Login (Email + Password)
```
POST /api/auth/login-email
{
  "email": "john@example.com",
  "password": "securepassword"
}

Response:
{
  "patient": { /* patient object */ },
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

## Error Codes & Solutions

| Error | Cause | Solution |
|-------|-------|----------|
| 401 Unauthorized | Invalid/expired JWT token | Ask user to login again |
| 403 Forbidden | Admin access required | Use admin account |
| 502 Bad Gateway | Server crash or timeout | Check logs, increase timeout |
| 500 Server Error | Database/email failure | Check env variables, logs |
| Email not delivered | SMTP misconfigured | Verify BREVO_SMTP_* variables |

## Performance Checklist

- [ ] Registration responds in <300ms
- [ ] OTP email arrives in <2 seconds
- [ ] Login responds in <500ms
- [ ] Report download doesn't timeout
- [ ] Database queries use proper indexes

## Security Checklist

- [ ] JWT_SECRET is strong (32+ chars, random)
- [ ] SESSION_SECRET is strong
- [ ] HTTPS enabled on custom domain
- [ ] Email credentials not in code (use env vars)
- [ ] FIREBASE_PRIVATE_KEY not exposed
- [ ] Database backups enabled on Render

## Monitoring

### Check Application Logs
```bash
# On Render dashboard
Logs > View logs
```

### Monitor Email Delivery
1. Check transporter logs in application
2. Monitor BREVO dashboard for bounce rates
3. Set up error alerts

### Database Health
1. Monitor connection pool on Render
2. Check slow queries
3. Set up backup schedule

## Rollback Procedure

If deployment has issues:
1. Go to Render > Deployments
2. Click "Deploy" on previous stable version
3. Environment variables will be preserved

## Support

For issues:
1. Check application logs first
2. Verify all environment variables are set
3. Test locally with same env vars
4. Contact Render support for infrastructure issues
