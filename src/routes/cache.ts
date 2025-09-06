import { Router, Request, Response } from 'express';
import { ApiResponse, CacheStats } from '../types';
import { LRUCache } from '../cache/lru-cache';
import { updateCacheMetrics } from '../services/monitoring';
import logger from '../utils/logger';

const router = Router();

// This will be set by the main server
let userCache: LRUCache<any> | null = null;

export const setUserCache = (cache: LRUCache<any>) => {
  userCache = cache;
};

// DELETE /cache - Clear entire cache
router.delete('/', (req: Request, res: Response) => {
  const startTime = Date.now();
  
  try {
    if (!userCache) {
      const response: ApiResponse = {
        success: false,
        error: 'Cache not initialized',
        timestamp: Date.now()
      };
      return res.status(500).json(response);
    }

    const statsBefore = userCache.getStats();
    userCache.clear();
    
    logger.info(`Cache cleared. Previous size: ${statsBefore.size}`);
    
    const response: ApiResponse = {
      success: true,
      data: {
        message: 'Cache cleared successfully',
        previousSize: statsBefore.size,
        clearedAt: new Date().toISOString()
      },
      timestamp: Date.now(),
      responseTime: Date.now() - startTime
    };
    
    // Update metrics
    updateCacheMetrics(0, 0, 0);
    
    res.json(response);
    
  } catch (error) {
    logger.error('Error clearing cache:', error);
    
    const response: ApiResponse = {
      success: false,
      error: 'Failed to clear cache',
      timestamp: Date.now(),
      responseTime: Date.now() - startTime
    };
    
    res.status(500).json(response);
  }
});

// GET /cache-status - Get cache statistics
router.get('/status', (req: Request, res: Response) => {
  const startTime = Date.now();
  
  try {
    if (!userCache) {
      const response: ApiResponse = {
        success: false,
        error: 'Cache not initialized',
        timestamp: Date.now()
      };
      return res.status(500).json(response);
    }

    const stats = userCache.getStats();
    const keys = userCache.keys();
    
    const cacheStatus = {
      ...stats,
      keys: keys.slice(0, 10), // Show first 10 keys for debugging
      totalKeys: keys.length,
      cacheHitRate: stats.hits + stats.misses > 0 
        ? ((stats.hits / (stats.hits + stats.misses)) * 100).toFixed(2) + '%'
        : '0%'
    };
    
    const response: ApiResponse<typeof cacheStatus> = {
      success: true,
      data: cacheStatus,
      timestamp: Date.now(),
      responseTime: Date.now() - startTime
    };
    
    res.json(response);
    
  } catch (error) {
    logger.error('Error retrieving cache status:', error);
    
    const response: ApiResponse = {
      success: false,
      error: 'Failed to retrieve cache status',
      timestamp: Date.now(),
      responseTime: Date.now() - startTime
    };
    
    res.status(500).json(response);
  }
});

// POST /cache/cleanup - Manual cache cleanup
router.post('/cleanup', (req: Request, res: Response) => {
  const startTime = Date.now();
  
  try {
    if (!userCache) {
      const response: ApiResponse = {
        success: false,
        error: 'Cache not initialized',
        timestamp: Date.now()
      };
      return res.status(500).json(response);
    }

    const statsBefore = userCache.getStats();
    const cleanedCount = userCache.cleanup();
    const statsAfter = userCache.getStats();
    
    logger.info(`Manual cache cleanup completed. Cleaned ${cleanedCount} entries`);
    
    const response: ApiResponse = {
      success: true,
      data: {
        message: 'Cache cleanup completed',
        entriesCleaned: cleanedCount,
        sizeBefore: statsBefore.size,
        sizeAfter: statsAfter.size,
        cleanedAt: new Date().toISOString()
      },
      timestamp: Date.now(),
      responseTime: Date.now() - startTime
    };
    
    // Update metrics
    updateCacheMetrics(0, 0, statsAfter.size);
    
    res.json(response);
    
  } catch (error) {
    logger.error('Error during cache cleanup:', error);
    
    const response: ApiResponse = {
      success: false,
      error: 'Failed to cleanup cache',
      timestamp: Date.now(),
      responseTime: Date.now() - startTime
    };
    
    res.status(500).json(response);
  }
});

export default router;
