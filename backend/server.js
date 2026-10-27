require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const errorHandler = require('./middleware/errorHandler');
const createRateLimiter = require('./middleware/rateLimiter');

// Import routes
const foodRoutes = require('./routes/foodRoutes');
const recipeRoutes = require('./routes/recipeRoutes');
const fruitRoutes = require('./routes/fruitRoutes');
const nutritionRoutes = require('./routes/nutritionRoutes');
const mealPlanRoutes = require('./routes/mealPlanRoutes');

const app = express();
const PORT = parseInt(process.env.PORT, 10) || 3000;

// Security & Parsing Middleware
app.disable('x-powered-by');

// CORS configuration: allow configured frontend origins, vercel domains, or development origins
const allowedOrigins = (process.env.FRONTEND_ORIGIN || 'http://localhost:5500,http://127.0.0.1:5500,http://localhost:3000,http://localhost:8080')
  .split(',')
  .map(o => o.trim());

app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Global Rate Limiter: 150 requests per minute
app.use(createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 150,
  message: 'Too many requests from this IP. Please wait a minute.'
}));

// Request Logger in Development
if (process.env.NODE_ENV !== 'test') {
  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      console.log(`[${req.method}] ${req.originalUrl} -> ${res.statusCode} (${duration}ms)`);
    });
    next();
  });
}

// Dedicated API Router
const apiRouter = express.Router();

const handleHealthCheck = (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'NutriGenius backend is working',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    environment: process.env.NODE_ENV || 'development'
  });
};

/**
 * Health Check Endpoints
 */
apiRouter.get('/health', handleHealthCheck);
app.get('/health', handleHealthCheck);
app.get('/api/health', handleHealthCheck);
app.get('/api', handleHealthCheck);

// Mount Subroutes on API Router
apiRouter.use('/food', foodRoutes);
apiRouter.use('/recipes', recipeRoutes);
apiRouter.use('/fruits', fruitRoutes);
apiRouter.use('/nutrition', nutritionRoutes);
apiRouter.use('/meal-plans', mealPlanRoutes);

// Mount API router on /api
app.use('/api', apiRouter);

// Support serverless rewrites where the /api prefix may be stripped
app.use((req, res, next) => {
  if (
    req.path.startsWith('/food') ||
    req.path.startsWith('/recipes') ||
    req.path.startsWith('/fruits') ||
    req.path.startsWith('/nutrition') ||
    req.path.startsWith('/meal-plans') ||
    req.path === '/health'
  ) {
    return apiRouter(req, res, next);
  }
  next();
});

// Serve static frontend files (CSS, JS, Assets, HTML)
app.use('/css', express.static(path.join(__dirname, '../frontend/css')));
app.use('/js', express.static(path.join(__dirname, '../frontend/js')));
app.use('/assets', express.static(path.join(__dirname, '../frontend/assets')));
app.use(express.static(path.join(__dirname, '../frontend')));

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/login.html'));
});

app.get('/register', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/register.html'));
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// 404 Route Handler
app.use((req, res) => {
  res.status(404).json({
    error: `Route not found: ${req.method} ${req.originalUrl}`,
    status: 404,
    timestamp: new Date().toISOString()
  });
});

// Centralized Error Handler
app.use(errorHandler);

// Start server if executed directly
if (require.main === module) {
  const server = app.listen(PORT, () => {
    console.log(`===============================================`);
    console.log(`  NutriGenius Backend Server Running!`);
    console.log(`  Local URL: http://localhost:${PORT}`);
    console.log(`  Health Check: http://localhost:${PORT}/api/health`);
    console.log(`  Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`===============================================`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`\n[NutriGenius Alert] Port ${PORT} is already in use by another process.`);
      console.error(`You can either stop the process using port ${PORT}, or change PORT in backend/.env to another port (e.g. PORT=3001).\n`);
    } else {
      console.error(`Server error:`, err);
    }
    process.exit(1);
  });
}

module.exports = app;
