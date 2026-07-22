# Database Setup Guide

## Private Schema Architecture

All tables are in the `app_private` schema, **NOT** the `public` schema. This is intentional:

- The `public` schema is automatically exposed via Supabase's REST API
- The `app_private` schema is NOT exposed, making tables invisible to the API
- Data is accessed ONLY through **RPC functions** (in public schema) and **edge functions** (service_role)

---

## Setup for Existing Installations (Migration)

If you already have tables in the `public` schema:


### Step 1: Run the Migration SQL

1. Open the **SQL Editor** in your Supabase dashboard
2. Open `docs/MIGRATE_TO_PRIVATE_SCHEMA.sql`
3. Copy ALL the content and paste into the SQL Editor
4. Click **Run**

This will:
- Create the `app_private` schema
- Move all tables from `public` to `app_private`
- Enable RLS on all tables
- Create restrictive `service_role_only` policies
- Create/update all RPC functions in the `public` schema
- Clean up old policies


### Step 2: Verify the Migration

```sql
-- Should show your tables in app_private
SELECT table_schema, table_name 
FROM information_schema.tables 
WHERE table_schema = 'app_private' AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- Should show NO data tables in public
SELECT table_schema, table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- Should show RPC functions
SELECT routine_name FROM information_schema.routines 
WHERE routine_schema = 'public' AND routine_name NOT LIKE 'pg_%'
ORDER BY routine_name;
```

After migration, ensure your deployed edge functions use `app_private`:

```typescript
// Correct schema configuration
const PRIVATE_SCHEMA = 'app_private'

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  db: { schema: PRIVATE_SCHEMA }
})
```




---

## Setup for Fresh Installations

### Step 1: Create Tables

1. Open `docs/CREATE_TABLES.sql`
2. Copy ALL content into the SQL Editor
3. Click **Run**

### Step 2: Seed Data

1. Open `docs/SEED_DATA.sql`
2. Copy ALL content into the SQL Editor
3. Click **Run**

---

## How Data Access Works

### RPC Functions (for frontend queries)

RPC functions are defined in the `public` schema so they're callable via the API. They use `SECURITY DEFINER` to access `app_private` tables:

```typescript
// Frontend code
const { data } = await supabase.rpc('get_platform_user_by_email', {
  p_email: 'owner@applegate.dev'
});
```

Available RPC functions:
- `get_platform_user_by_email(p_email)` - Look up user
- `get_platform_user_by_id(p_user_id)` - Look up user by ID
- `verify_platform_user_password(p_email, p_password_hash)` - Verify credentials
- `set_platform_user_password(p_email, p_password_hash)` - Set password
- `get_all_organizations()` - List all organizations
- `get_all_platform_users()` - List all platform users
- `get_org_workspaces(p_org_id)` - Get workspaces
- `get_org_users(p_org_id)` - Get organization users
- `get_dashboard_configs(p_user_id)` - Get dashboard layout
- `upsert_dashboard_config(p_config)` - Save dashboard layout
- `get_audit_logs(p_org_id, p_limit, p_offset)` - Query audit logs
- And more (see MIGRATE_TO_PRIVATE_SCHEMA.sql for full list)

### Edge Functions (for complex operations)

Edge functions use the `service_role` key which bypasses RLS:

```typescript
// Frontend code
const { data } = await supabase.functions.invoke('secure-auth', {
  body: { action: 'verify_password', email: '...', password: '...' }
});
```

### Direct `.from()` Calls (BLOCKED)

```typescript
// This will NOT work - table is not in public schema
const { data } = await supabase.from('platform_users').select('*');
// Error: relation "public.platform_users" does not exist
```

---

## Twilio Configuration

For SMS verification to work, configure Twilio in your Supabase Edge Functions.

### Step 1: Get Twilio Credentials

1. Log in to [Twilio Console](https://console.twilio.com/)
2. Note your **Account SID** and **Auth Token**
3. Get your Twilio phone number

### Step 2: Add Secrets to Supabase

In your Supabase project dashboard:

1. Go to **Project Settings** > **Edge Functions** > **Secrets**
2. Add:

| Secret Name | Value |
|-------------|-------|
| `TWILIO_ACCOUNT_SID` | Your Account SID (AC...) |
| `TWILIO_AUTH_TOKEN` | Your Auth Token |
| `TWILIO_PHONE_NUMBER` | Your Twilio phone number (+1...) |

---

## Troubleshooting

### "relation does not exist" error
- Tables are in `app_private`, not `public`
- Run the migration SQL if you haven't already
- Use RPC functions or edge functions to access data

### "User not found" error
- Check if the user exists: `SELECT * FROM app_private.platform_users WHERE email = '...'`
- Make sure RPC functions are created
- Check Edge Function logs

### Can't see tables in Table Editor
- Switch the schema dropdown from `public` to `app_private`

### Frontend queries return empty/errors
- `.from('table')` calls won't work (tables not in public schema)
- Use `supabase.rpc('function_name', { params })` instead
- Or use `supabase.functions.invoke('edge-function', { body })` for edge functions

### "PGRST106: The schema must be one of the following: public"
- This error means you're trying to access a non-exposed schema via the REST API
- Solution: Use RPC functions (they're in the public schema)
- Or use edge functions (they bypass the REST API entirely)

---

## Quick Reference: SQL Commands

### Check if schema exists
```sql
SELECT schema_name FROM information_schema.schemata WHERE schema_name = 'app_private';
```

### List all tables in app_private
```sql
SELECT table_name FROM information_schema.tables WHERE table_schema = 'app_private';
```

### Check RLS status
```sql
SELECT schemaname, tablename, rowsecurity FROM pg_tables WHERE schemaname = 'app_private';
```

### Test RPC function
```sql
SELECT public.get_platform_user_by_email('owner@applegate.dev');
```

### Check RPC functions
```sql
SELECT routine_name FROM information_schema.routines 
WHERE routine_schema = 'public' AND routine_name NOT LIKE 'pg_%';
```
