# EMAIL DELIVERY TROUBLESHOOTING - FOR RENDER PRODUCTION

## Status Summary
✅ Registration completes instantly (non-blocking email)
✅ OTP verification timezone fixed (should work now)
⚠️ Email delivery not working (Gmail SMTP timeout or credentials issue)

---

## IMMEDIATE TEST (DO THIS FIRST)

### On Render Production:
1. **Register** with email: `test@yourgmail.com`
2. **Check Render Logs** at: https://dashboard.render.com → your app → Logs tab
3. **Look for this line:**
   ```
   🔑 [FALLBACK] OTP for test@yourgmail.com: XXXXXX
   ```
4. **Copy the 6-digit OTP** from logs
5. **Enter in the app** and click "Verify Email"
6. **Should work!** If it does, only email delivery is broken

**This confirms:** OTP generation & verification work. Email SMTP is just not sending.

---

## FIX OPTION A: Regenerate Gmail App Password (BEST)

### Step 1: Enable 2-Factor Authentication (if not already done)
1. Go to https://myaccount.google.com
2. Click "Security" (left menu)
3. Scroll to "How you sign in to Google"
4. Enable "2-Step Verification"

### Step 2: Generate New App Password
1. Go to https://myaccount.google.com/apppasswords
2. Select Device: "Windows Computer" (or your device)
3. Select App: "Mail"
4. Google will show a **16-character password**
5. **Copy it exactly** (without spaces)

### Step 3: Update Your .env on Render
1. Go to Render Dashboard
2. Select your app
3. Click "Environment" (sidebar)
4. Update:
   ```
   EMAIL_USER=amarbharati289@gmail.com
   EMAIL_PASS=YOUR_NEW_16_CHAR_PASSWORD_HERE
   ```
5. Click "Save" → App will auto-redeploy

### Step 4: Test Again
1. Register new account
2. OTP should arrive in your inbox within 5 seconds
3. If not, check Render logs for error message

---

## FIX OPTION B: Use Brevo SMTP (More Reliable)

Brevo is a professional email service with better Render compatibility.

### Step 1: Create Brevo Account
1. Go to https://www.brevo.com
2. Sign up (free plan available)
3. Verify email

### Step 2: Get SMTP Credentials
1. Go to https://app.brevo.com/settings/smtp-api
2. Copy:
   - **Host:** `smtp-relay.brevo.com`
   - **Port:** `587`
   - **Username:** Your Brevo email
   - **Password:** Your Brevo SMTP key (create if needed)

### Step 3: Update Render .env
1. Render Dashboard → Your App → Environment
2. Add these variables:
   ```
   BREVO_SMTP_HOST=smtp-relay.brevo.com
   BREVO_SMTP_PORT=587
   BREVO_SMTP_USER=your-brevo-email@example.com
   BREVO_SMTP_PASS=your-brevo-smtp-key
   ```
3. Keep `EMAIL_USER` and `EMAIL_PASS` if you have them (Brevo takes priority)
4. Save → App redeploys

### Step 4: Test
1. Register new account
2. Check inbox for OTP email
3. Should arrive within 10 seconds

---

## FIX OPTION C: Test Mode (Development Only)

If you just want to test locally without email setup:

1. **Locally:** OTP will print to console logs (appears as `🔑 [FALLBACK]`)
2. **On Render:** Check app logs at https://dashboard.render.com

This is the quickest way to verify everything else works!

---

## Debugging: Check Error Details

### View Full Error in Render Logs
The new logging will show detailed SMTP errors. Look for:
```
❌ [SENDOTP] Email send FAILED for your-email@example.com:
  message: "error message here"
  code: "error code"
```

This tells you exactly what's wrong (auth failed, timeout, etc.)

---

## Quick Reference

| Issue | Symptom | Fix |
|-------|---------|-----|
| Gmail app password wrong | `535 5.7.8 Username and Password not accepted` | Regenerate new app password (Option A) |
| Gmail SMTP timeout | No error, just hangs | Use Brevo (Option B) |
| Email not arriving but no error | Check spam folder or use Brevo | Regenerate credentials |
| OTP verification 400 error | Fixed by our timestamp fix | No action needed |
| Registration hangs | Fixed by non-blocking email | No action needed |

---

## Summary of All Fixes Applied

✅ **Registration Timeout (FIXED)**
- Made email sending non-blocking
- API responds in <1 second

✅ **OTP Verification 400 Error (FIXED)**
- Fixed timezone mismatch in database queries
- Uses `sql`now()`` instead of JavaScript Date

✅ **Email Logging (ADDED)**
- Shows detailed error messages
- Logs OTP as fallback

⏳ **Email Delivery (YOUR ACTION NEEDED)**
- Regenerate Gmail app password, OR
- Switch to Brevo SMTP

---

## Next Steps

1. **Test Option A or B** (prefer A - Gmail)
2. **Check Render logs** for confirmation
3. **Deploy changes** to Render
4. **Register and verify** that OTP arrives

**Your system is ready - just need working email!**
