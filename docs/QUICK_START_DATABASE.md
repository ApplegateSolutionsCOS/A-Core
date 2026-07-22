# Database Quick Start Guide

## Run Order (3 scripts total)

Run each script in the **Supabase SQL Editor** (Dashboard → SQL Editor → New Query → Paste → Run).

### Step 1: VERIFY_AND_FIX_ALL.sql ← Run this FIRST

This single script does everything:
- Creates all 17 tables in `app_private` schema (safe if they already exist)
- Enables RLS on all tables
- Fixes **Performance Advisor** warnings (RLS `current_setting()` wrapped in `SELECT`)
- Fixes **Security Advisor** warnings (function search paths made immutable)
- Recreates all `updated_at` triggers
- Outputs a diagnostic report showing table status

**Expected result:** A table with 17 rows showing `table_name`, `rls_enabled = YES`, `has_policy = YES` for all tables.

### Step 2: Check Advisors → Should show 0 warnings

After running Step 1, check both dashboards:
- **Performance Advisor** (Dashboard → Database → Performance Advisor) → 0 warnings
- **Security Advisor** (Dashboard → Database → Security Advisor) → 0 warnings

If any warnings remain, re-run `VERIFY_AND_FIX_ALL.sql` — it's fully idempotent.

### Step 3: SEED_DATA.sql ← Run this SECOND

Populates the database with test data:
- 10 platform users (1 owner + 3 tech + 3 support + 3 sales)
- 5 organizations (Acme, TechStart, Green Valley, Metro Legal, Sunrise Healthcare)
- 17 organization users across all 5 orgs
- 13 workspaces, 7 mini apps, 8 tasks, 6 calendar events, 5 messages
- Activity stream and audit log entries

**Safe to re-run:** Uses `ON CONFLICT DO NOTHING` so duplicate runs won't cause errors.

**Expected result:** A verification report showing all record counts.

## Test Login Credentials

| Role | Email | Password |
|------|-------|----------|
| Platform Owner | `owner@applegate.dev` | `password123` |
| Tech Admin | `sarah.tech@applegate.dev` | `password123` |
| Support Admin | `lisa.support@applegate.dev` | `password123` |
| Sales Admin | `david.sales@applegate.dev` | `password123` |
| Org Admin (Acme) | `john.ceo@acme.com` | `password123` |
| Org Admin (TechStart) | `founder@techstart.io` | `password123` |

All users share the same password: `password123`

## Script Reference

| File | Purpose | When to Run |
|------|---------|-------------|
| `VERIFY_AND_FIX_ALL.sql` | Create tables + fix all warnings | First (or anytime to verify) |
| `SEED_DATA.sql` | Populate test data | After tables are verified |
| `CREATE_TABLES.sql` | Full schema reference | Only for fresh installs |
| `FIX_RLS_PERFORMANCE.sql` | Fix RLS performance only | Already included in VERIFY_AND_FIX_ALL |
| `FIX_SECURITY_ADVISOR_WARNINGS.sql` | Fix security warnings only | Already included in VERIFY_AND_FIX_ALL |

## Troubleshooting

**"relation does not exist" error:**
Run `VERIFY_AND_FIX_ALL.sql` first — it creates all missing tables.

**"duplicate key" error on seed data:**
The updated `SEED_DATA.sql` uses `ON CONFLICT DO NOTHING` — this error should not occur. If using the old version, replace it with the current one.

**Performance/Security warnings persist after running fix:**
1. Hard-refresh the Supabase dashboard (Ctrl+Shift+R)
2. Wait 30 seconds and check again
3. If still showing, re-run `VERIFY_AND_FIX_ALL.sql`
