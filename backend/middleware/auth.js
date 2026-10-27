/**
 * NutriGenius AI — Authentication Middleware
 * Enforces authenticated sessions via Supabase JWT or manages safe local demo mode.
 */

const { isConfigured, getUserFromToken } = require('../services/supabaseClient');

async function requireAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;

  // 1. If Supabase is fully configured with cloud credentials
  if (isConfigured()) {
    if (!token) {
      return res.status(401).json({
        error: 'Authentication required. Missing Bearer token.',
        status: 401
      });
    }

    const user = await getUserFromToken(token);
    if (!user) {
      return res.status(401).json({
        error: 'Invalid or expired authentication session. Please sign in again.',
        status: 401
      });
    }

    req.user = user;
    req.isDemoUser = false;
    return next();
  }

  // 2. If Supabase is unconfigured, support safe demo mode
  // Allows testing all features locally without blocking the evaluation
  if (token === 'demo-token' || req.headers['x-demo-user']) {
    req.user = {
      id: '00000000-0000-0000-0000-000000000001',
      email: 'demo.student@nutrigenius.local'
    };
    req.isDemoUser = true;
    return next();
  }

  // If unconfigured and no demo token provided
  req.user = {
    id: '00000000-0000-0000-0000-000000000001',
    email: 'guest@nutrigenius.local'
  };
  req.isDemoUser = true;
  next();
}

module.exports = requireAuth;
