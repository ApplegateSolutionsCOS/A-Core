# Secure Auth Edge Function

This is the updated `secure-auth` edge function that uses the `app_private` schema for all database operations.

## Deploy Instructions

1. In your Supabase project, go to **Edge Functions**
2. Find the `secure-auth` function (or create it if it doesn't exist)
3. Replace the code with the following:

```typescript
// supabase/functions/secure-auth/index.ts

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import * as bcrypt from 'https://deno.land/x/bcrypt@v0.4.1/mod.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Private schema - NOT exposed via REST API
const PRIVATE_SCHEMA = 'app_private'

interface AuthRequest {
  action: 'verify_password' | 'set_password' | 'hash_password' | 'get_user'
  email?: string
  password?: string
  userId?: string
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    // Create client with private schema (service_role bypasses RLS)
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      db: { schema: PRIVATE_SCHEMA }
    })
    
    // Also create a public schema client for RPC calls (fallback)
    const supabasePublic = createClient(supabaseUrl, supabaseServiceKey)
    
    const { action, email, password, userId } = await req.json() as AuthRequest

    console.log(`[secure-auth] Action: ${action}, Email: ${email || 'N/A'}`)

    // ============================================
    // GET USER BY EMAIL
    // ============================================
    if (action === 'get_user') {
      if (!email) {
        return new Response(
          JSON.stringify({ success: false, error: 'Email required' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
      }

      // Direct query using service_role (bypasses RLS, accesses app_private)
      const { data: user, error: userError } = await supabase
        .from('platform_users')
        .select('id, email, full_name, role, department, is_owner, phone_number, avatar_url, status, email_verified, created_at, updated_at')
        .eq('email', email.toLowerCase())
        .single()

      if (userError || !user) {
        // Fallback: Try RPC function
        try {
          const { data: rpcResult, error: rpcError } = await supabasePublic.rpc('get_platform_user_by_email', {
            p_email: email.toLowerCase()
          })
          
          if (rpcResult && !rpcError) {
            if (rpcResult.password_hash) delete rpcResult.password_hash
            return new Response(
              JSON.stringify({ success: true, user: rpcResult }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          }
        } catch (rpcErr) {
          console.log('[secure-auth] RPC fallback also failed')
        }

        return new Response(
          JSON.stringify({ success: false, error: 'User not found' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({ success: true, user }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ============================================
    // VERIFY PASSWORD
    // ============================================
    if (action === 'verify_password') {
      if (!email || !password) {
        return new Response(
          JSON.stringify({ success: false, error: 'Email and password required' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
      }

      // Direct query using service_role
      const { data: user, error: userError } = await supabase
        .from('platform_users')
        .select('*')
        .eq('email', email.toLowerCase())
        .single()

      if (userError || !user) {
        return new Response(
          JSON.stringify({ success: false, error: 'User not found' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      if (!user.password_hash) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Password not set',
            requiresPasswordSetup: true 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Verify password
      const isValid = await bcrypt.compare(password, user.password_hash)
      
      if (!isValid) {
        return new Response(
          JSON.stringify({ success: false, error: 'Invalid password' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Remove sensitive data before returning
      delete user.password_hash
      delete user.totp_secret

      return new Response(
        JSON.stringify({ success: true, user }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ============================================
    // SET PASSWORD
    // ============================================
    if (action === 'set_password') {
      if (!email || !password) {
        return new Response(
          JSON.stringify({ success: false, error: 'Email and password required' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
      }

      // Validate password strength
      if (password.length < 8) {
        return new Response(
          JSON.stringify({ success: false, error: 'Password must be at least 8 characters' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
      }

      // Hash the password
      const salt = await bcrypt.genSalt(12)
      const passwordHash = await bcrypt.hash(password, salt)

      console.log('[secure-auth] Setting password for:', email)

      // Direct update using service_role
      const { data: updatedUser, error: updateError } = await supabase
        .from('platform_users')
        .update({ 
          password_hash: passwordHash,
          updated_at: new Date().toISOString()
        })
        .eq('email', email.toLowerCase())
        .select('id, email, full_name, role, department, is_owner, phone_number, avatar_url, status, created_at, updated_at')
        .single()

      if (updateError) {
        console.error('[secure-auth] Update error:', updateError)
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to set password: ' + updateError.message }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        )
      }

      if (!updatedUser) {
        return new Response(
          JSON.stringify({ success: false, error: 'User not found' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
        )
      }

      return new Response(
        JSON.stringify({ success: true, user: updatedUser }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ============================================
    // HASH PASSWORD (utility)
    // ============================================
    if (action === 'hash_password') {
      if (!password) {
        return new Response(
          JSON.stringify({ success: false, error: 'Password required' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
      }

      const salt = await bcrypt.genSalt(12)
      const hash = await bcrypt.hash(password, salt)

      return new Response(
        JSON.stringify({ success: true, hash }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ success: false, error: 'Invalid action' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )

  } catch (error) {
    console.error('[secure-auth] Error:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message || 'Internal server error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
```

## Required: Run the Migration SQL First!

Before deploying this edge function, you **MUST** run the migration to move tables to `app_private`:

1. Open `docs/MIGRATE_TO_PRIVATE_SCHEMA.sql`
2. Copy ALL the content
3. Paste into the Supabase SQL Editor
4. Click "Run"

This creates the `app_private` schema, moves all tables there, and creates the RPC functions.

## How It Works

1. The edge function creates a Supabase client with `schema: 'app_private'`
2. Since it uses the `service_role` key, it bypasses RLS
3. Since it specifies the `app_private` schema, it can access the tables directly
4. The frontend's `anon` key CANNOT access `app_private` tables

## Deployment Steps

### Option 1: Via Supabase Dashboard
1. Go to your Supabase project
2. Navigate to **Edge Functions**
3. Click on `secure-auth` (or create new if it doesn't exist)
4. Paste the code above
5. Click **Deploy**

### Option 2: Via Supabase CLI
```bash
npm install -g supabase
supabase login
supabase link --project-ref YOUR_PROJECT_REF
mkdir -p supabase/functions/secure-auth
# Paste the code into supabase/functions/secure-auth/index.ts
supabase functions deploy secure-auth
```

## Testing

### 1. Test getting a user:
```bash
curl -X POST 'https://YOUR_PROJECT.supabase.co/functions/v1/secure-auth' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -d '{"action": "get_user", "email": "owner@applegate.dev"}'
```

### 2. Test password verification:
```bash
curl -X POST 'https://YOUR_PROJECT.supabase.co/functions/v1/secure-auth' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -d '{"action": "verify_password", "email": "owner@applegate.dev", "password": "yourpassword"}'
```

## Troubleshooting

### "User not found" Error
1. Make sure you ran the migration SQL
2. Verify tables exist in `app_private` schema (check Table Editor, switch schema dropdown)
3. Check Edge Function logs for detailed errors

### "relation does not exist" Error
1. The `app_private` schema doesn't exist yet - run the migration SQL
2. Or the edge function's schema config is wrong

### Check Edge Function Logs
1. Go to Supabase Dashboard
2. Navigate to **Edge Functions** > **secure-auth**
3. Click on **Logs** to see detailed error messages
