# QUICK HELP - OTP EMAIL NOT WORKING

## Right Now - Get OTP Without Email ✅

### Step 1: Register
Go to: https://archanaa-patholog-part1-dd1v.onrender.com/
- Register with any email and password

### Step 2: Get OTP Code
Visit this URL (replace YOUR_EMAIL):
```
https://archanaa-patholog-part1-dd1v.onrender.com/api/auth/debug-otp?email=YOUR_EMAIL
```

You'll see:
```json
{
  "otp": "123456",
  "expiresAt": "2024-12-24T18:35:00Z"
}
```

### Step 3: Use OTP in App
- Copy the 6-digit code
- Paste in the verification screen
- Click "Verify Email"
- Done! ✅

---

## Why Email Isn't Working

- Gmail SMTP credentials might be wrong/expired
- Render doesn't like Gmail SMTP connections

## Fix It Permanently

### Option A: Use Brevo (Easiest - 5 minutes)

1. Sign up: https://www.brevo.com (free)
2. Get SMTP credentials from Settings → SMTP & API
3. Add to Render environment:
   ```
   BREVO_SMTP_HOST=smtp-relay.brevo.com
   BREVO_SMTP_PORT=587
   BREVO_SMTP_USER=your-brevo-email
   BREVO_SMTP_PASS=your-brevo-key
   ```
4. Click Save on Render Dashboard
5. Emails will arrive! 📧

### Option B: New Gmail App Password

1. Go to: https://myaccount.google.com/apppasswords
2. Generate new password (16 characters)
3. Update Render environment:
   ```
   EMAIL_USER=amarbharati289@gmail.com
   EMAIL_PASS=YOUR_NEW_PASSWORD
   ```
4. Click Save
5. Test registration

---

## Files to Read

- **IMMEDIATE_FIX_OTP_EMAIL.md** - Full debug guide
- **BREVO_SMTP_SETUP.md** - Complete Brevo setup
- **EMAIL_TROUBLESHOOTING_GUIDE.md** - Detailed troubleshooting

---

## Summary

✅ Your app is working  
✅ OTP verification code works  
⏳ Email delivery needs fixing (2 ways above)

**Use the debug endpoint to test right now, then fix email permanently.**
