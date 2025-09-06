import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createServer } from 'http';
import { LRUCache } from './cache/lru-cache';
import { AdvancedRateLimiter } from './middleware/rateLimiter';
import { AsyncProcessor } from './services/asyncProcessor';
import { 
  updateCacheMetrics, 
  updateAsyncMetrics,
  performanceTracker 
} from './services/monitoring';
import logger from './utils/logger';

// Import routes
import usersRouter from './routes/users';
import cacheRouter, { setUserCache } from './routes/cache';
import healthRouter from './routes/health';
import metricsRouter from './routes/metrics';

const app = express();
const server = createServer(app);
const PORT = process.env.PORT || 3000;

// Initialize services
const userCache = new LRUCache(100, 60000); // 100 max entries, 60s TTL
const rateLimiter = new AdvancedRateLimiter();
const asyncProcessor = new AsyncProcessor();

// Set cache reference for cache routes
setUserCache(userCache);

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Trust proxy for accurate IP addresses in rate limiting
app.set('trust proxy', 1);

// Rate limiting middleware
app.use(rateLimiter.middleware());

// Request logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path} - ${req.ip}`);
  next();
});

// Routes
app.use('/api/users', usersRouter);
app.use('/api/cache', cacheRouter);
app.use('/api/health', healthRouter);
app.use('/api/metrics', metricsRouter);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'User Data API with Advanced Caching',
    version: '1.0.0',
    endpoints: {
      users: '/api/users',
      cache: '/api/cache',
      health: '/api/health',
      metrics: '/api/metrics'
    },
    documentation: 'See README.md for detailed API documentation'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    timestamp: Date.now()
  });
});

// Error handling middleware
app.use((error: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error:', error);
  
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    timestamp: Date.now()
  });
});

// Background tasks
const startBackgroundTasks = () => {
  // Cache cleanup every 30 seconds
  setInterval(() => {
    const cleanedCount = userCache.cleanup();
    if (cleanedCount > 0) {
      logger.info(`Background cache cleanup: removed ${cleanedCount} expired entries`);
    }
    
    // Update cache metrics
    const stats = userCache.getStats();
    updateCacheMetrics(0, 0, stats.size);
  }, 30000);

  // Async processor cleanup every 60 seconds
  setInterval(() => {
    asyncProcessor.cleanup();
    
    // Update async metrics
    const stats = asyncProcessor.getStats();
    updateAsyncMetrics(stats.queueLength, stats.pendingRequests);
  }, 60000);

  // Performance metrics logging every 5 minutes
  setInterval(() => {
    const stats = performanceTracker.getStats();
    logger.info('Performance metrics:', {
      totalRequests: stats.totalRequests,
      errorRate: stats.errorRate.toFixed(2) + '%',
      averageResponseTime: Math.round(stats.averageResponseTime) + 'ms',
      p95ResponseTime: Math.round(stats.p95ResponseTime) + 'ms',
      p99ResponseTime: Math.round(stats.p99ResponseTime) + 'ms'
    });
  }, 300000);
};

// Graceful shutdown
const gracefulShutdown = (signal: string) => {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);
  
  server.close(() => {
    logger.info('HTTP server closed');
    
    // Cleanup resources
    rateLimiter.destroy();
    userCache.clear();
    
    logger.info('Graceful shutdown completed');
    process.exit(0);
  });
  
  // Force close after 10 seconds
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
};

// Start server
const startServer = () => {
  server.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`);
    logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
    logger.info('Available endpoints:');
    logger.info('  GET  /api/users/:id - Get user by ID');
    logger.info('  POST /api/users - Create new user');
    logger.info('  GET  /api/users - Get all users');
    logger.info('  GET  /api/cache/status - Get cache statistics');
    logger.info('  DELETE /api/cache - Clear cache');
    logger.info('  GET  /api/health - Health check');
    logger.info('  GET  /api/metrics - Prometheus metrics');
    
    // Start background tasks
    startBackgroundTasks();
  });
};

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Start the server
startServer();

export default app;
