/**
 * Centralized Error Handling Middleware for NutriGenius AI
 */
function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || res.statusCode >= 400 ? res.statusCode : 500;
  const isProduction = process.env.NODE_ENV === 'production';

  // Log error details for server diagnostics (without leaking secrets)
  console.error(`[Error] ${req.method} ${req.originalUrl}:`, err.message || err);

  res.status(statusCode).json({
    error: err.message || 'An unexpected server error occurred',
    status: statusCode,
    path: req.originalUrl,
    timestamp: new Date().toISOString(),
    ...(isProduction ? {} : { details: err.details, stack: err.stack })
  });
}

module.exports = errorHandler;
