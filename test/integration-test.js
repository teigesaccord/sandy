#!/usr/bin/env node

import http from 'http';
import { setTimeout } from 'timers/promises';

console.log('🧪 Running integration tests for Sandy Chatbot...\n');

const CONFIG = {
  baseUrl: 'http://localhost:3000',
  timeout: 5000
};

class IntegrationTester {
  constructor() {
    this.tests = [];
    this.results = {
      passed: 0,
      failed: 0,
      total: 0
    };
  }

  async runTest(name, testFn) {
    this.results.total++;
    console.log(`⏳ Running: ${name}`);
    
    try {
      await testFn();
      this.results.passed++;
      console.log(`✅ Passed: ${name}`);
    } catch (error) {
      this.results.failed++;
      console.log(`❌ Failed: ${name}`);
      console.log(`   Error: ${error.message}`);
    }
  }

  async makeRequest(path, method = 'GET', data = null) {
    return new Promise((resolve, reject) => {
      const url = new URL(path, CONFIG.baseUrl);
      const options = {
        method,
        timeout: CONFIG.timeout,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'IntegrationTest/1.0'
        }
      };

      const req = http.request(url, options, (res) => {
        let body = '';
        
        res.on('data', (chunk) => {
          body += chunk;
        });
        
        res.on('end', () => {
          try {
            const responseData = body ? JSON.parse(body) : {};
            resolve({
              status: res.statusCode,
              headers: res.headers,
              data: responseData
            });
          } catch (parseError) {
            resolve({
              status: res.statusCode,
              headers: res.headers,
              data: body
            });
          }
        });
      });

      req.on('error', (error) => {
        reject(new Error(`Request failed: ${error.message}`));
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });

      if (data && method !== 'GET') {
        req.write(JSON.stringify(data));
      }

      req.end();
    });
  }

  async waitForServer() {
    const maxRetries = 10;
    let retries = 0;
    
    while (retries < maxRetries) {
      try {
        await this.makeRequest('/api/health');
        console.log('✅ Server is responding\n');
        return true;
      } catch (error) {
        retries++;
        console.log(`⏳ Waiting for server... (attempt ${retries}/${maxRetries})`);
        await setTimeout(2000);
      }
    }
    
    throw new Error('Server did not start within expected time');
  }

  async runAllTests() {
    try {
      // Wait for server to be ready
      await this.waitForServer();

      // Test 1: Health Check
      await this.runTest('Health Check API', async () => {
        const response = await this.makeRequest('/api/health');
        if (response.status !== 200) {
          throw new Error(`Expected status 200, got ${response.status}`);
        }
        if (!response.data.status || response.data.status !== 'healthy') {
          throw new Error(`Expected healthy status, got ${response.data.status}`);
        }
      });

      // Test 2: Main Page Load
      await this.runTest('Main Page Load', async () => {
        const response = await this.makeRequest('/');
        if (response.status !== 200) {
          throw new Error(`Expected status 200, got ${response.status}`);
        }
      });

      // Test 3: API Route Structure
      await this.runTest('Intake Sections API', async () => {
        const response = await this.makeRequest('/api/intake/sections');
        if (response.status !== 200) {
          throw new Error(`Expected status 200, got ${response.status}`);
        }
      });

      // Test 4: User Profile API (should handle non-existent user gracefully)
      await this.runTest('User Profile API', async () => {
        const response = await this.makeRequest('/api/users/test-user-123/profile');
        // Should either return 404 or empty profile
        if (response.status !== 404 && response.status !== 200) {
          throw new Error(`Expected status 200 or 404, got ${response.status}`);
        }
      });

      // Test 5: ES Module Import Test (by checking if services are available)
      await this.runTest('ES Module Imports', async () => {
        // This test verifies that the server started successfully,
        // which means ES modules are working properly
        const response = await this.makeRequest('/api/health');
        if (!response.data.service || !response.data.service.includes('Sandy')) {
          throw new Error('Service identifier not found in health response');
        }
      });

    } catch (error) {
      console.log(`\n❌ Test setup failed: ${error.message}`);
      process.exit(1);
    }
  }

  printResults() {
    console.log('\n📊 Test Results:');
    console.log(`   Total:  ${this.results.total}`);
    console.log(`   Passed: ${this.results.passed} ✅`);
    console.log(`   Failed: ${this.results.failed} ❌`);
    
    const successRate = Math.round((this.results.passed / this.results.total) * 100);
    console.log(`   Success Rate: ${successRate}%`);

    if (this.results.failed === 0) {
      console.log('\n🎉 All tests passed! The application is working correctly.');
      return true;
    } else {
      console.log('\n⚠️  Some tests failed. Please check the errors above.');
      return false;
    }
  }
}

// Main execution
async function main() {
  const tester = new IntegrationTester();
  
  try {
    await tester.runAllTests();
    const success = tester.printResults();
    process.exit(success ? 0 : 1);
  } catch (error) {
    console.error('\n💥 Test runner failed:', error.message);
    process.exit(1);
  }
}

// Handle process signals
process.on('SIGINT', () => {
  console.log('\n⏹️  Tests interrupted');
  process.exit(1);
});

process.on('SIGTERM', () => {
  console.log('\n⏹️  Tests terminated');
  process.exit(1);
});

// Run the tests
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { IntegrationTester };