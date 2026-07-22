# Twilio Phone Number Configuration Guide

## The Problem

The SMS verification edge function is failing because the `TWILIO_PHONE_NUMBER` environment variable is set to the same phone number as the user's personal phone number. Twilio rejects SMS messages where the "To" and "From" numbers are identical.

**Error Message:**
```
Twilio error: {"code": 21211, "message": "The 'To' number and 'From' number cannot be the same"}
```

## Solution Overview

You need to configure a **dedicated Twilio phone number** as the sender ("From" number) that is different from any user's personal phone number ("To" number).

---

## Step 1: Get a Twilio Phone Number

### If You Don't Have a Twilio Account:

1. Go to [https://www.twilio.com/try-twilio](https://www.twilio.com/try-twilio)
2. Sign up for a free trial account
3. Verify your email and personal phone number
4. Complete the account setup

### Get a Phone Number:

1. Log in to your Twilio Console at [https://console.twilio.com](https://console.twilio.com)
2. Navigate to **Phone Numbers** → **Manage** → **Buy a number**
   - Or go directly to: [https://console.twilio.com/us1/develop/phone-numbers/manage/search](https://console.twilio.com/us1/develop/phone-numbers/manage/search)
3. Search for a number with **SMS capability** (check the SMS column)
4. Select a number and click **Buy**
5. Confirm the purchase

### Note Your Twilio Credentials:

From the Twilio Console dashboard, note down:
- **Account SID**: Found on the main dashboard (starts with `AC`)
- **Auth Token**: Found on the main dashboard (click to reveal)
- **Phone Number**: The number you just purchased (in E.164 format, e.g., `+15551234567`)

---

## Step 2: Configure Supabase Edge Function Secrets

### IMPORTANT: Where to Find Secrets in Supabase

Secrets are **NOT** inside individual Edge Functions. They are configured at the **Project Settings** level.

### Exact Navigation Path:

1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Select your project
3. Click the **gear icon** (⚙️) in the left sidebar to open **Project Settings**
4. In the Settings menu, scroll down and click **Edge Functions**
5. You'll see a **Secrets** section with a list of your secrets

**Alternative Path:**
- Project Dashboard → Settings (gear icon) → Edge Functions → Secrets

### Visual Guide:

```
┌─────────────────────────────────────────────────────────────┐
│  Supabase Dashboard                                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Left Sidebar:                                              │
│  ┌─────────────────┐                                        │
│  │ 📊 Dashboard    │                                        │
│  │ 📁 Database     │                                        │
│  │ 🔐 Auth         │                                        │
│  │ 📦 Storage      │                                        │
│  │ ⚡ Edge Functions│  ← This shows your functions list     │
│  │ ...             │                                        │
│  │ ⚙️ Settings     │  ← CLICK HERE for Project Settings    │
│  └─────────────────┘                                        │
│                                                             │
│  Then in Settings:                                          │
│  ┌─────────────────┐                                        │
│  │ General         │                                        │
│  │ API             │                                        │
│  │ Database        │                                        │
│  │ Edge Functions  │  ← CLICK HERE to find Secrets         │
│  │ ...             │                                        │
│  └─────────────────┘                                        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Add or Update the TWILIO_PHONE_NUMBER Secret:

Once you're in **Project Settings → Edge Functions**:

1. Look for the **Secrets** section (it may say "Edge Function Secrets" or just "Secrets")
2. You'll see a list of existing secrets (names only, values are hidden)

**To Add a New Secret:**
1. Click **Add new secret** or the **+** button
2. Enter the name: `TWILIO_PHONE_NUMBER`
3. Enter the value: Your Twilio phone number (e.g., `+15551234567`)
   - **IMPORTANT**: This must be different from any user's personal phone number
   - Include the `+` and country code
4. Click **Save** or **Add**

**To Update an Existing Secret:**
1. Find `TWILIO_PHONE_NUMBER` in the list
2. Click the **Edit** button (pencil icon) or the secret name
3. Enter the new value
4. Click **Save**

**Note:** You cannot view existing secret values for security reasons. You can only overwrite them.

### Required Secrets for SMS Verification:

Make sure ALL THREE of these secrets are configured:

| Secret Name | Description | Example Value |
|-------------|-------------|---------------|
| `TWILIO_ACCOUNT_SID` | Your Twilio Account SID | `ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx` |
| `TWILIO_AUTH_TOKEN` | Your Twilio Auth Token | `xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx` |
| `TWILIO_PHONE_NUMBER` | Your Twilio Phone Number (the sender) | `+15551234567` |

---

## Step 3: Which Edge Function Uses These Secrets?

The secrets are used by the **`sms-verification`** edge function. 

You don't need to modify the edge function code itself - it automatically reads the secrets you configured in Project Settings.

The edge function code references secrets like this:
```typescript
const twilioPhoneNumber = Deno.env.get('TWILIO_PHONE_NUMBER');
```

When you set a secret in Project Settings → Edge Functions → Secrets, it becomes available to ALL your edge functions automatically.

---

## Step 4: Verify the Configuration

### Test via the Database Test Page:

1. Navigate to your app's `/db-test` page
2. Scroll down to the "Edge Function Tests" section
3. Click **Test SMS Verification Function**
4. Enter a phone number that is **different** from your Twilio phone number
5. The test should now succeed

### Expected Success Response:

```json
{
  "success": true,
  "message": "Verification code sent",
  "sessionId": "uuid-session-id",
  "expiresAt": "2026-02-03T03:10:00.000Z",
  "maskedPhone": "****4567"
}
```

### Common Errors and Solutions:

| Error | Cause | Solution |
|-------|-------|----------|
| `The 'To' number and 'From' number cannot be the same` | TWILIO_PHONE_NUMBER is same as user's phone | Use a different Twilio phone number |
| `Invalid API key` | TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN is wrong | Verify credentials in Twilio Console |
| `The number +1234567890 is unverified` | Trial account limitation | Verify the recipient number in Twilio or upgrade account |
| `SMS service not configured` | Missing Twilio secrets | Add all three TWILIO_* secrets |

---

## Step 5: Trial Account Limitations

If you're using a **Twilio trial account**, you can only send SMS to verified phone numbers.

### To Verify a Phone Number:

1. Go to Twilio Console → **Phone Numbers** → **Verified Caller IDs**
   - Or: [https://console.twilio.com/us1/develop/phone-numbers/manage/verified](https://console.twilio.com/us1/develop/phone-numbers/manage/verified)
2. Click **Add a new Caller ID**
3. Enter the phone number you want to send SMS to
4. Verify via call or SMS
5. The number can now receive SMS from your trial account

### Upgrade to Production:

To send SMS to any phone number without verification:
1. Go to Twilio Console → **Billing** → **Upgrade**
2. Add a payment method
3. Your account will be upgraded and restrictions removed

---

## Configuration Checklist

- [ ] Twilio account created and verified
- [ ] Twilio phone number purchased with SMS capability
- [ ] `TWILIO_ACCOUNT_SID` secret set in Supabase (Project Settings → Edge Functions → Secrets)
- [ ] `TWILIO_AUTH_TOKEN` secret set in Supabase (Project Settings → Edge Functions → Secrets)
- [ ] `TWILIO_PHONE_NUMBER` secret set in Supabase (Project Settings → Edge Functions → Secrets)
- [ ] TWILIO_PHONE_NUMBER is different from user phone numbers
- [ ] (Trial only) Recipient phone numbers verified in Twilio

---

## Quick Reference: Supabase Secret Configuration

### Via Supabase Dashboard (Recommended):

```
Supabase Dashboard 
  → Click ⚙️ Settings (gear icon in left sidebar)
  → Edge Functions 
  → Secrets section
  → Add new secret / Edit existing
```

### Via Supabase CLI:

```bash
# Set a secret
supabase secrets set TWILIO_PHONE_NUMBER=+15551234567

# List all secrets (names only)
supabase secrets list

# Unset a secret
supabase secrets unset TWILIO_PHONE_NUMBER
```

---

## Example: Correct Configuration

**Twilio Phone Number (From):** `+15559876543` (your purchased Twilio number - set as TWILIO_PHONE_NUMBER secret)

**User's Phone Number (To):** `+15551234567` (user's personal phone - entered in the app)

These are **different numbers**, so Twilio will accept the SMS request.

---

## Summary: Quick Steps

1. **Buy a Twilio number** at https://console.twilio.com (must have SMS capability)
2. **Open Supabase Dashboard** → Click **⚙️ Settings** (gear icon)
3. **Click Edge Functions** in the settings menu
4. **Find the Secrets section** and add/update `TWILIO_PHONE_NUMBER` with your Twilio number
5. **Test** at your app's `/db-test` page

---

## Need Help?

- **Twilio Documentation**: [https://www.twilio.com/docs/sms](https://www.twilio.com/docs/sms)
- **Supabase Edge Functions**: [https://supabase.com/docs/guides/functions](https://supabase.com/docs/guides/functions)
- **E.164 Phone Format**: [https://www.twilio.com/docs/glossary/what-e164](https://www.twilio.com/docs/glossary/what-e164)
