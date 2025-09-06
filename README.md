# User Data API with Advanced Caching, Rate Limiting, and Asynchronous Processing

A highly efficient Express.js API built with TypeScript that serves user data with advanced caching strategies, sophisticated rate limiting, and asynchronous processing to handle high traffic and improve performance.

## Features

### 🚀 Core Features
- **Advanced In-Memory LRU Cache** with TTL (Time To Live) and automatic cleanup
- **Sophisticated Rate Limiting** with burst capacity handling
- **Asynchronous Processing** with request queuing and concurrent request handling
- **Performance Monitoring** with Prometheus metrics and detailed logging
- **TypeScript** for type safety and better maintainability

### 📦 Two Versions Available
1. **Full TypeScript Version** (`src/` directory) - Complete implementation with all advanced features
2. **Simple JavaScript Version** (`simple-server.js`) - Simplified version for quick testing and deployment

### 📊 Caching Strategy
- **LRU (Least Recently Used)** cache implementation
- **60-second TTL** for cached entries
- **Automatic background cleanup** of expired entries
- **Cache statistics** tracking (hits, misses, size, response times)
- **Concurrent request handling** - multiple requests for the same data wait for the first request

### 🛡️ Rate Limiting
- **10 requests per minute** with burst capacity of **5 requests in 10 seconds**
- **Per-IP rate limiting** with automatic cleanup
- **Detailed rate limit headers** in responses
- **Graceful error handling** with retry-after information

### ⚡ Asynchronous Processing
- **Request queuing** for database simulation
- **Concurrent request deduplication** - multiple requests for the same user ID are batched
- **200ms simulated database delay** with proper async handling
- **Background cleanup** of expired pending requests

### 📈 Monitoring & Observability
- **Prometheus metrics** for monitoring and alerting
- **Performance tracking** with P95/P99 response times
- **Health check endpoints** for load balancer integration
- **Structured logging** with Winston
- **Cache performance metrics**

## Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

#### Option 1: TypeScript Version (Recommended)

1. **Clone the repository**
   ```bash
   git clone https://github.com/DebugMaster25/AISEO-express-user-api-cache.git
   cd AISEO-express-user-api-cache
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Build the project**
   ```bash
   npm run build
   ```

4. **Start the server**
   ```bash
   npm start
   ```

   Or for development with hot reload:
   ```bash
   npm run dev
   ```

#### Option 2: Simple JavaScript Version (If TypeScript issues)

If you encounter PowerShell execution policy issues or TypeScript compilation problems, use the simple JavaScript version:

1. **Use the simple version**
   ```bash
   # Copy the simple package.json
   copy package-simple.json package.json
   
   # Install dependencies
   npm install
   
   # Start the simple server
   node simple-server.js
   ```

2. **Or use the batch file**
   ```bash
   start-simple.bat
   ```

#### PowerShell Execution Policy Issues

If you encounter PowerShell execution policy errors, you can:

1. **Change execution policy temporarily**:
   ```powershell
   Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
   ```

2. **Use Command Prompt instead of PowerShell**:
   ```cmd
   cmd
   npm install
   npm run build
   npm start
   ```

3. **Use the simple JavaScript version** (no compilation needed)

The server will start on `http://localhost:3000`

## API Endpoints

### User Management

#### GET /api/users/:id
Retrieve user data by ID with caching.

**Parameters:**
- `id` (number): User ID

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com"
  },
  "timestamp": 1703123456789,
  "responseTime": 45
}
```

**Error Responses:**
- `400` - Invalid user ID
- `404` - User not found
- `429` - Rate limit exceeded

#### POST /api/users
Create a new user.

**Request Body:**
```json
{
  "name": "Jane Doe",
  "email": "jane@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 4,
    "name": "Jane Doe",
    "email": "jane@example.com"
  },
  "timestamp": 1703123456789,
  "responseTime": 12
}
```

#### GET /api/users
Get all users (for testing).

### Cache Management

#### GET /api/cache/status
Get cache statistics and performance metrics.

**Response:**
```json
{
  "success": true,
  "data": {
    "hits": 150,
    "misses": 25,
    "size": 3,
    "averageResponseTime": 45.2,
    "keys": ["user:1", "user:2", "user:3"],
    "totalKeys": 3,
    "cacheHitRate": "85.71%"
  },
  "timestamp": 1703123456789,
  "responseTime": 2
}
```

#### DELETE /api/cache
Clear the entire cache.

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Cache cleared successfully",
    "previousSize": 3,
    "clearedAt": "2023-12-21T10:30:45.123Z"
  },
  "timestamp": 1703123456789,
  "responseTime": 5
}
```

#### POST /api/cache/cleanup
Manually trigger cache cleanup of expired entries.

### Health & Monitoring

#### GET /api/health
Comprehensive health check with performance metrics.

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2023-12-21T10:30:45.123Z",
    "uptime": 3600,
    "memory": {
      "used": 45,
      "total": 128,
      "external": 12
    },
    "performance": {
      "totalRequests": 1000,
      "errorRate": "2.5%",
      "averageResponseTime": "45ms",
      "p95ResponseTime": "120ms",
      "p99ResponseTime": "250ms"
    }
  },
  "timestamp": 1703123456789,
  "responseTime": 3
}
```

#### GET /api/metrics
Prometheus metrics endpoint for monitoring.

#### GET /api/health/ready
Readiness check for load balancers.

#### GET /api/health/live
Liveness check for load balancers.

## Testing the API

### Using curl

1. **Get a user (first request - cache miss)**
   ```bash
   curl http://localhost:3000/api/users/1
   ```

2. **Get the same user (second request - cache hit)**
   ```bash
   curl http://localhost:3000/api/users/1
   ```

3. **Create a new user**
   ```bash
   curl -X POST http://localhost:3000/api/users \
     -H "Content-Type: application/json" \
     -d '{"name": "Test User", "email": "test@example.com"}'
   ```

4. **Check cache status**
   ```bash
   curl http://localhost:3000/api/cache/status
   ```

### Using Postman

Import the following collection or create requests manually:

1. **GET** `http://localhost:3000/api/users/1`
2. **POST** `http://localhost:3000/api/users` with JSON body
3. **GET** `http://localhost:3000/api/cache/status`
4. **DELETE** `http://localhost:3000/api/cache`

### Load Testing

Test the rate limiting and concurrent request handling:

```bash
# Test rate limiting (run multiple times quickly)
for i in {1..15}; do curl http://localhost:3000/api/users/1 & done

# Test concurrent requests for same user
for i in {1..10}; do curl http://localhost:3000/api/users/1 & done
```

## Architecture & Implementation Details

### Caching Strategy
- **LRU Cache**: Implements Least Recently Used eviction policy
- **TTL Support**: Each cache entry has a configurable time-to-live
- **Background Cleanup**: Automatic removal of expired entries every 30 seconds
- **Concurrent Safety**: Multiple requests for the same data are deduplicated

### Rate Limiting Implementation
- **Two-tier limiting**: Per-minute limit (10 requests) + burst limit (5 requests in 10 seconds)
- **Per-IP tracking**: Each client IP has independent rate limits
- **Automatic cleanup**: Expired rate limit entries are cleaned up every minute
- **Detailed headers**: Response includes rate limit status and retry information

### Asynchronous Processing
- **Request Queuing**: Uses a simple array-based queue for processing
- **Deduplication**: Multiple requests for the same user ID are batched together
- **Background Cleanup**: Expired pending requests are cleaned up every 60 seconds
- **Non-blocking**: API remains responsive during database simulation

### Performance Optimizations
- **Concurrent Request Handling**: Multiple requests for the same data wait for the first request
- **Efficient Memory Usage**: LRU cache with configurable size limits
- **Background Tasks**: Cleanup operations run in the background
- **Metrics Collection**: Performance data is collected and exposed via Prometheus

## Monitoring & Observability

### Prometheus Metrics
- `http_request_duration_seconds` - Request duration histogram
- `http_requests_total` - Total request counter
- `cache_hits_total` - Cache hit counter
- `cache_misses_total` - Cache miss counter
- `cache_size` - Current cache size gauge
- `rate_limit_hits_total` - Rate limit hit counter
- `active_connections` - Active connection gauge

### Logging
- **Structured logging** with Winston
- **Request/response logging** with timing information
- **Error logging** with stack traces
- **Performance metrics** logged every 5 minutes

### Health Checks
- **Comprehensive health endpoint** with memory and performance data
- **Readiness check** for load balancer integration
- **Liveness check** for container orchestration

## Configuration

### Environment Variables
- `PORT` - Server port (default: 3000)
- `NODE_ENV` - Environment (development/production)

### Cache Configuration
- **Max Size**: 100 entries (configurable in `src/server.ts`)
- **TTL**: 60 seconds (configurable in `src/server.ts`)

### Rate Limiting Configuration
- **Per-minute limit**: 10 requests (configurable in `src/middleware/rateLimiter.ts`)
- **Burst capacity**: 5 requests in 10 seconds (configurable)

## Development

### Project Structure
```
src/
├── cache/
│   └── lru-cache.ts          # LRU cache implementation
├── middleware/
│   └── rateLimiter.ts        # Rate limiting middleware
├── routes/
│   ├── users.ts              # User API endpoints
│   ├── cache.ts              # Cache management endpoints
│   ├── health.ts             # Health check endpoints
│   └── metrics.ts            # Prometheus metrics endpoint
├── services/
│   ├── asyncProcessor.ts     # Asynchronous processing service
│   └── monitoring.ts         # Monitoring and metrics
├── types/
│   └── index.ts              # TypeScript type definitions
├── utils/
│   └── logger.ts             # Logging configuration
└── server.ts                 # Main server file
```

### Scripts
- `npm run build` - Build TypeScript to JavaScript
- `npm start` - Start production server
- `npm run dev` - Start development server with hot reload
- `npm test` - Run tests (when implemented)

## Performance Characteristics

### Expected Performance
- **Cache Hit Response**: < 10ms
- **Cache Miss Response**: ~200ms (simulated database delay)
- **Concurrent Request Handling**: Efficient deduplication
- **Memory Usage**: Low with LRU eviction
- **Rate Limiting**: Minimal overhead

### Scalability Considerations
- **In-memory cache**: Limited by available RAM
- **Rate limiting**: Per-IP tracking may need Redis for distributed systems
- **Async processing**: Queue-based approach scales well
- **Monitoring**: Prometheus metrics support horizontal scaling

## Error Handling

### Error Types
- **Validation Errors**: 400 Bad Request
- **Not Found**: 404 Not Found
- **Rate Limiting**: 429 Too Many Requests
- **Server Errors**: 500 Internal Server Error
- **Service Unavailable**: 503 Service Unavailable

### Error Response Format
```json
{
  "success": false,
  "error": "Error message",
  "timestamp": 1703123456789,
  "responseTime": 45
}
```

## License

MIT License - see LICENSE file for details.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## Support

For questions or issues, please create an issue in the GitHub repository.
