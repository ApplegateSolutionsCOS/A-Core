/**
 * RPC-based authentication - bypasses edge functions entirely.
 * 
 * Uses the public schema RPC functions (SECURITY DEFINER) to access
 * app_private.platform_users table. These functions are defined in
 * docs/CREATE_TABLES.sql and are callable via supabase.rpc().
 * 
 * This is the PRIMARY method for set_password and a FALLBACK for verify_password
 * when the secure-auth edge function is unavailable.
 */

import { supabase } from '@/lib/supabase';
import { hashPassword, verifyPassword, isNewHashFormat } from '@/lib/passwordHash';

interface SetPasswordResult {
  success: boolean;
  error?: string;
  user?: any;
}

interface VerifyPasswordResult {
  success: boolean;
  error?: string;
  user?: any;
  requiresPasswordSetup?: boolean;
}

/**
 * Set a user's password via RPC (bypasses edge function).
 * 
 * Flow:
 * 1. Hash the password client-side using our pure-JS hash
 * 2. Call set_platform_user_password RPC to store the hash
 * 3. Return the user object on success
 */
export async function setPasswordViaRPC(
  email: string, 
  password: string, 
  fullName: string, 
  companyName: string
): Promise<SetPasswordResult> {
  try {
    console.log('[Signup] Attempting to create user:', email);
    
    const { data, error } = await supabase.auth.signUp({
      email: email.toLowerCase().trim(),
      password: password,
      options: {
        data: {
          full_name: fullName,
          company_name: companyName,
        }
      }
    });

    // 1. Check for Supabase Auth errors FIRST
    if (error) {
      console.error('[Signup] Supabase Error:', error.message);
      return { success: false, error: error.message };
    }

    // 2. Safely check if the user object actually exists
    if (!data || !data.user) {
      console.warn('[Signup] No user object returned. Trigger may have failed or email confirmation is required.');
      return { 
        success: false, 
        error: "Signup failed to return a user profile. Check database constraints." 
      };
    }

    // 3. Success! Safe to read the ID now.
    console.log('[Signup] User created successfully! ID:', data.user.id);
    return { success: true, user: data.user };

  } catch (err: any) {
    console.error('[Signup] Code Exception:', err);
    return { success: false, error: "An unexpected error occurred during signup." };
  }
}

/**
 * Verify a user's password via RPC (bypasses edge function).
 * 
 * Flow:
 * 1. Call verify_platform_user_password RPC to get stored hash
 * 2. Compare with client-side hash
 * 3. Return user object on success
 */
export async function verifyPasswordViaRPC(email: string, password: string): Promise<VerifyPasswordResult> {
  try {
    console.log('[rpcAuth] Transitioning to Native Auth for:', email);
    
    // 1. CALL NATIVE AUTH (This logs the user in and generates the JWT for RLS)
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.toLowerCase().trim(),
      password: password,
    });

    if (error) {
      console.error('[rpcAuth] Native Auth error:', error.message);
      return { success: false, error: error.message };
    }

    // 2. FETCH THE USER DATA FROM YOUR TABLE
    // Now that we are logged in, RLS will allow us to see our own row!
    const { data: userProfile, error: profileError } = await supabase
      .from('platform_users')
      .select('*')
      .eq('id', data.user.id)
      .single();

    if (profileError) {
      return { success: false, error: "Profile not found in platform_users" };
    }

    return { 
      success: true, 
      user: userProfile 
    };

  } catch (err: any) {
    console.error('[rpcAuth] error:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Get a platform user by email via RPC.
 */
export async function getUserByEmailViaRPC(email: string): Promise<any | null> {
  try {
    const { data, error } = await supabase.rpc('get_platform_user_by_email', {
      p_email: email.toLowerCase().trim(),
    });

    if (error || !data) return null;
    
    const user = typeof data === 'string' ? JSON.parse(data) : data;
    if (user) {
      delete user.password_hash;
      delete user.totp_secret;
    }
    return user;
  } catch {
    return null;
  }
}
