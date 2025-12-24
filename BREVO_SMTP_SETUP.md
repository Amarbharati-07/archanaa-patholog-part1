# ⚡ BREVO SMTP SETUP - WORKS PERFECTLY ON RENDER

Gmail SMTP not working? Use Brevo instead. 100% free and more reliable on Render.

## Step 1: Sign Up (2 minutes)
1. Go to https://www.brevo.com
2. Click "Sign Up For Free"
3. Fill in details
4. Verify email

## Step 2: Get SMTP Credentials (3 minutes)
1. Login to Brevo dashboard
2. Go to **SMTP & API** section (Sidebar → Tools → SMTP & API)
3. You'll see:
   ```
   SMTP Server: smtp-relay.brevo.com
   SMTP Port: 587
   Login: YOUR_BREVO_EMAIL_ADDRESS
   Password: YOUR_SMTP_KEY (shown in dashboard)
   ```
4. Copy these exactly

## Step 3: Update Render Environment Variables (3 minutes)

### Via Render Dashboard:
1. Go to https://dashboard.render.com
2. Select your Archana app
3. Click **Environment** (sidebar)
4. Add/Update these variables:
   ```
   BREVO_SMTP_HOST=smtp-relay.brevo.com
   BREVO_SMTP_PORT=587
   BREVO_SMTP_USER=your-brevo-email@example.com
   BREVO_SMTP_PASS=your-brevo-smtp-key-here
   ```
5. Click **Save** → App auto-redeploys

## Step 4: Test (2 minutes)
1. Go to your app: https://archanaa-patholog-part1-tekf.onrender.com
2. Register with email: `test@gmail.com`
3. **OTP should arrive in inbox within 10 seconds**
4. If it arrives → You're done! ✅
5. If not → Check Render logs for error

---

## What The App Now Does:

The app checks for Brevo first:
```typescript
if (BREVO_SMTP_HOST && BREVO_SMTP_USER && BREVO_SMTP_PASS) {
  // Use Brevo
} else {
  // Fall back to Gmail
}
```

So Brevo takes priority if configured.

---

## If Email Still Doesn't Work

### Check Logs:
1. Render Dashboard → Your App → Logs tab
2. Look for one of these:
   ```
   ✅ [SENDOTP] Email sent successfully
   ❌ [SENDOTP] Email send FAILED
   🔑 [FALLBACK] OTP for email: XXXXXX
   ```

### Troubleshooting:
- **"FALLBACK"** appears → Email failed (check credentials)
- **"Successfully"** appears → Email sent (check spam folder)
- No message → OTP endpoint working, check browser console

---

## Debug Endpoint (TEMPORARY)

While email isn't working, get OTP directly:
```
GET https://archanaa-patholog-part1-tekf.onrender.com/api/auth/debug-otp?email=youremail@gmail.com
```

Returns:
```json
{
  "otp": "123456",
  "expiresAt": "2024-12-24T18:30:00Z"
}
```

Use this OTP code in the app verification screen.

---

## Cost
- **Free Tier:** Up to 300 emails/day (enough for testing & development)
- **Upgrade:** Only if you need more than 300/day

---

## Summary
1. ✅ Sign up on Brevo (free)
2. ✅ Copy SMTP credentials
3. ✅ Add to Render environment variables
4. ✅ Save → Auto-redeploy
5. ✅ Test registration
6. ✅ Done!

---

## Temporary Solution (For Right Now)

Use the debug endpoint while you set up Brevo:
```
1. Register at: https://archanaa-patholog-part1-tekf.onrender.com
2. After registering, get OTP from:
   https://archanaa-patholog-part1-tekf.onrender.com/api/auth/debug-otp?email=youremail@gmail.com
3. Copy the OTP value
4. Paste in the app verification screen
5. Click Verify
6. You're in! ✅
```

Then set up Brevo for permanent fix.

---

## Questions?
- Brevo docs: https://www.brevo.com/help/
- Still stuck? Check Render logs or try a different email address
