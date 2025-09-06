import { Router, Request, Response } from 'express';
import { ApiResponse } from '../types';
import { performanceTracker, healthCheck } from '../services/monitoring';
import logger from '../utils/logger';

const router = Router();

// GET /health - Health check endpoint
router.get('/', (req: Request, res: Response) => {
  const startTime = Date.now();
  
  try {
    const stats = performanceTracker.getStats();
    
    const healthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        external: Math.round(process.memoryUsage().external / 1024 / 1024)
      },
      performance: {
        totalRequests: stats.totalRequests,
        errorRate: stats.errorRate.toFixed(2) + '%',
        averageResponseTime: Math.round(stats.averageResponseTime) + 'ms',
        p95ResponseTime: Math.round(stats.p95ResponseTime) + 'ms',
        p99ResponseTime: Math.round(stats.p99ResponseTime) + 'ms'
      }
    };
    
    // Set health check metric
    healthCheck.set(1);
    
    const response: ApiResponse<typeof healthStatus> = {
      success: true,
      data: healthStatus,
      timestamp: Date.now(),
      responseTime: Date.now() - startTime
    };
    
    res.json(response);
    
  } catch (error) {
    logger.error('Health check failed:', error);
    
    // Set health check metric to unhealthy
    healthCheck.set(0);
    
    const response: ApiResponse = {
      success: false,
      error: 'Health check failed',
      timestamp: Date.now(),
      responseTime: Date.now() - startTime
    };
    
    res.status(503).json(response);
  }
});

// GET /health/ready - Readiness check
router.get('/ready', (req: Request, res: Response) => {
  const response: ApiResponse = {
    success: true,
    data: {
      status: 'ready',
      timestamp: new Date().toISOString()
    },
    timestamp: Date.now()
  };
  
  res.json(response);
});

// GET /health/live - Liveness check
router.get('/live', (req: Request, res: Response) => {
  const response: ApiResponse = {
    success: true,
    data: {
      status: 'alive',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    },
    timestamp: Date.now()
  };
  
  res.json(response);
});

export default router;
