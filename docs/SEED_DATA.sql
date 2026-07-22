-- ============================================
-- APPLEGATE A-CORE BOS - COMPREHENSIVE SEED DATA
-- ============================================
-- Run this in Supabase SQL Editor AFTER running:
--   1. docs/CREATE_TABLES.sql (creates schema + tables)
--   2. docs/MIGRATION_MINIAPP_SETTINGS.sql (adds preset/hidden columns)
--   3. docs/MIGRATION_ACCESS_CONTROL.sql (adds mini_app_access table)
--
-- PLATFORM OWNER: andrew@applegate.solutions (ONLY owner)
-- NO references to applegate.dev domain
-- ============================================

DO $$
DECLARE
    -- Platform Owner
    v_owner_id UUID := '11111111-1111-1111-1111-111111111111';
    
    -- Platform Staff
    v_tech_admin_id UUID := '22222222-2222-2222-2222-222222222222';
    v_tech_mgr_id UUID := '22222222-2222-2222-2222-222222222223';
    v_tech_user_id UUID := '22222222-2222-2222-2222-222222222224';
    v_support_admin_id UUID := '33333333-3333-3333-3333-333333333333';
    v_support_mgr_id UUID := '33333333-3333-3333-3333-333333333334';
    v_support_user_id UUID := '33333333-3333-3333-3333-333333333335';
    v_sales_admin_id UUID := '44444444-4444-4444-4444-444444444444';
    v_sales_mgr_id UUID := '44444444-4444-4444-4444-444444444445';
    v_sales_user_id UUID := '44444444-4444-4444-4444-444444444446';
    
    -- Demo Organization
    v_demo_org_id UUID := 'aaaa0000-0000-0000-0000-000000000001';
    
    -- Demo Org Users
    v_org_admin_id UUID := 'bbbb0001-0001-0001-0001-000000000001';
    v_org_tech_mgr_id UUID := 'bbbb0001-0001-0001-0001-000000000002';
    v_org_support_mgr_id UUID := 'bbbb0001-0001-0001-0001-000000000003';
    v_org_sales_mgr_id UUID := 'bbbb0001-0001-0001-0001-000000000004';
    v_org_tech_user_id UUID := 'bbbb0001-0001-0001-0001-000000000005';
    v_org_support_user_id UUID := 'bbbb0001-0001-0001-0001-000000000006';
    v_org_sales_user_id UUID := 'bbbb0001-0001-0001-0001-000000000007';
    v_org_acct_mgr_id UUID := 'bbbb0001-0001-0001-0001-000000000008';
    
    -- Workspaces
    v_main_ws_id UUID := 'cccc0001-0001-0001-0001-000000000001';
    v_admin_ws_id UUID := 'cccc0001-0001-0001-0001-000000000002';
    v_accounting_ws_id UUID := 'cccc0001-0001-0001-0001-000000000003';
    v_personnel_ws_id UUID := 'cccc0001-0001-0001-0001-000000000004';
    v_data_ws_id UUID := 'cccc0001-0001-0001-0001-000000000005';
    v_security_ws_id UUID := 'cccc0001-0001-0001-0001-000000000006';
    
    -- Preset MiniApps (Main Workspace)
    v_contacts_app_id UUID := 'dddd0001-0001-0001-0001-000000000001';
    v_projects_app_id UUID := 'dddd0001-0001-0001-0001-000000000002';
    v_inventory_app_id UUID := 'dddd0001-0001-0001-0001-000000000003';
    v_invoices_app_id UUID := 'dddd0001-0001-0001-0001-000000000004';
    v_tickets_app_id UUID := 'dddd0001-0001-0001-0001-000000000005';
    
    -- Placeholder password hash (bcrypt of 'password123')
    v_password_hash TEXT := '$2a$10$rQEY7xQxK8VqZqZqZqZqZuZqZqZqZqZqZqZqZqZqZqZqZqZqZqZqZq';

BEGIN
    RAISE NOTICE '============================================';
    RAISE NOTICE 'APPLEGATE A-CORE BOS - SEEDING DATABASE';
    RAISE NOTICE 'Owner: andrew@applegate.solutions';
    RAISE NOTICE '============================================';

    -- ============================================
    -- 1. PLATFORM OWNER (andrew@applegate.solutions ONLY)
    -- ============================================
    RAISE NOTICE 'Inserting Platform Owner...';
    
    INSERT INTO app_private.platform_users (id, email, full_name, password_hash, role, department, avatar_url, phone_number, status, is_owner, email_verified)
    VALUES 
        (v_owner_id, 'andrew@applegate.solutions', 'Andrew Applegate', NULL, 'platform_owner_admin', NULL, 'https://api.dicebear.com/7.x/avataaars/svg?seed=Andrew', NULL, 'active', true, true)
    ON CONFLICT (id) DO UPDATE SET
        email = 'andrew@applegate.solutions',
        full_name = 'Andrew Applegate',
        is_owner = true,
        role = 'platform_owner_admin';
    
    RAISE NOTICE 'Platform Owner: andrew@applegate.solutions (password not set - use Settings to set)';

    -- ============================================
    -- 2. PLATFORM STAFF (all @applegate.solutions)
    -- ============================================
    RAISE NOTICE 'Inserting Platform Staff...';
    
    -- Tech Department
    INSERT INTO app_private.platform_users (id, email, full_name, password_hash, role, department, avatar_url, phone_number, status, is_owner, email_verified, invited_by)
    VALUES 
        (v_tech_admin_id, 'sarah.tech@applegate.solutions', 'Sarah Chen', v_password_hash, 'platform_tech_admin', 'tech', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah', '+1-555-0101', 'active', false, true, v_owner_id),
        (v_tech_mgr_id, 'mike.dev@applegate.solutions', 'Mike Rodriguez', v_password_hash, 'platform_tech_manager', 'tech', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Mike', '+1-555-0102', 'active', false, true, v_tech_admin_id),
        (v_tech_user_id, 'emma.code@applegate.solutions', 'Emma Watson', v_password_hash, 'platform_tech_user', 'tech', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Emma', '+1-555-0103', 'active', false, true, v_tech_mgr_id)
    ON CONFLICT (id) DO NOTHING;
    
    -- Support Department
    INSERT INTO app_private.platform_users (id, email, full_name, password_hash, role, department, avatar_url, phone_number, status, is_owner, email_verified, invited_by)
    VALUES 
        (v_support_admin_id, 'lisa.support@applegate.solutions', 'Lisa Thompson', v_password_hash, 'platform_support_admin', 'support', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Lisa', '+1-555-0201', 'active', false, true, v_owner_id),
        (v_support_mgr_id, 'james.help@applegate.solutions', 'James Wilson', v_password_hash, 'platform_support_manager', 'support', 'https://api.dicebear.com/7.x/avataaars/svg?seed=James', '+1-555-0202', 'active', false, true, v_support_admin_id),
        (v_support_user_id, 'amy.care@applegate.solutions', 'Amy Garcia', v_password_hash, 'platform_support_user', 'support', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Amy', '+1-555-0203', 'active', false, true, v_support_mgr_id)
    ON CONFLICT (id) DO NOTHING;
    
    -- Sales Department
    INSERT INTO app_private.platform_users (id, email, full_name, password_hash, role, department, avatar_url, phone_number, status, is_owner, email_verified, invited_by)
    VALUES 
        (v_sales_admin_id, 'david.sales@applegate.solutions', 'David Kim', v_password_hash, 'platform_sales_admin', 'sales', 'https://api.dicebear.com/7.x/avataaars/svg?seed=David', '+1-555-0301', 'active', false, true, v_owner_id),
        (v_sales_mgr_id, 'rachel.biz@applegate.solutions', 'Rachel Martinez', v_password_hash, 'platform_sales_manager', 'sales', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Rachel', '+1-555-0302', 'active', false, true, v_sales_admin_id),
        (v_sales_user_id, 'tom.deals@applegate.solutions', 'Tom Anderson', v_password_hash, 'platform_sales_user', 'sales', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Tom', '+1-555-0303', 'active', false, true, v_sales_mgr_id)
    ON CONFLICT (id) DO NOTHING;
    
    RAISE NOTICE 'Platform Staff: 9 users inserted (3 tech, 3 support, 3 sales)';

    -- ============================================
    -- 3. DEMO ORGANIZATION: Applegate Demo Corp
    -- ============================================
    RAISE NOTICE 'Creating Demo Organization...';
    
    INSERT INTO app_private.organizations (id, name, slug, domain, logo_url, subscription_tier, monthly_base_price, per_user_price, max_users, is_active, settings)
    VALUES (
        v_demo_org_id,
        'Applegate Demo Corp',
        'applegate-demo',
        'demo.applegate.solutions',
        'https://api.dicebear.com/7.x/shapes/svg?seed=ApplegateDemoCorp',
        'professional',
        249.00,
        19.00,
        50,
        true,
        '{"theme": "dark", "timezone": "America/Los_Angeles", "locale": "en-US", "features": {"miniapps": true, "integrations": true, "audit_logs": true, "custom_fields": true}}'::jsonb
    )
    ON CONFLICT (id) DO UPDATE SET
        name = 'Applegate Demo Corp',
        domain = 'demo.applegate.solutions';
    
    RAISE NOTICE 'Organization: Applegate Demo Corp (professional tier, $249/mo)';

    -- ============================================
    -- 4. ORGANIZATION USERS
    -- ============================================
    RAISE NOTICE 'Creating Organization Users...';
    
    INSERT INTO app_private.organization_users (id, organization_id, email, full_name, password_hash, role, department, avatar_url, phone_number, status, is_org_creator, email_verified)
    VALUES
        (v_org_admin_id, v_demo_org_id, 'john.ceo@acme.com', 'John Mitchell', v_password_hash, 'organization_admin', 'admin', 'https://api.dicebear.com/7.x/avataaars/svg?seed=John', '+1-555-1001', 'active', true, true)
    ON CONFLICT (organization_id, email) DO NOTHING;
    
    INSERT INTO app_private.organization_users (id, organization_id, email, full_name, password_hash, role, department, avatar_url, phone_number, status, is_org_creator, invited_by, email_verified)
    VALUES
        (v_org_tech_mgr_id, v_demo_org_id, 'jane.tech@acme.com', 'Jane Foster', v_password_hash, 'organization_tech_manager', 'tech', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Jane', '+1-555-1002', 'active', false, v_org_admin_id, true),
        (v_org_support_mgr_id, v_demo_org_id, 'mark.support@acme.com', 'Mark Davis', v_password_hash, 'organization_support_manager', 'support', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Mark', '+1-555-1003', 'active', false, v_org_admin_id, true),
        (v_org_sales_mgr_id, v_demo_org_id, 'susan.sales@acme.com', 'Susan Park', v_password_hash, 'organization_sales_manager', 'sales', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Susan', '+1-555-1004', 'active', false, v_org_admin_id, true),
        (v_org_tech_user_id, v_demo_org_id, 'alex.dev@acme.com', 'Alex Rivera', v_password_hash, 'organization_tech_user', 'tech', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alex', '+1-555-1005', 'active', false, v_org_tech_mgr_id, true),
        (v_org_support_user_id, v_demo_org_id, 'nina.help@acme.com', 'Nina Patel', v_password_hash, 'organization_support_user', 'support', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Nina', '+1-555-1006', 'active', false, v_org_support_mgr_id, true),
        (v_org_sales_user_id, v_demo_org_id, 'chris.biz@acme.com', 'Chris Lee', v_password_hash, 'organization_sales_user', 'sales', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Chris', '+1-555-1007', 'active', false, v_org_sales_mgr_id, true),
        (v_org_acct_mgr_id, v_demo_org_id, 'diana.acct@acme.com', 'Diana Brooks', v_password_hash, 'organization_accounting_manager', 'accounting', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Diana', '+1-555-1008', 'active', false, v_org_admin_id, true)
    ON CONFLICT (organization_id, email) DO NOTHING;
    
    RAISE NOTICE 'Organization Users: 8 users (1 admin, 3 managers, 3 users, 1 accounting)';

    -- ============================================
    -- 5. WORKSPACES (6 default workspaces)
    -- ============================================
    RAISE NOTICE 'Creating Workspaces...';
    
    INSERT INTO app_private.workspaces (id, organization_id, name, slug, icon, description, is_visible, display_order)
    VALUES
        (v_main_ws_id, v_demo_org_id, 'Main', 'main', 'home', 'Primary workspace for CRM, orders, and daily operations', true, 0),
        (v_admin_ws_id, v_demo_org_id, 'Admin', 'admin', 'shield', 'Administrative workspace for company management', true, 1),
        (v_accounting_ws_id, v_demo_org_id, 'Accounting', 'accounting', 'calculator', 'Financial management and reporting', true, 2),
        (v_personnel_ws_id, v_demo_org_id, 'Personnel', 'personnel', 'users', 'HR, hiring, and team management', true, 3),
        (v_data_ws_id, v_demo_org_id, 'Data', 'data', 'database', 'Data management and reference tables', true, 4),
        (v_security_ws_id, v_demo_org_id, 'Security', 'security', 'lock', 'Security policies and access control', true, 5)
    ON CONFLICT (organization_id, slug) DO NOTHING;
    
    RAISE NOTICE 'Workspaces: 6 created (Main, Admin, Accounting, Personnel, Data, Security)';

    -- ============================================
    -- 6. WORKSPACE ACCESS (who can see what)
    -- ============================================
    RAISE NOTICE 'Setting Workspace Access...';
    
    -- Org Admin gets full access to all workspaces
    INSERT INTO app_private.workspace_access (workspace_id, user_id, can_view, can_edit, can_admin) VALUES
        (v_main_ws_id, v_org_admin_id, true, true, true),
        (v_admin_ws_id, v_org_admin_id, true, true, true),
        (v_accounting_ws_id, v_org_admin_id, true, true, true),
        (v_personnel_ws_id, v_org_admin_id, true, true, true),
        (v_data_ws_id, v_org_admin_id, true, true, true),
        (v_security_ws_id, v_org_admin_id, true, true, true)
    ON CONFLICT (workspace_id, user_id) DO NOTHING;
    
    -- Tech Manager: Main + Data
    INSERT INTO app_private.workspace_access (workspace_id, user_id, can_view, can_edit, can_admin) VALUES
        (v_main_ws_id, v_org_tech_mgr_id, true, true, false),
        (v_data_ws_id, v_org_tech_mgr_id, true, true, true)
    ON CONFLICT (workspace_id, user_id) DO NOTHING;
    
    -- Support Manager: Main only
    INSERT INTO app_private.workspace_access (workspace_id, user_id, can_view, can_edit, can_admin) VALUES
        (v_main_ws_id, v_org_support_mgr_id, true, true, false)
    ON CONFLICT (workspace_id, user_id) DO NOTHING;
    
    -- Sales Manager: Main only
    INSERT INTO app_private.workspace_access (workspace_id, user_id, can_view, can_edit, can_admin) VALUES
        (v_main_ws_id, v_org_sales_mgr_id, true, true, false)
    ON CONFLICT (workspace_id, user_id) DO NOTHING;
    
    -- Tech User: Main (view only) + Data (edit)
    INSERT INTO app_private.workspace_access (workspace_id, user_id, can_view, can_edit, can_admin) VALUES
        (v_main_ws_id, v_org_tech_user_id, true, false, false),
        (v_data_ws_id, v_org_tech_user_id, true, true, false)
    ON CONFLICT (workspace_id, user_id) DO NOTHING;
    
    -- Support User: Main (view only)
    INSERT INTO app_private.workspace_access (workspace_id, user_id, can_view, can_edit, can_admin) VALUES
        (v_main_ws_id, v_org_support_user_id, true, false, false)
    ON CONFLICT (workspace_id, user_id) DO NOTHING;
    
    -- Sales User: Main (edit)
    INSERT INTO app_private.workspace_access (workspace_id, user_id, can_view, can_edit, can_admin) VALUES
        (v_main_ws_id, v_org_sales_user_id, true, true, false)
    ON CONFLICT (workspace_id, user_id) DO NOTHING;
    
    -- Accounting Manager: Main (view) + Accounting (admin)
    INSERT INTO app_private.workspace_access (workspace_id, user_id, can_view, can_edit, can_admin) VALUES
        (v_main_ws_id, v_org_acct_mgr_id, true, false, false),
        (v_accounting_ws_id, v_org_acct_mgr_id, true, true, true)
    ON CONFLICT (workspace_id, user_id) DO NOTHING;
    
    RAISE NOTICE 'Workspace Access: Configured for all 8 org users';

    -- ============================================
    -- 7. PRESET MINIAPPS (5 apps in Main Workspace)
    -- ============================================
    RAISE NOTICE 'Creating Preset MiniApps...';
    
    -- ---- CONTACTS ----
    INSERT INTO app_private.mini_apps (id, workspace_id, name, slug, icon, description, is_system_app, is_visible, is_preset, is_hidden_by_admin, display_order, created_by, schema_definition, app_settings, item_id_settings)
    VALUES (
        v_contacts_app_id,
        v_main_ws_id,
        'Contacts',
        'contacts',
        'users',
        'Manage all your business contacts, leads, and relationships',
        true, true, true, false, 0, NULL,
        '{
            "fields": [
                {"id": "first_name", "name": "First Name", "type": "text_field", "required": true, "hiddenWhenEmpty": false, "hiddenWhenFull": false, "alwaysHidden": false},
                {"id": "last_name", "name": "Last Name", "type": "text_field", "required": true, "hiddenWhenEmpty": false, "hiddenWhenFull": false, "alwaysHidden": false},
                {"id": "email", "name": "Email", "type": "text_field", "required": true, "hiddenWhenEmpty": false, "hiddenWhenFull": false, "alwaysHidden": false},
                {"id": "phone", "name": "Phone", "type": "text_field", "required": false, "hiddenWhenEmpty": true, "hiddenWhenFull": false, "alwaysHidden": false},
                {"id": "company", "name": "Company", "type": "text_field", "required": false, "hiddenWhenEmpty": false, "hiddenWhenFull": false, "alwaysHidden": false},
                {"id": "title", "name": "Job Title", "type": "text_field", "required": false, "hiddenWhenEmpty": true, "hiddenWhenFull": false, "alwaysHidden": false},
                {"id": "contact_type", "name": "Type", "type": "dropdown", "required": true, "options": ["Lead", "Customer", "Vendor", "Partner", "Employee"], "hiddenWhenEmpty": false, "hiddenWhenFull": false, "alwaysHidden": false},
                {"id": "status", "name": "Status", "type": "dropdown", "required": true, "options": ["Active", "Inactive", "Prospect", "Archived"], "hiddenWhenEmpty": false, "hiddenWhenFull": false, "alwaysHidden": false},
                {"id": "address", "name": "Address", "type": "text_field", "required": false, "hiddenWhenEmpty": true, "hiddenWhenFull": false, "alwaysHidden": false},
                {"id": "notes", "name": "Notes", "type": "text_field", "required": false, "hiddenWhenEmpty": true, "hiddenWhenFull": false, "alwaysHidden": false},
                {"id": "tags", "name": "Tags", "type": "text_field", "required": false, "hiddenWhenEmpty": true, "hiddenWhenFull": false, "alwaysHidden": false},
                {"id": "internal_id", "name": "Internal ID", "type": "text_field", "required": false, "hiddenWhenEmpty": false, "hiddenWhenFull": false, "alwaysHidden": true}
            ]
        }'::jsonb,
        '{"layouts": ["table", "card", "badge"], "defaultLayout": "table", "recordsPerPage": 25, "allowExport": true, "allowImport": true, "showCreatedBy": true, "showTimestamps": true, "enableComments": true, "enableAttachments": true}'::jsonb,
        '{"prefix": "CON", "minDigits": 5, "showItemId": true, "showQrCode": true, "showBarcode": true, "barcodeSymbology": "CODE128"}'::jsonb
    )
    ON CONFLICT (workspace_id, slug) DO UPDATE SET
        schema_definition = EXCLUDED.schema_definition,
        app_settings = EXCLUDED.app_settings,
        item_id_settings = EXCLUDED.item_id_settings,
        is_preset = true,
        is_system_app = true;

    -- ---- PROJECTS ----
    INSERT INTO app_private.mini_apps (id, workspace_id, name, slug, icon, description, is_system_app, is_visible, is_preset, is_hidden_by_admin, display_order, created_by, schema_definition, app_settings, item_id_settings)
    VALUES (
        v_projects_app_id,
        v_main_ws_id,
        'Projects',
        'projects',
        'folder',
        'Track projects, milestones, and deliverables',
        true, true, true, false, 1, NULL,
        '{
            "fields": [
                {"id": "project_name", "name": "Project Name", "type": "text_field", "required": true, "hiddenWhenEmpty": false, "hiddenWhenFull": false, "alwaysHidden": false},
                {"id": "description", "name": "Description", "type": "text_field", "required": false, "hiddenWhenEmpty": false, "hiddenWhenFull": false, "alwaysHidden": false},
                {"id": "client", "name": "Client", "type": "text_field", "required": false, "hiddenWhenEmpty": false, "hiddenWhenFull": false, "alwaysHidden": false},
                {"id": "status", "name": "Status", "type": "dropdown", "required": true, "options": ["Planning", "In Progress", "On Hold", "Completed", "Cancelled"], "hiddenWhenEmpty": false, "hiddenWhenFull": false, "alwaysHidden": false},
                {"id": "priority", "name": "Priority", "type": "dropdown", "required": true, "options": ["Low", "Medium", "High", "Urgent"], "hiddenWhenEmpty": false, "hiddenWhenFull": false, "alwaysHidden": false},
                {"id": "start_date", "name": "Start Date", "type": "date_picker", "required": false, "hiddenWhenEmpty": false, "hiddenWhenFull": false, "alwaysHidden": false},
                {"id": "due_date", "name": "Due Date", "type": "date_picker", "required": false, "hiddenWhenEmpty": false, "hiddenWhenFull": false, "alwaysHidden": false},
                {"id": "budget", "name": "Budget", "type": "number_field", "required": false, "hiddenWhenEmpty": true, "hiddenWhenFull": false, "alwaysHidden": false},
                {"id": "assigned_to", "name": "Assigned To", "type": "text_field", "required": false, "hiddenWhenEmpty": false, "hiddenWhenFull": false, "alwaysHidden": false},
                {"id": "completion_pct", "name": "Completion %", "type": "number_field", "required": false, "hiddenWhenEmpty": false, "hiddenWhenFull": false, "alwaysHidden": false},
                {"id": "tags", "name": "Tags", "type": "text_field", "required": false, "hiddenWhenEmpty": true, "hiddenWhenFull": false, "alwaysHidden": false}
            ]
        }'::jsonb,
        '{"layouts": ["table", "card", "calendar"], "defaultLayout": "table", "recordsPerPage": 20, "allowExport": true, "allowImport": false, "showCreatedBy": true, "showTimestamps": true, "enableComments": true, "enableAttachments": true}'::jsonb,
        '{"prefix": "PRJ", "minDigits": 4, "showItemId": true, "showQrCode": false, "showBarcode": true, "barcodeSymbology": "CODE128"}'::jsonb
    )
    ON CONFLICT (workspace_id, slug) DO UPDATE SET
        schema_definition = EXCLUDED.schema_definition,
        app_settings = EXCLUDED.app_settings,
        item_id_settings = EXCLUDED.item_id_settings,
        is_preset = true,
        is_system_app = true;

    -- ---- INVENTORY ----
    INSERT INTO app_private.mini_apps (id, workspace_id, name, slug, icon, description, is_system_app, is_visible, is_preset, is_hidden_by_admin, display_order, created_by, schema_definition, app_settings, item_id_settings)
    VALUES (
        v_inventory_app_id,
        v_main_ws_id,
        'Inventory',
        'inventory',
        'box',
        'Track stock levels, SKUs, and warehouse locations',
        true, true, true, false, 2, NULL,
        '{
            "fields": [
                {"id": "item_name", "name": "Item Name", "type": "text_field", "required": true, "hiddenWhenEmpty": false, "hiddenWhenFull": false, "alwaysHidden": false},
                {"id": "sku", "name": "SKU", "type": "text_field", "required": true, "hiddenWhenEmpty": false, "hiddenWhenFull": false, "alwaysHidden": false},
                {"id": "category", "name": "Category", "type": "dropdown", "required": true, "options": ["Electronics", "Office Supplies", "Furniture", "Raw Materials", "Finished Goods", "Packaging", "Other"], "hiddenWhenEmpty": false, "hiddenWhenFull": false, "alwaysHidden": false},
                {"id": "quantity", "name": "Quantity", "type": "number_field", "required": true, "hiddenWhenEmpty": false, "hiddenWhenFull": false, "alwaysHidden": false},
                {"id": "unit_price", "name": "Unit Price", "type": "number_field", "required": true, "hiddenWhenEmpty": false, "hiddenWhenFull": false, "alwaysHidden": false},
                {"id": "location", "name": "Warehouse Location", "type": "text_field", "required": false, "hiddenWhenEmpty": true, "hiddenWhenFull": false, "alwaysHidden": false},
                {"id": "reorder_level", "name": "Reorder Level", "type": "number_field", "required": false, "hiddenWhenEmpty": false, "hiddenWhenFull": false, "alwaysHidden": false},
                {"id": "supplier", "name": "Supplier", "type": "text_field", "required": false, "hiddenWhenEmpty": true, "hiddenWhenFull": false, "alwaysHidden": false},
                {"id": "status", "name": "Status", "type": "dropdown", "required": true, "options": ["In Stock", "Low Stock", "Out of Stock", "Discontinued", "On Order"], "hiddenWhenEmpty": false, "hiddenWhenFull": false, "alwaysHidden": false},
                {"id": "barcode", "name": "Barcode", "type": "text_field", "required": false, "hiddenWhenEmpty": true, "hiddenWhenFull": false, "alwaysHidden": false},
                {"id": "weight", "name": "Weight (kg)", "type": "number_field", "required": false, "hiddenWhenEmpty": true, "hiddenWhenFull": false, "alwaysHidden": false},
                {"id": "dimensions", "name": "Dimensions", "type": "text_field", "required": false, "hiddenWhenEmpty": true, "hiddenWhenFull": false, "alwaysHidden": false}
            ]
        }'::jsonb,
        '{"layouts": ["table", "card"], "defaultLayout": "table", "recordsPerPage": 50, "allowExport": true, "allowImport": true, "showCreatedBy": true, "showTimestamps": true, "enableComments": false, "enableAttachments": true}'::jsonb,
        '{"prefix": "INV", "minDigits": 6, "showItemId": true, "showQrCode": true, "showBarcode": true, "barcodeSymbology": "EAN13"}'::jsonb
    )
    ON CONFLICT (workspace_id, slug) DO UPDATE SET
        schema_definition = EXCLUDED.schema_definition,
        app_settings = EXCLUDED.app_settings,
        item_id_settings = EXCLUDED.item_id_settings,
        is_preset = true,
        is_system_app = true;

    -- ---- INVOICES ----
    INSERT INTO app_private.mini_apps (id, workspace_id, name, slug, icon, description, is_system_app, is_visible, is_preset, is_hidden_by_admin, display_order, created_by, schema_definition, app_settings, item_id_settings)
    VALUES (
        v_invoices_app_id,
        v_main_ws_id,
        'Invoices',
        'invoices',
        'file-text',
        'Create and manage invoices, track payments and billing',
        true, true, true, false, 3, NULL,
        '{
            "fields": [
                {"id": "invoice_number", "name": "Invoice #", "type": "text_field", "required": true, "hiddenWhenEmpty": false, "hiddenWhenFull": false, "alwaysHidden": false},
                {"id": "client_name", "name": "Client Name", "type": "text_field", "required": true, "hiddenWhenEmpty": false, "hiddenWhenFull": false, "alwaysHidden": false},
                {"id": "client_email", "name": "Client Email", "type": "text_field", "required": false, "hiddenWhenEmpty": true, "hiddenWhenFull": false, "alwaysHidden": false},
                {"id": "issue_date", "name": "Issue Date", "type": "date_picker", "required": true, "hiddenWhenEmpty": false, "hiddenWhenFull": false, "alwaysHidden": false},
                {"id": "due_date", "name": "Due Date", "type": "date_picker", "required": true, "hiddenWhenEmpty": false, "hiddenWhenFull": false, "alwaysHidden": false},
                {"id": "subtotal", "name": "Subtotal", "type": "number_field", "required": true, "hiddenWhenEmpty": false, "hiddenWhenFull": false, "alwaysHidden": false},
                {"id": "tax_rate", "name": "Tax Rate %", "type": "number_field", "required": false, "hiddenWhenEmpty": false, "hiddenWhenFull": false, "alwaysHidden": false},
                {"id": "total", "name": "Total", "type": "number_field", "required": true, "hiddenWhenEmpty": false, "hiddenWhenFull": false, "alwaysHidden": false},
                {"id": "status", "name": "Status", "type": "dropdown", "required": true, "options": ["Draft", "Sent", "Viewed", "Paid", "Overdue", "Cancelled", "Refunded"], "hiddenWhenEmpty": false, "hiddenWhenFull": false, "alwaysHidden": false},
                {"id": "payment_method", "name": "Payment Method", "type": "dropdown", "required": false, "options": ["Bank Transfer", "Credit Card", "PayPal", "Check", "Cash", "Other"], "hiddenWhenEmpty": true, "hiddenWhenFull": false, "alwaysHidden": false},
                {"id": "notes", "name": "Notes", "type": "text_field", "required": false, "hiddenWhenEmpty": true, "hiddenWhenFull": false, "alwaysHidden": false},
                {"id": "line_items", "name": "Line Items JSON", "type": "text_field", "required": false, "hiddenWhenEmpty": false, "hiddenWhenFull": false, "alwaysHidden": true}
            ]
        }'::jsonb,
        '{"layouts": ["table", "card"], "defaultLayout": "table", "recordsPerPage": 25, "allowExport": true, "allowImport": false, "showCreatedBy": true, "showTimestamps": true, "enableComments": true, "enableAttachments": true}'::jsonb,
        '{"prefix": "INV", "minDigits": 5, "showItemId": true, "showQrCode": true, "showBarcode": true, "barcodeSymbology": "CODE128"}'::jsonb
    )
    ON CONFLICT (workspace_id, slug) DO UPDATE SET
        schema_definition = EXCLUDED.schema_definition,
        app_settings = EXCLUDED.app_settings,
        item_id_settings = EXCLUDED.item_id_settings,
        is_preset = true,
        is_system_app = true;

    -- ---- SUPPORT TICKETS ----
    INSERT INTO app_private.mini_apps (id, workspace_id, name, slug, icon, description, is_system_app, is_visible, is_preset, is_hidden_by_admin, display_order, created_by, schema_definition, app_settings, item_id_settings)
    VALUES (
        v_tickets_app_id,
        v_main_ws_id,
        'Support Tickets',
        'support-tickets',
        'headphones',
        'Track customer support requests, bugs, and feature requests',
        true, true, true, false, 4, NULL,
        '{
            "fields": [
                {"id": "subject", "name": "Subject", "type": "text_field", "required": true, "hiddenWhenEmpty": false, "hiddenWhenFull": false, "alwaysHidden": false},
                {"id": "description", "name": "Description", "type": "text_field", "required": true, "hiddenWhenEmpty": false, "hiddenWhenFull": false, "alwaysHidden": false},
                {"id": "reporter_name", "name": "Reporter", "type": "text_field", "required": true, "hiddenWhenEmpty": false, "hiddenWhenFull": false, "alwaysHidden": false},
                {"id": "reporter_email", "name": "Reporter Email", "type": "text_field", "required": false, "hiddenWhenEmpty": true, "hiddenWhenFull": false, "alwaysHidden": false},
                {"id": "category", "name": "Category", "type": "dropdown", "required": true, "options": ["Bug", "Feature Request", "Question", "Account Issue", "Billing", "Performance", "Security", "Other"], "hiddenWhenEmpty": false, "hiddenWhenFull": false, "alwaysHidden": false},
                {"id": "priority", "name": "Priority", "type": "dropdown", "required": true, "options": ["Low", "Medium", "High", "Critical"], "hiddenWhenEmpty": false, "hiddenWhenFull": false, "alwaysHidden": false},
                {"id": "status", "name": "Status", "type": "dropdown", "required": true, "options": ["Open", "In Progress", "Waiting on Customer", "Waiting on Internal", "Resolved", "Closed", "Reopened"], "hiddenWhenEmpty": false, "hiddenWhenFull": false, "alwaysHidden": false},
                {"id": "assigned_to", "name": "Assigned To", "type": "text_field", "required": false, "hiddenWhenEmpty": false, "hiddenWhenFull": false, "alwaysHidden": false},
                {"id": "resolution", "name": "Resolution", "type": "text_field", "required": false, "hiddenWhenEmpty": true, "hiddenWhenFull": false, "alwaysHidden": false},
                {"id": "resolved_at", "name": "Resolved Date", "type": "date_picker", "required": false, "hiddenWhenEmpty": true, "hiddenWhenFull": false, "alwaysHidden": false},
                {"id": "satisfaction", "name": "Satisfaction", "type": "dropdown", "required": false, "options": ["Very Satisfied", "Satisfied", "Neutral", "Dissatisfied", "Very Dissatisfied"], "hiddenWhenEmpty": true, "hiddenWhenFull": false, "alwaysHidden": false}
            ]
        }'::jsonb,
        '{"layouts": ["table", "card"], "defaultLayout": "table", "recordsPerPage": 25, "allowExport": true, "allowImport": false, "showCreatedBy": true, "showTimestamps": true, "enableComments": true, "enableAttachments": true}'::jsonb,
        '{"prefix": "TKT", "minDigits": 5, "showItemId": true, "showQrCode": false, "showBarcode": false, "barcodeSymbology": "CODE128"}'::jsonb
    )
    ON CONFLICT (workspace_id, slug) DO UPDATE SET
        schema_definition = EXCLUDED.schema_definition,
        app_settings = EXCLUDED.app_settings,
        item_id_settings = EXCLUDED.item_id_settings,
        is_preset = true,
        is_system_app = true;

    RAISE NOTICE 'Preset MiniApps: 5 created (Contacts, Projects, Inventory, Invoices, Support Tickets)';

    -- ============================================
    -- 8. MINI APP ACCESS (granular per-user per-app)
    -- ============================================
    RAISE NOTICE 'Setting MiniApp Access Permissions...';
    
    -- Org Admin: full access to all 5 preset apps
    INSERT INTO app_private.mini_app_access (mini_app_id, user_id, can_view, can_edit, can_admin, can_delete, granted_by) VALUES
        (v_contacts_app_id, v_org_admin_id, true, true, true, true, NULL),
        (v_projects_app_id, v_org_admin_id, true, true, true, true, NULL),
        (v_inventory_app_id, v_org_admin_id, true, true, true, true, NULL),
        (v_invoices_app_id, v_org_admin_id, true, true, true, true, NULL),
        (v_tickets_app_id, v_org_admin_id, true, true, true, true, NULL)
    ON CONFLICT (mini_app_id, user_id) DO NOTHING;
    
    -- Tech Manager: Contacts (edit), Projects (admin), Inventory (view)
    INSERT INTO app_private.mini_app_access (mini_app_id, user_id, can_view, can_edit, can_admin, can_delete, granted_by) VALUES
        (v_contacts_app_id, v_org_tech_mgr_id, true, true, false, false, v_org_admin_id),
        (v_projects_app_id, v_org_tech_mgr_id, true, true, true, false, v_org_admin_id),
        (v_inventory_app_id, v_org_tech_mgr_id, true, false, false, false, v_org_admin_id)
    ON CONFLICT (mini_app_id, user_id) DO NOTHING;
    
    -- Support Manager: Contacts (edit), Tickets (admin)
    INSERT INTO app_private.mini_app_access (mini_app_id, user_id, can_view, can_edit, can_admin, can_delete, granted_by) VALUES
        (v_contacts_app_id, v_org_support_mgr_id, true, true, false, false, v_org_admin_id),
        (v_tickets_app_id, v_org_support_mgr_id, true, true, true, true, v_org_admin_id)
    ON CONFLICT (mini_app_id, user_id) DO NOTHING;
    
    -- Sales Manager: Contacts (edit), Projects (view), Invoices (admin)
    INSERT INTO app_private.mini_app_access (mini_app_id, user_id, can_view, can_edit, can_admin, can_delete, granted_by) VALUES
        (v_contacts_app_id, v_org_sales_mgr_id, true, true, false, false, v_org_admin_id),
        (v_projects_app_id, v_org_sales_mgr_id, true, false, false, false, v_org_admin_id),
        (v_invoices_app_id, v_org_sales_mgr_id, true, true, true, true, v_org_admin_id)
    ON CONFLICT (mini_app_id, user_id) DO NOTHING;
    
    -- Tech User: Contacts (view), Projects (edit)
    INSERT INTO app_private.mini_app_access (mini_app_id, user_id, can_view, can_edit, can_admin, can_delete, granted_by) VALUES
        (v_contacts_app_id, v_org_tech_user_id, true, false, false, false, v_org_tech_mgr_id),
        (v_projects_app_id, v_org_tech_user_id, true, true, false, false, v_org_tech_mgr_id)
    ON CONFLICT (mini_app_id, user_id) DO NOTHING;
    
    -- Support User: Contacts (view), Tickets (edit)
    INSERT INTO app_private.mini_app_access (mini_app_id, user_id, can_view, can_edit, can_admin, can_delete, granted_by) VALUES
        (v_contacts_app_id, v_org_support_user_id, true, false, false, false, v_org_support_mgr_id),
        (v_tickets_app_id, v_org_support_user_id, true, true, false, false, v_org_support_mgr_id)
    ON CONFLICT (mini_app_id, user_id) DO NOTHING;
    
    -- Sales User: Contacts (edit), Invoices (edit)
    INSERT INTO app_private.mini_app_access (mini_app_id, user_id, can_view, can_edit, can_admin, can_delete, granted_by) VALUES
        (v_contacts_app_id, v_org_sales_user_id, true, true, false, false, v_org_sales_mgr_id),
        (v_invoices_app_id, v_org_sales_user_id, true, true, false, false, v_org_sales_mgr_id)
    ON CONFLICT (mini_app_id, user_id) DO NOTHING;
    
    -- Accounting Manager: Invoices (admin), Contacts (view)
    INSERT INTO app_private.mini_app_access (mini_app_id, user_id, can_view, can_edit, can_admin, can_delete, granted_by) VALUES
        (v_invoices_app_id, v_org_acct_mgr_id, true, true, true, true, v_org_admin_id),
        (v_contacts_app_id, v_org_acct_mgr_id, true, false, false, false, v_org_admin_id)
    ON CONFLICT (mini_app_id, user_id) DO NOTHING;
    
    RAISE NOTICE 'MiniApp Access: Granular permissions set for all users';

    -- ============================================
    -- 9. SAMPLE AUDIT LOGS
    -- ============================================
    RAISE NOTICE 'Creating Audit Logs...';
    
    INSERT INTO app_private.audit_logs (organization_id, user_id, user_type, user_email, action, entity_type, entity_id, old_values, new_values, ip_address, metadata) VALUES
        (v_demo_org_id, v_org_admin_id, 'organization', 'john.ceo@acme.com', 'organization.settings.update', 'organization', v_demo_org_id, '{"theme": "light"}'::jsonb, '{"theme": "dark"}'::jsonb, '192.168.1.100', '{}'::jsonb),
        (v_demo_org_id, v_org_tech_mgr_id, 'organization', 'jane.tech@acme.com', 'workspace.create', 'workspace', v_main_ws_id, NULL, '{"name": "Main", "slug": "main"}'::jsonb, '192.168.1.101', '{}'::jsonb),
        (NULL, v_owner_id, 'platform', 'andrew@applegate.solutions', 'organization.create', 'organization', v_demo_org_id, NULL, '{"name": "Applegate Demo Corp", "subscription_tier": "professional"}'::jsonb, '10.0.0.1', '{"source": "admin_panel"}'::jsonb),
        (NULL, v_sales_admin_id, 'platform', 'david.sales@applegate.solutions', 'organization.subscription.upgrade', 'organization', v_demo_org_id, '{"tier": "starter"}'::jsonb, '{"tier": "professional"}'::jsonb, '10.0.0.50', '{"reason": "customer_request"}'::jsonb),
        (v_demo_org_id, v_org_admin_id, 'organization', 'john.ceo@acme.com', 'mini_app.access.grant', 'mini_app', v_contacts_app_id, NULL, '{"user": "jane.tech@acme.com", "permissions": "edit"}'::jsonb, '192.168.1.100', '{}'::jsonb);
    
    RAISE NOTICE 'Audit Logs: 5 entries inserted';

    -- ============================================
    -- 10. SAMPLE TASKS
    -- ============================================
    RAISE NOTICE 'Creating Sample Tasks...';
    
    INSERT INTO app_private.tasks (organization_id, workspace_id, assigned_to, created_by, title, description, status, priority, due_date) VALUES
        (v_demo_org_id, v_main_ws_id, v_org_tech_user_id, v_org_tech_mgr_id, 'Set up CI/CD pipeline', 'Configure automated deployment for production', 'in_progress', 'high', NOW() + INTERVAL '3 days'),
        (v_demo_org_id, v_main_ws_id, v_org_support_user_id, v_org_support_mgr_id, 'Update knowledge base articles', 'Review and update FAQ section', 'pending', 'medium', NOW() + INTERVAL '7 days'),
        (v_demo_org_id, v_main_ws_id, v_org_sales_user_id, v_org_sales_mgr_id, 'Prepare Q1 sales report', 'Compile quarterly sales data for review', 'pending', 'high', NOW() + INTERVAL '5 days'),
        (v_demo_org_id, v_admin_ws_id, v_org_admin_id, v_org_admin_id, 'Review security policies', 'Annual security policy review and update', 'in_progress', 'urgent', NOW() + INTERVAL '2 days'),
        (v_demo_org_id, v_accounting_ws_id, v_org_acct_mgr_id, v_org_admin_id, 'Reconcile February accounts', 'Monthly account reconciliation', 'pending', 'medium', NOW() + INTERVAL '10 days');
    
    RAISE NOTICE 'Tasks: 5 sample tasks created';

    -- ============================================
    -- 11. SAMPLE CALENDAR EVENTS
    -- ============================================
    RAISE NOTICE 'Creating Calendar Events...';
    
    INSERT INTO app_private.calendar_events (organization_id, workspace_id, created_by, title, description, start_time, end_time, all_day, location) VALUES
        (v_demo_org_id, v_main_ws_id, v_org_admin_id, 'Weekly Team Standup', 'All-hands weekly sync', NOW() + INTERVAL '1 day', NOW() + INTERVAL '1 day' + INTERVAL '30 minutes', false, 'Conference Room A'),
        (v_demo_org_id, v_main_ws_id, v_org_sales_mgr_id, 'Client Demo: Acme Corp', 'Product demo for potential enterprise client', NOW() + INTERVAL '2 days', NOW() + INTERVAL '2 days' + INTERVAL '1 hour', false, 'Zoom Meeting'),
        (v_demo_org_id, v_admin_ws_id, v_org_admin_id, 'Board Meeting', 'Quarterly board review', NOW() + INTERVAL '5 days', NOW() + INTERVAL '5 days' + INTERVAL '2 hours', false, 'Board Room'),
        (v_demo_org_id, v_personnel_ws_id, v_org_admin_id, 'New Hire Orientation', 'Onboarding session for new team members', NOW() + INTERVAL '3 days', NOW() + INTERVAL '3 days' + INTERVAL '4 hours', false, 'Training Room');
    
    RAISE NOTICE 'Calendar Events: 4 events created';

    -- ============================================
    -- 12. SAMPLE MESSAGES
    -- ============================================
    RAISE NOTICE 'Creating Sample Messages...';
    
    INSERT INTO app_private.messages (organization_id, sender_id, sender_type, recipient_id, recipient_type, subject, content, is_read) VALUES
        (v_demo_org_id, v_org_admin_id, 'organization', v_org_tech_mgr_id, 'organization', 'Welcome to the platform!', 'Hi Jane, welcome aboard! Please review the onboarding docs and let me know if you have questions.', true),
        (v_demo_org_id, v_org_tech_mgr_id, 'organization', v_org_admin_id, 'organization', 'Re: Welcome to the platform!', 'Thanks John! Everything looks great. I will start setting up the dev environment today.', true),
        (v_demo_org_id, v_org_support_mgr_id, 'organization', v_org_admin_id, 'organization', 'Support ticket volume update', 'FYI - we are seeing a 15% increase in ticket volume this week. May need to adjust staffing.', false);
    
    RAISE NOTICE 'Messages: 3 sample messages created';

    -- ============================================
    -- COMPLETION SUMMARY
    -- ============================================
    RAISE NOTICE '';
    RAISE NOTICE '╔══════════════════════════════════════════════════╗';
    RAISE NOTICE '║       SEED DATA INSERTION COMPLETE               ║';
    RAISE NOTICE '╠══════════════════════════════════════════════════╣';
    RAISE NOTICE '║                                                  ║';
    RAISE NOTICE '║  Platform Owner:                                 ║';
    RAISE NOTICE '║    andrew@applegate.solutions (God Mode)         ║';
    RAISE NOTICE '║    Password: NOT SET (use Settings tab)          ║';
    RAISE NOTICE '║                                                  ║';
    RAISE NOTICE '║  Platform Staff: 9 users (all @applegate.solutions)';
    RAISE NOTICE '║    Tech:    sarah / mike / emma                  ║';
    RAISE NOTICE '║    Support: lisa / james / amy                   ║';
    RAISE NOTICE '║    Sales:   david / rachel / tom                 ║';
    RAISE NOTICE '║    Password: password123 (all staff)             ║';
    RAISE NOTICE '║                                                  ║';
    RAISE NOTICE '║  Demo Org: Applegate Demo Corp                   ║';
    RAISE NOTICE '║    Admin:    john.ceo@acme.com                   ║';
    RAISE NOTICE '║    Managers: jane / mark / susan / diana         ║';
    RAISE NOTICE '║    Users:   alex / nina / chris                  ║';
    RAISE NOTICE '║    Password: password123 (all org users)         ║';
    RAISE NOTICE '║                                                  ║';
    RAISE NOTICE '║  Workspaces: 6 (Main, Admin, Accounting,        ║';
    RAISE NOTICE '║    Personnel, Data, Security)                    ║';
    RAISE NOTICE '║                                                  ║';
    RAISE NOTICE '║  Preset MiniApps: 5 in Main Workspace           ║';
    RAISE NOTICE '║    CON-##### Contacts                            ║';
    RAISE NOTICE '║    PRJ-#### Projects                             ║';
    RAISE NOTICE '║    INV-###### Inventory                          ║';
    RAISE NOTICE '║    INV-##### Invoices                            ║';
    RAISE NOTICE '║    TKT-##### Support Tickets                     ║';
    RAISE NOTICE '║                                                  ║';
    RAISE NOTICE '║  Access Control: Granular per-user per-app       ║';
    RAISE NOTICE '║  Audit Logs: 5 entries                           ║';
    RAISE NOTICE '║  Tasks: 5 sample tasks                           ║';
    RAISE NOTICE '║  Calendar: 4 events                              ║';
    RAISE NOTICE '║  Messages: 3 conversations                       ║';
    RAISE NOTICE '║                                                  ║';
    RAISE NOTICE '║  OLD PUBLIC TABLES: DROPPED (security fix)       ║';
    RAISE NOTICE '║  All data in app_private schema ONLY             ║';
    RAISE NOTICE '╚══════════════════════════════════════════════════╝';

END $$;
