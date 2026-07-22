# SMS Verification Edge Function Documentation

## Overview

The `sms-verification` edge function provides secure SMS-based verification for the Platform Owner account using Twilio. It supports both login verification and password reset flows.

**IMPORTANT**: This edge function accesses the `app_private` schema using the `service_role` key. Tables are NOT in the `public` schema.

## Features

- **SMS Code Sending**: Sends 6-digit verification codes via Twilio
- **Code Verification**: Validates codes with attempt limiting
- **Password Reset**: Allows password reset after SMS verification
- **Rate Limiting**: Max 3 codes per 10 minutes per email
- **Duress Code**: Silent alert system (911911) for emergency situations
- **Audit Logging**: Logs security events and password resets

## Environment Variables Required

```
TWILIO_ACCOUNT_SID - Your Twilio Account SID
TWILIO_AUTH_TOKEN - Your Twilio Auth Token
TWILIO_PHONE_NUMBER - Your Twilio phone number (E.164 format, e.g., +15551234567)
SUPABASE_URL - Auto-provided by Supabase
SUPABASE_SERVICE_ROLE_KEY - Auto-provided by Supabase
```

## Schema Configuration

The edge function must use the `app_private` schema:

```typescript
const PRIVATE_SCHEMA = 'app_private'

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  db: { schema: PRIVATE_SCHEMA }
})
```

## Database Tables

### sms_verification_sessions (in app_private schema)
```sql
CREATE TABLE app_private.sms_verification_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  attempts INTEGER DEFAULT 0,
  verified BOOLEAN DEFAULT false,
  verified_at TIMESTAMPTZ,
  ip_address TEXT,
  purpose TEXT DEFAULT 'login',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## API Actions

### 1. Send Verification Code

**Action**: `send_code`

**Request Body**:
```json
{
  "action": "send_code",
  "email": "owner@applegate.dev",
  "phoneNumber": "+15551234567",
  "purpose": "password_reset"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Verification code sent",
  "sessionId": "uuid-session-id",
  "expiresAt": "2026-02-09T21:10:00.000Z",
  "maskedPhone": "****4567"
}
```

### 2. Verify Code

**Action**: `verify_code`

**Request Body**:
```json
{
  "action": "verify_code",
  "email": "owner@applegate.dev",
  "code": "123456",
  "sessionId": "uuid-session-id"
}
```

### 3. Reset Password with SMS

**Action**: `reset_password_with_sms`

**Request Body**:
```json
{
  "action": "reset_password_with_sms",
  "email": "owner@applegate.dev",
  "sessionId": "uuid-session-id",
  "newPassword": "newSecurePassword123"
}
```

## Usage in Frontend

```typescript
import { supabase } from '@/lib/supabase';

// Send verification code
const { data, error } = await supabase.functions.invoke('sms-verification', {
  body: {
    action: 'send_code',
    email: 'owner@applegate.dev',
    phoneNumber: '+15551234567',
    purpose: 'password_reset'
  }
});

// Verify code
const { data: verifyData } = await supabase.functions.invoke('sms-verification', {
  body: {
    action: 'verify_code',
    email: 'owner@applegate.dev',
    code: userEnteredCode,
    sessionId: data.sessionId
  }
});

// Reset password
const { data: resetData } = await supabase.functions.invoke('sms-verification', {
  body: {
    action: 'reset_password_with_sms',
    email: 'owner@applegate.dev',
    sessionId: data.sessionId,
    newPassword: 'newSecurePassword'
  }
});
```

## Security Features

### Rate Limiting
- Maximum 3 verification codes per email per 10 minutes
- Maximum 3 code verification attempts per session
- Sessions expire after 5 minutes

### Duress Code (911911)
If a user enters `911911` as their verification code:
- A CRITICAL security alert is logged to the audit_logs table
- The response appears successful to not alert an attacker
- The `_duress` flag is set in the response for internal handling

### Password Requirements
- Minimum 8 characters
- Session must be verified before password reset
- Password reset must occur within 10 minutes of verification

## Error Handling

| Error | Cause | Solution |
|-------|-------|----------|
| "SMS service not configured" | Missing Twilio credentials | Add TWILIO_* secrets |
| "Too many verification attempts" | Rate limit exceeded | Wait 10 minutes |
| "Invalid or expired session" | Session timeout or invalid | Request new code |
| "Maximum attempts exceeded" | 3 failed code entries | Request new code |
| "relation does not exist" | Tables not in app_private | Run MIGRATE_TO_PRIVATE_SCHEMA.sql |

## Troubleshooting

### "relation does not exist" Error
Tables need to be in the `app_private` schema. Run the migration:
1. Open `docs/MIGRATE_TO_PRIVATE_SCHEMA.sql`
2. Run in SQL Editor

### "To" and "From" Numbers Are the Same
See **[TWILIO_PHONE_NUMBER_SETUP.md](./TWILIO_PHONE_NUMBER_SETUP.md)** for detailed instructions.

### Trial Account Limitations
Twilio trial accounts can only send SMS to verified phone numbers. Either:
1. Verify recipient phone numbers in Twilio Console
2. Upgrade your Twilio account to production

## Related Documentation

- [TWILIO_PHONE_NUMBER_SETUP.md](./TWILIO_PHONE_NUMBER_SETUP.md) - Twilio phone number setup
- [DATABASE_SETUP.md](./DATABASE_SETUP.md) - Database configuration
- [SECURITY_HARDENING.md](./SECURITY_HARDENING.md) - Security architecture
- [MIGRATE_TO_PRIVATE_SCHEMA.sql](./MIGRATE_TO_PRIVATE_SCHEMA.sql) - Migration SQL
