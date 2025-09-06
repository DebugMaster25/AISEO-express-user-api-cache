#!/usr/bin/env node

/**
 * Simple API testing script
 * Run with: node test-api.js
 */

const http = require('http');

const BASE_URL = 'http://localhost:3000';
const API_BASE = `${BASE_URL}/api`;

// Helper function to make HTTP requests
function makeRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, API_BASE);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      }
    };

    if (data) {
      const jsonData = JSON.stringify(data);
      options.headers['Content-Length'] = Buffer.byteLength(jsonData);
    }

    const req = http.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsed = JSON.parse(responseData);
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: parsed
          });
        } catch (error) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: responseData
          });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

// Test functions
async function testUserRetrieval() {
  console.log('\n🧪 Testing User Retrieval...');
  
  try {
    // Test valid user
    console.log('  📝 Getting user 1 (first request - should be cache miss)...');
    const start1 = Date.now();
    const response1 = await makeRequest('GET', '/users/1');
    const time1 = Date.now() - start1;
    
    console.log(`  ✅ Status: ${response1.statusCode}`);
    console.log(`  ⏱️  Response time: ${time1}ms`);
    console.log(`  📊 Data:`, response1.data.data);
    
    // Test same user again (should be cache hit)
    console.log('\n  📝 Getting user 1 (second request - should be cache hit)...');
    const start2 = Date.now();
    const response2 = await makeRequest('GET', '/users/1');
    const time2 = Date.now() - start2;
    
    console.log(`  ✅ Status: ${response2.statusCode}`);
    console.log(`  ⏱️  Response time: ${time2}ms`);
    console.log(`  📊 Data:`, response2.data.data);
    
    // Test invalid user
    console.log('\n  📝 Getting user 999 (should return 404)...');
    const response3 = await makeRequest('GET', '/users/999');
    console.log(`  ✅ Status: ${response3.statusCode}`);
    console.log(`  📊 Error:`, response3.data.error);
    
  } catch (error) {
    console.error('  ❌ Error:', error.message);
  }
}

async function testUserCreation() {
  console.log('\n🧪 Testing User Creation...');
  
  try {
    const newUser = {
      name: 'Test User',
      email: 'test@example.com'
    };
    
    console.log('  📝 Creating new user...');
    const response = await makeRequest('POST', '/users', newUser);
    
    console.log(`  ✅ Status: ${response.statusCode}`);
    console.log(`  📊 Created user:`, response.data.data);
    
  } catch (error) {
    console.error('  ❌ Error:', error.message);
  }
}

async function testCacheManagement() {
  console.log('\n🧪 Testing Cache Management...');
  
  try {
    // Get cache status
    console.log('  📝 Getting cache status...');
    const statusResponse = await makeRequest('GET', '/cache/status');
    console.log(`  ✅ Status: ${statusResponse.statusCode}`);
    console.log(`  📊 Cache stats:`, {
      hits: statusResponse.data.data.hits,
      misses: statusResponse.data.data.misses,
      size: statusResponse.data.data.size,
      hitRate: statusResponse.data.data.cacheHitRate
    });
    
    // Clear cache
    console.log('\n  📝 Clearing cache...');
    const clearResponse = await makeRequest('DELETE', '/cache');
    console.log(`  ✅ Status: ${clearResponse.statusCode}`);
    console.log(`  📊 Clear result:`, clearResponse.data.data.message);
    
  } catch (error) {
    console.error('  ❌ Error:', error.message);
  }
}

async function testHealthCheck() {
  console.log('\n🧪 Testing Health Check...');
  
  try {
    const response = await makeRequest('GET', '/health');
    console.log(`  ✅ Status: ${response.statusCode}`);
    console.log(`  📊 Health status:`, {
      status: response.data.data.status,
      uptime: response.data.data.uptime,
      memory: response.data.data.memory,
      performance: response.data.data.performance
    });
    
  } catch (error) {
    console.error('  ❌ Error:', error.message);
  }
}

async function testRateLimiting() {
  console.log('\n🧪 Testing Rate Limiting...');
  
  try {
    console.log('  📝 Making multiple rapid requests to test rate limiting...');
    
    const promises = [];
    for (let i = 0; i < 15; i++) {
      promises.push(makeRequest('GET', '/users/1'));
    }
    
    const responses = await Promise.all(promises);
    
    const successCount = responses.filter(r => r.statusCode === 200).length;
    const rateLimitedCount = responses.filter(r => r.statusCode === 429).length;
    
    console.log(`  ✅ Successful requests: ${successCount}`);
    console.log(`  🚫 Rate limited requests: ${rateLimitedCount}`);
    
    if (rateLimitedCount > 0) {
      console.log(`  📊 Rate limit headers:`, responses[rateLimitedCount - 1].headers);
    }
    
  } catch (error) {
    console.error('  ❌ Error:', error.message);
  }
}

async function testConcurrentRequests() {
  console.log('\n🧪 Testing Concurrent Requests...');
  
  try {
    console.log('  📝 Making 10 concurrent requests for the same user...');
    
    const start = Date.now();
    const promises = [];
    for (let i = 0; i < 10; i++) {
      promises.push(makeRequest('GET', '/users/2'));
    }
    
    const responses = await Promise.all(promises);
    const totalTime = Date.now() - start;
    
    const successCount = responses.filter(r => r.statusCode === 200).length;
    const avgResponseTime = responses
      .filter(r => r.statusCode === 200)
      .reduce((sum, r) => sum + (r.data.responseTime || 0), 0) / successCount;
    
    console.log(`  ✅ Successful requests: ${successCount}`);
    console.log(`  ⏱️  Total time for all requests: ${totalTime}ms`);
    console.log(`  📊 Average response time: ${Math.round(avgResponseTime)}ms`);
    
  } catch (error) {
    console.error('  ❌ Error:', error.message);
  }
}

// Main test runner
async function runTests() {
  console.log('🚀 Starting API Tests...');
  console.log(`📍 Testing API at: ${API_BASE}`);
  
  try {
    await testUserRetrieval();
    await testUserCreation();
    await testCacheManagement();
    await testHealthCheck();
    await testConcurrentRequests();
    await testRateLimiting();
    
    console.log('\n✅ All tests completed!');
    
  } catch (error) {
    console.error('\n❌ Test suite failed:', error.message);
    process.exit(1);
  }
}

// Check if server is running
async function checkServer() {
  try {
    await makeRequest('GET', '/health');
    return true;
  } catch (error) {
    return false;
  }
}

// Run tests
async function main() {
  console.log('🔍 Checking if server is running...');
  
  const isRunning = await checkServer();
  if (!isRunning) {
    console.error('❌ Server is not running! Please start the server first:');
    console.error('   npm run dev');
    process.exit(1);
  }
  
  console.log('✅ Server is running!');
  await runTests();
}

main().catch(console.error);
