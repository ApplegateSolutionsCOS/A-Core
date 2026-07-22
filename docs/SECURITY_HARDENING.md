# Security Hardening - Private Schema Architecture

## Summary of Changes (February 9, 2026)

### CRITICAL CHANGE: Moved from `public` to `app_private` Schema

All database tables have been moved from the `public` schema to the `app_private` schema. This is the **most important security change** because:

- The `public` schema is **automatically exposed** via Supabase's PostgREST REST API
- The `app_private` schema is **NOT exposed** via the REST API
- This means tables are completely **invisible** to anyone with just the anon key
- Even if RLS policies had bugs, the tables can't be reached via the API

### Why "public" Was a Problem

In Supabase, the `public` schema is special:
- It's exposed via the auto-generated REST API at `/rest/v1/`
- Anyone with the `anon` key can attempt to query tables in `public`
- RLS policies are the **only** defense when tables are in `public`
- A single misconfigured RLS policy = data breach

With `app_private`:
- Tables are NOT in the REST API at all
- Even without RLS, the anon key can't reach the tables
- RLS is still enabled as defense-in-depth
- Data can only be accessed through edge functions or RPC functions

---

## Architecture: How Data Access Works

```
Frontend (React App)
    │
    ├─ supabase.rpc('function_name', { params })
    │   │
    │   └─ RPC Function (public schema, SECURITY DEFINER)
    │       │
    │       └─ Accesses app_private.tables → Returns data
    │
    ├─ supabase.functions.invoke('edge-function', { body })
    │   │
    │   └─ Edge Function (Deno, service_role key)
    │       │
    │       └─ Accesses app_private.tables → Returns data
    │
    └─ supabase.from('table').select()
        │
        └─ BLOCKED: Table not in public schema = 404 Not Found
           (Table doesn't exist in the API)
```

### Two Ways to Access Data

1. **RPC Functions** (recommended for simple queries)
   - Defined in `public` schema (so they're callable via API)
   - Use `SECURITY DEFINER` to run as the function creator (postgres)
   - Can access `app_private` tables
   - Called via `supabase.rpc('function_name', { params })`

2. **Edge Functions** (recommended for complex operations)
   - Run on Deno with the `service_role` key
   - Can access any schema directly
   - Handle business logic, password hashing, SMS, etc.
   - Called via `supabase.functions.invoke('function-name', { body })`

---

## Security Layers (Defense in Depth)

### Layer 1: Schema Isolation
- All data tables in `app_private` schema
- `app_private` is NOT exposed via PostgREST API
- `anon` and `authenticated` roles have NO GRANT on `app_private`
- Only `service_role` and `postgres` have USAGE on `app_private`

### Layer 2: Row Level Security (RLS)
- RLS is ENABLED on every table in `app_private`
- Every table has a `service_role_only` policy
- Even if someone somehow reaches the tables, RLS blocks them

### Layer 3: RPC Function Security
- RPC functions use `SECURITY DEFINER` (runs as postgres)
- Functions validate inputs before querying
- Functions return only necessary fields (no password hashes)
- Functions are the ONLY way to access data via the API

### Layer 4: Edge Function Security
- Edge functions validate session tokens
- Edge functions use service_role key (bypasses RLS)
- Edge functions handle sensitive operations (auth, SMS)

---

## Tables in `app_private` Schema

| Table | Description | RLS |
|-------|-------------|-----|
| `organizations` | Customer organizations | Enabled |
| `platform_users` | Internal BOS staff | Enabled |
| `organization_users` | Customer staff | Enabled |
| `workspaces` | Organization workspaces | Enabled |
| `workspace_access` | User-workspace permissions | Enabled |
| `mini_apps` | Custom mini applications | Enabled |
| `mini_app_records` | Mini app data records | Enabled |
| `audit_logs` | Security audit trail | Enabled |
| `invitations` | User invitations | Enabled |
| `messages` | Internal messages | Enabled |
| `tasks` | Task management | Enabled |
| `calendar_events` | Calendar events | Enabled |
| `activity_stream` | Activity feed | Enabled |
| `user_sessions` | Auth sessions | Enabled |
| `verification_codes` | Email/SMS codes | Enabled |
| `sms_verification_sessions` | SMS verification | Enabled |
| `dashboard_configs` | Dashboard layouts | Enabled |

---

## RPC Functions in `public` Schema

These are the ONLY database objects exposed via the API:

| Function | Purpose |
|----------|---------|
| `get_platform_user_by_email(email)` | Look up platform user |
| `get_platform_user_by_id(user_id)` | Look up platform user by ID |
| `verify_platform_user_password(email, hash)` | Verify login credentials |
| `set_platform_user_password(email, hash)` | Set/reset password |
| `verify_platform_user_email(email)` | Mark email as verified |
| `get_org_user_by_email(email)` | Look up organization user |
| `get_org_workspaces(org_id)` | Get workspaces for an org |
| `get_all_organizations()` | List all orgs (admin) |
| `get_all_platform_users()` | List all platform users (admin) |
| `get_dashboard_configs(user_id)` | Get dashboard layout |
| `upsert_dashboard_config(config)` | Save dashboard layout |
| `insert_audit_log(log)` | Record audit event |
| `get_audit_logs(org_id, limit, offset)` | Query audit logs |
| `get_org_users(org_id)` | List org users |
| `insert_org_user(user)` | Add org user |
| `delete_org_user(user_id)` | Remove org user |
| `toggle_workspace_visibility(workspace_id)` | Toggle workspace |
| `insert_platform_user(user)` | Add platform user |
| `update_platform_user_totp(user_id, secret, enabled)` | Update TOTP |
| `get_platform_user_password_hash(email)` | Get hash for verification |

---

## Migration Instructions

### For Existing Installations

Run the migration SQL in the Supabase SQL Editor:

1. Open `docs/MIGRATE_TO_PRIVATE_SCHEMA.sql`
2. Copy the entire contents
3. Paste into the SQL Editor
4. Click "Run"
5. Verify the output shows tables moved to `app_private`

### For Fresh Installations

1. Run `docs/CREATE_TABLES.sql` (creates tables in `app_private`)
2. Run `docs/SEED_DATA.sql` (seeds data in `app_private`)

### After Migration

1. Go to **Table Editor** in Supabase Dashboard
2. Select the schema dropdown
3. Choose `app_private` to see your tables
4. The `public` schema should have NO data tables (only functions)

---

## Verifying Security

### Check tables are in the right schema
```sql
-- Should return your tables
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'app_private' ORDER BY table_name;

-- Should return NO data tables (only system tables)
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_type = 'BASE TABLE' ORDER BY table_name;
```

### Check RLS is enabled
```sql
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'app_private';
```

### Check RPC functions exist
```sql
SELECT routine_name FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name NOT LIKE 'pg_%'
ORDER BY routine_name;
```

### Test that anon key can't access tables
```sql
-- This should fail or return nothing
SET ROLE anon;
SELECT * FROM app_private.platform_users LIMIT 1;
RESET ROLE;
```

---

## Remaining Security Best Practices

- [ ] Rotate the `service_role` key periodically
- [ ] Monitor edge function logs for unauthorized access attempts
- [ ] Add rate limiting to edge functions
- [ ] Implement IP allowlisting if applicable
- [ ] Regular security audits of RLS policies
- [ ] Review RPC function permissions quarterly
- [ ] Ensure no new tables are accidentally created in `public` schema
