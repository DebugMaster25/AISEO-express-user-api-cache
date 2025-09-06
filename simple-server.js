/**
 * Simple JavaScript version of the server for testing
 * This bypasses TypeScript compilation issues
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { createServer } = require('http');
const fs = require('fs');
const path = require('path');

const app = express();
const server = createServer(app);
const PORT = process.env.PORT || 3000;

// Data file path
const DATA_FILE = path.join(__dirname, 'data', 'users.json');

// Load mock user data from JSON file
let mockUsers = {};

function loadUsersData() {
  try {
    // Ensure data directory exists
    const dataDir = path.dirname(DATA_FILE);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    // Load data from file
    if (fs.existsSync(DATA_FILE)) {
      const data = fs.readFileSync(DATA_FILE, 'utf8');
      mockUsers = JSON.parse(data);
      console.log(`Loaded ${Object.keys(mockUsers).length} users from ${DATA_FILE}`);
    } else {
      // Initialize with default data if file doesn't exist
      mockUsers = {
        1: { id: 1, name: "John Doe", email: "john@example.com" },
        2: { id: 2, name: "Jane Smith", email: "jane@example.com" },
        3: { id: 3, name: "Alice Johnson", email: "alice@example.com" }
      };
      saveUsersData();
      console.log(`Created new data file with default users at ${DATA_FILE}`);
    }
  } catch (error) {
    console.error('Error loading users data:', error);
    // Fallback to default data
    mockUsers = {
      1: { id: 1, name: "John Doe", email: "john@example.com" },
      2: { id: 2, name: "Jane Smith", email: "jane@example.com" },
      3: { id: 3, name: "Alice Johnson", email: "alice@example.com" }
    };
  }
}

function saveUsersData() {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(mockUsers, null, 2), 'utf8');
    console.log(`Saved ${Object.keys(mockUsers).length} users to ${DATA_FILE}`);
  } catch (error) {
    console.error('Error saving users data:', error);
  }
}

// Load data on startup
loadUsersData();

// Simple in-memory cache
const cache = new Map();
const cacheStats = { hits: 0, misses: 0 };
const CACHE_TTL = 60000; // 60 seconds

// Rate limiting
const rateLimitStore = new Map();
const RATE_LIMIT = 10; // 10 requests per minute
const BURST_LIMIT = 5; // 5 requests in 10 seconds
const BURST_WINDOW = 10000; // 10 seconds

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.set('trust proxy', 1);

// Rate limiting middleware
app.use((req, res, next) => {
  const clientId = req.ip || 'unknown';
  const now = Date.now();
  
  let rateLimitInfo = rateLimitStore.get(clientId);
  
  if (!rateLimitInfo) {
    rateLimitInfo = {
      requests: 0,
      resetTime: now + 60000,
      burstRequests: 0,
      burstResetTime: now + BURST_WINDOW
    };
    rateLimitStore.set(clientId, rateLimitInfo);
  }

  // Reset counters if time windows have passed
  if (now >= rateLimitInfo.resetTime) {
    rateLimitInfo.requests = 0;
    rateLimitInfo.resetTime = now + 60000;
  }
  
  if (now >= rateLimitInfo.burstResetTime) {
    rateLimitInfo.burstRequests = 0;
    rateLimitInfo.burstResetTime = now + BURST_WINDOW;
  }

  // Check burst limit first
  if (rateLimitInfo.burstRequests >= BURST_LIMIT) {
    const retryAfter = Math.ceil((rateLimitInfo.burstResetTime - now) / 1000);
    return res.status(429).json({
      success: false,
      error: 'Too many requests in burst window. Please slow down.',
      retryAfter,
      limitType: 'burst'
    });
  }

  // Check minute limit
  if (rateLimitInfo.requests >= RATE_LIMIT) {
    const retryAfter = Math.ceil((rateLimitInfo.resetTime - now) / 1000);
    return res.status(429).json({
      success: false,
      error: 'Rate limit exceeded. Too many requests per minute.',
      retryAfter,
      limitType: 'minute'
    });
  }

  // Increment counters
  rateLimitInfo.requests++;
  rateLimitInfo.burstRequests++;

  // Add rate limit headers
  res.set({
    'X-RateLimit-Limit': RATE_LIMIT.toString(),
    'X-RateLimit-Remaining': Math.max(0, RATE_LIMIT - rateLimitInfo.requests).toString(),
    'X-RateLimit-Reset': new Date(rateLimitInfo.resetTime).toISOString(),
    'X-Burst-Limit': BURST_LIMIT.toString(),
    'X-Burst-Remaining': Math.max(0, BURST_LIMIT - rateLimitInfo.burstRequests).toString(),
    'X-Burst-Reset': new Date(rateLimitInfo.burstResetTime).toISOString()
  });

  next();
});

// Cache helper functions
function getFromCache(key) {
  const entry = cache.get(key);
  if (!entry) {
    cacheStats.misses++;
    return null;
  }
  
  if (Date.now() - entry.timestamp > entry.ttl) {
    cache.delete(key);
    cacheStats.misses++;
    return null;
  }
  
  cacheStats.hits++;
  return entry.data;
}

function setCache(key, value, ttl = CACHE_TTL) {
  cache.set(key, {
    data: value,
    timestamp: Date.now(),
    ttl: ttl
  });
}

// Simulate database call
function simulateDatabaseCall(userId) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const user = mockUsers[userId];
      if (!user) {
        reject(new Error(`User with ID ${userId} not found`));
      } else {
        resolve(user);
      }
    }, 200);
  });
}

// Routes
app.get('/', (req, res) => {
  res.json({
    message: 'User Data API with Advanced Caching',
    version: '1.0.0',
    endpoints: {
      users: '/api/users',
      cache: '/api/cache',
      health: '/api/health'
    }
  });
});

// GET /api/users/:id
app.get('/api/users/:id', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const userId = parseInt(req.params.id);
    
    if (isNaN(userId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid user ID. Must be a number.',
        timestamp: Date.now()
      });
    }

    // Check cache first
    const cacheKey = `user:${userId}`;
    const cachedUser = getFromCache(cacheKey);
    
    if (cachedUser) {
      console.log(`Cache hit for user ${userId}`);
      return res.json({
        success: true,
        data: cachedUser,
        timestamp: Date.now(),
        responseTime: Date.now() - startTime
      });
    }

    console.log(`Cache miss for user ${userId}, fetching from database`);
    
    // Simulate database call
    const user = await simulateDatabaseCall(userId);
    
    // Cache the result
    setCache(cacheKey, user);
    
    res.json({
      success: true,
      data: user,
      timestamp: Date.now(),
      responseTime: Date.now() - startTime
    });
    
  } catch (error) {
    console.error(`Error retrieving user ${req.params.id}:`, error.message);
    
    const response = {
      success: false,
      error: error.message,
      timestamp: Date.now(),
      responseTime: Date.now() - startTime
    };
    
    if (error.message.includes('not found')) {
      return res.status(404).json(response);
    }
    
    res.status(500).json(response);
  }
});

// POST /api/users
app.post('/api/users', (req, res) => {
  const startTime = Date.now();
  
  try {
    const { name, email } = req.body;
    
    if (!name || !email) {
      return res.status(400).json({
        success: false,
        error: 'Name and email are required',
        timestamp: Date.now()
      });
    }

    // Generate new user ID
    const newId = Math.max(...Object.keys(mockUsers).map(Number), 0) + 1;
    
    const newUser = {
      id: newId,
      name,
      email
    };
    
    // Add to mock data
    mockUsers[newId] = newUser;
    
    // Save data to file
    saveUsersData();
    
    // Cache the new user
    const cacheKey = `user:${newId}`;
    setCache(cacheKey, newUser);
    
    console.log(`Created new user: ${name} (ID: ${newId})`);
    
    res.status(201).json({
      success: true,
      data: newUser,
      timestamp: Date.now(),
      responseTime: Date.now() - startTime
    });
    
  } catch (error) {
    console.error('Error creating user:', error);
    
    res.status(500).json({
      success: false,
      error: 'Failed to create user',
      timestamp: Date.now(),
      responseTime: Date.now() - startTime
    });
  }
});

// GET /api/users
app.get('/api/users', (req, res) => {
  const startTime = Date.now();
  
  try {
    const users = Object.values(mockUsers);
    
    res.json({
      success: true,
      data: users,
      timestamp: Date.now(),
      responseTime: Date.now() - startTime
    });
    
  } catch (error) {
    console.error('Error retrieving all users:', error);
    
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve users',
      timestamp: Date.now(),
      responseTime: Date.now() - startTime
    });
  }
});

// GET /api/cache/status
app.get('/api/cache/status', (req, res) => {
  const startTime = Date.now();
  
  try {
    const totalRequests = cacheStats.hits + cacheStats.misses;
    const hitRate = totalRequests > 0 ? ((cacheStats.hits / totalRequests) * 100).toFixed(2) + '%' : '0%';
    
    res.json({
      success: true,
      data: {
        hits: cacheStats.hits,
        misses: cacheStats.misses,
        size: cache.size,
        hitRate: hitRate,
        keys: Array.from(cache.keys()).slice(0, 10),
        totalKeys: cache.size
      },
      timestamp: Date.now(),
      responseTime: Date.now() - startTime
    });
    
  } catch (error) {
    console.error('Error retrieving cache status:', error);
    
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve cache status',
      timestamp: Date.now(),
      responseTime: Date.now() - startTime
    });
  }
});

// DELETE /api/cache
app.delete('/api/cache', (req, res) => {
  const startTime = Date.now();
  
  try {
    const previousSize = cache.size;
    cache.clear();
    cacheStats.hits = 0;
    cacheStats.misses = 0;
    
    console.log(`Cache cleared. Previous size: ${previousSize}`);
    
    res.json({
      success: true,
      data: {
        message: 'Cache cleared successfully',
        previousSize: previousSize,
        clearedAt: new Date().toISOString()
      },
      timestamp: Date.now(),
      responseTime: Date.now() - startTime
    });
    
  } catch (error) {
    console.error('Error clearing cache:', error);
    
    res.status(500).json({
      success: false,
      error: 'Failed to clear cache',
      timestamp: Date.now(),
      responseTime: Date.now() - startTime
    });
  }
});

// GET /api/health
app.get('/api/health', (req, res) => {
  const startTime = Date.now();
  
  try {
    const memUsage = process.memoryUsage();
    
    res.json({
      success: true,
      data: {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: {
          used: Math.round(memUsage.heapUsed / 1024 / 1024),
          total: Math.round(memUsage.heapTotal / 1024 / 1024),
          external: Math.round(memUsage.external / 1024 / 1024)
        },
        cache: {
          size: cache.size,
          hits: cacheStats.hits,
          misses: cacheStats.misses
        }
      },
      timestamp: Date.now(),
      responseTime: Date.now() - startTime
    });
    
  } catch (error) {
    console.error('Health check failed:', error);
    
    res.status(503).json({
      success: false,
      error: 'Health check failed',
      timestamp: Date.now(),
      responseTime: Date.now() - startTime
    });
  }
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
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    timestamp: Date.now()
  });
});

// Background cleanup
setInterval(() => {
  const now = Date.now();
  let cleanedCount = 0;
  
  for (const [key, entry] of cache.entries()) {
    if (now - entry.timestamp > entry.ttl) {
      cache.delete(key);
      cleanedCount++;
    }
  }
  
  if (cleanedCount > 0) {
    console.log(`Background cache cleanup: removed ${cleanedCount} expired entries`);
  }
}, 30000);

// Start server
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log('Available endpoints:');
  console.log('  GET  /api/users/:id - Get user by ID');
  console.log('  POST /api/users - Create new user');
  console.log('  GET  /api/users - Get all users');
  console.log('  GET  /api/cache/status - Get cache statistics');
  console.log('  DELETE /api/cache - Clear cache');
  console.log('  GET  /api/health - Health check');
});

// Graceful shutdown
function gracefulShutdown(signal) {
  console.log(`Received ${signal}. Starting graceful shutdown...`);
  
  // Save data before shutting down
  saveUsersData();
  
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
