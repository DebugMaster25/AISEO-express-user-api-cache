import { Router, Request, Response } from 'express';
import { User, ApiResponse } from '../types';
import { LRUCache } from '../cache/lru-cache';
import { AsyncProcessor } from '../services/asyncProcessor';
import { 
  httpRequestDuration, 
  httpRequestTotal, 
  performanceTracker,
  updateCacheMetrics 
} from '../services/monitoring';
import logger from '../utils/logger';

const router = Router();
const userCache = new LRUCache<User>(100, 60000); // 100 max entries, 60s TTL
const asyncProcessor = new AsyncProcessor();

// Middleware to track request metrics
const trackRequest = (req: Request, res: Response, next: Function) => {
  const startTime = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const durationSeconds = duration / 1000;
    
    httpRequestDuration
      .labels(req.method, req.route?.path || req.path, res.statusCode.toString())
      .observe(durationSeconds);
    
    httpRequestTotal
      .labels(req.method, req.route?.path || req.path, res.statusCode.toString())
      .inc();
    
    performanceTracker.recordRequest(duration, res.statusCode >= 400);
  });
  
  next();
};

router.use(trackRequest);

// GET /users/:id - Retrieve user by ID
router.get('/:id', async (req: Request, res: Response) => {
  const startTime = Date.now();
  
  try {
    const userId = parseInt(req.params.id);
    
    if (isNaN(userId)) {
      const response: ApiResponse = {
        success: false,
        error: 'Invalid user ID. Must be a number.',
        timestamp: Date.now()
      };
      return res.status(400).json(response);
    }

    // Check cache first
    const cacheKey = `user:${userId}`;
    const cachedUser = userCache.get(cacheKey);
    
    if (cachedUser) {
      logger.info(`Cache hit for user ${userId}`);
      const response: ApiResponse<User> = {
        success: true,
        data: cachedUser,
        timestamp: Date.now(),
        responseTime: Date.now() - startTime
      };
      
      // Update cache metrics
      const stats = userCache.getStats();
      updateCacheMetrics(1, 0, stats.size);
      
      return res.json(response);
    }

    logger.info(`Cache miss for user ${userId}, processing async request`);
    
    // Process asynchronously
    const user = await asyncProcessor.processUserRequest(userId);
    
    // Cache the result
    userCache.set(cacheKey, user);
    
    const response: ApiResponse<User> = {
      success: true,
      data: user,
      timestamp: Date.now(),
      responseTime: Date.now() - startTime
    };
    
    // Update cache metrics
    const stats = userCache.getStats();
    updateCacheMetrics(0, 1, stats.size);
    
    res.json(response);
    
  } catch (error) {
    logger.error(`Error retrieving user ${req.params.id}:`, error);
    
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
      timestamp: Date.now(),
      responseTime: Date.now() - startTime
    };
    
    if (error instanceof Error && error.message.includes('not found')) {
      return res.status(404).json(response);
    }
    
    res.status(500).json(response);
  }
});

// POST /users - Create new user
router.post('/', async (req: Request, res: Response) => {
  const startTime = Date.now();
  
  try {
    const { name, email } = req.body;
    
    if (!name || !email) {
      const response: ApiResponse = {
        success: false,
        error: 'Name and email are required',
        timestamp: Date.now()
      };
      return res.status(400).json(response);
    }

    // Generate new user ID
    const existingUsers = asyncProcessor.getAllUsers();
    const newId = Math.max(...existingUsers.map(u => u.id), 0) + 1;
    
    const newUser: User = {
      id: newId,
      name,
      email
    };
    
    // Add to async processor
    asyncProcessor.addUser(newUser);
    
    // Cache the new user
    const cacheKey = `user:${newId}`;
    userCache.set(cacheKey, newUser);
    
    const response: ApiResponse<User> = {
      success: true,
      data: newUser,
      timestamp: Date.now(),
      responseTime: Date.now() - startTime
    };
    
    logger.info(`Created new user: ${name} (ID: ${newId})`);
    res.status(201).json(response);
    
  } catch (error) {
    logger.error('Error creating user:', error);
    
    const response: ApiResponse = {
      success: false,
      error: 'Failed to create user',
      timestamp: Date.now(),
      responseTime: Date.now() - startTime
    };
    
    res.status(500).json(response);
  }
});

// GET /users - Get all users (for testing)
router.get('/', async (req: Request, res: Response) => {
  const startTime = Date.now();
  
  try {
    const users = asyncProcessor.getAllUsers();
    
    const response: ApiResponse<User[]> = {
      success: true,
      data: users,
      timestamp: Date.now(),
      responseTime: Date.now() - startTime
    };
    
    res.json(response);
    
  } catch (error) {
    logger.error('Error retrieving all users:', error);
    
    const response: ApiResponse = {
      success: false,
      error: 'Failed to retrieve users',
      timestamp: Date.now(),
      responseTime: Date.now() - startTime
    };
    
    res.status(500).json(response);
  }
});

export default router;
