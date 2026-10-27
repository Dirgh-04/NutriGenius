/**
 * NutriGenius AI — Supabase Database & Auth Service
 * Manages Supabase client initialization, token authentication, and data operations with RLS.
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

let supabaseClient = null;

function isConfigured() {
  return Boolean(SUPABASE_URL && (SUPABASE_ANON_KEY || SUPABASE_SERVICE_ROLE_KEY));
}

function getClient() {
  if (!isConfigured()) return null;

  if (!supabaseClient) {
    const key = SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY;
    supabaseClient = createClient(SUPABASE_URL, key, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
  }
  return supabaseClient;
}

/**
 * Validates a JWT Bearer token against Supabase Auth.
 * Returns the authenticated user object or null if invalid.
 */
async function getUserFromToken(token) {
  if (!token) return null;
  const client = getClient();
  if (!client) return null;

  try {
    const { data: { user }, error } = await client.auth.getUser(token);
    if (error || !user) return null;
    return user;
  } catch (err) {
    console.error('[Supabase Auth] Token verification failed:', err.message);
    return null;
  }
}

module.exports = {
  isConfigured,
  getClient,
  getUserFromToken
};
