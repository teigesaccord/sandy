#!/usr/bin/env node

/**
 * Health Check Script for Sandy Chatbot Docker Container
 * This script performs comprehensive health checks for the containerized application
 */

import http from 'http';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const CONFIG = {
  port: process.env.PORT || 3000,
  host: process.env.HOST || 'localhost',
  timeout: parseInt(process.env.HEALTH_CHECK_TIMEOUT) || 10000,
  databasePath: process.env.DATABASE_PATH || './data/users.db',
  maxMemoryUsage: parseInt(process.env.MAX_MEMORY_MB) || 512,
  maxCpuUsage: parseInt(process.env.MAX_CPU_PERCENT) || 80,
  requiredEnvVars: ['OPENAI_API_KEY'],
  endpoints: [
    { path: '/api/health', expectedStatus: 200 },
    { path: '/', expectedStatus: 200 }
  ]
};

// Exit codes
const EXIT_CODES = {
  SUCCESS: 0,
  HTTP_ERROR: 1,
  DATABASE_ERROR: 2,
  FILESYSTEM_ERROR: 3,
  MEMORY_ERROR: 4,
  ENV_ERROR: 5,
  TIMEOUT_ERROR: 6,
  UNKNOWN_ERROR: 99
};

class HealthChecker {
  constructor() {
    this.checks = [];
    this.startTime = Date.now();
  }

  log(level, message, data = {}) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level: level.toUpperCase(),
      message,
      ...data
    };
    
    if (process.env.NODE_ENV !== 'production' || level === 'error') {
      console.log(JSON.stringify(logEntry));
    }
  }

  async runCheck(name, checkFunction) {
    const checkStart = Date.now();
    try {
      this.log('info', `Starting health check: ${name}`);
      const result = await checkFunction();
      const duration = Date.now() - checkStart;
      
      this.checks.push({
        name,
        status: 'pass',
        duration,
        result
      });
      
      this.log('info', `Health check passed: ${name}`, { duration });
      return true;
    } catch (error) {
      const duration = Date.now() - checkStart;
      
      this.checks.push({
        name,
        status: 'fail',
        duration,
        error: error.message
      });
      
      this.log('error', `Health check failed: ${name}`, { 
        duration, 
        error: error.message,
        stack: error.stack 
      });
      return false;
    }
  }

  async checkHttpEndpoint(endpoint) {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: CONFIG.host,
        port: CONFIG.port,
        path: endpoint.path,
        method: 'GET',
        timeout: CONFIG.timeout,
        headers: {
          'User-Agent': 'HealthCheck/1.0'
        }
      };

      const req = http.request(options, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          if (res.statusCode === endpoint.expectedStatus) {
            resolve({
              statusCode: res.statusCode,
              responseTime: Date.now() - this.startTime,
              contentLength: data.length
            });
          } else {
            reject(new Error(`Unexpected status code: ${res.statusCode}, expected: ${endpoint.expectedStatus}`));
          }
        });
      });

      req.on('error', (error) => {
        reject(new Error(`HTTP request failed: ${error.message}`));
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error(`HTTP request timeout after ${CONFIG.timeout}ms`));
      });

      req.end();
    });
  }

  async checkDatabase() {
    try {
      // Check if database file exists and is readable
      const dbPath = path.resolve(CONFIG.databasePath);
      await fs.access(dbPath, fs.constants.R_OK | fs.constants.W_OK);
      
      const stats = await fs.stat(dbPath);
      
      // Check file size (should be > 0 for initialized database)
      if (stats.size === 0) {
        throw new Error('Database file is empty');
      }
      
      // Check if file is not too large (potential corruption indicator)
      const maxDbSize = 100 * 1024 * 1024; // 100MB
      if (stats.size > maxDbSize) {
        this.log('warn', 'Database file is unusually large', { size: stats.size });
      }
      
      return {
        path: dbPath,
        size: stats.size,
        modified: stats.mtime,
        accessible: true
      };
    } catch (error) {
      throw new Error(`Database check failed: ${error.message}`);
    }
  }

  async checkFileSystem() {
    const directories = ['./data', './logs', './public'];
    const results = {};
    
    for (const dir of directories) {
      try {
        await fs.access(dir, fs.constants.R_OK | fs.constants.W_OK);
        const stats = await fs.stat(dir);
        results[dir] = {
          exists: true,
          isDirectory: stats.isDirectory(),
          size: stats.size,
          modified: stats.mtime
        };
      } catch (error) {
        results[dir] = {
          exists: false,
          error: error.message
        };
      }
    }
    
    // Check if any critical directories are missing
    const criticalDirs = ['./data', './public'];
    const missingCritical = criticalDirs.filter(dir => !results[dir].exists);
    
    if (missingCritical.length > 0) {
      throw new Error(`Critical directories missing: ${missingCritical.join(', ')}`);
    }
    
    return results;
  }

  async checkMemoryUsage() {
    const memUsage = process.memoryUsage();
    const memMB = {
      rss: Math.round(memUsage.rss / 1024 / 1024),
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
      external: Math.round(memUsage.external / 1024 / 1024)
    };
    
    if (memMB.rss > CONFIG.maxMemoryUsage) {
      throw new Error(`Memory usage too high: ${memMB.rss}MB (max: ${CONFIG.maxMemoryUsage}MB)`);
    }
    
    return memMB;
  }

  async checkEnvironmentVariables() {
    const missing = [];
    const present = {};
    
    for (const envVar of CONFIG.requiredEnvVars) {
      if (process.env[envVar]) {
        // Don't log sensitive values, just indicate presence
        present[envVar] = envVar.toLowerCase().includes('key') || envVar.toLowerCase().includes('secret') 
          ? '[REDACTED]' 
          : process.env[envVar];
      } else {
        missing.push(envVar);
      }
    }
    
    if (missing.length > 0) {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }
    
    return { present, missing };
  }

  async checkDiskSpace() {
    try {
      // Simple disk space check by attempting to write a test file
      const testFile = path.join('./data', '.health-check-test');
      const testData = 'health-check-test-data';
      
      await fs.writeFile(testFile, testData);
      const readData = await fs.readFile(testFile, 'utf8');
      await fs.unlink(testFile);
      
      if (readData !== testData) {
        throw new Error('Disk write/read test failed');
      }
      
      return { diskWritable: true };
    } catch (error) {
      throw new Error(`Disk space check failed: ${error.message}`);
    }
  }

  async checkProcessHealth() {
    const uptime = process.uptime();
    const pid = process.pid;
    const nodeVersion = process.version;
    const platform = process.platform;
    const arch = process.arch;
    
    return {
      uptime,
      pid,
      nodeVersion,
      platform,
      arch,
      argv: process.argv
    };
  }

  async runAllChecks() {
    this.log('info', 'Starting comprehensive health check');
    
    const checkResults = await Promise.allSettled([
      this.runCheck('http-endpoints', async () => {
        const results = {};
        for (const endpoint of CONFIG.endpoints) {
          results[endpoint.path] = await this.checkHttpEndpoint(endpoint);
        }
        return results;
      }),
      
      this.runCheck('database', () => this.checkDatabase()),
      this.runCheck('filesystem', () => this.checkFileSystem()),
      this.runCheck('memory', () => this.checkMemoryUsage()),
      this.runCheck('environment', () => this.checkEnvironmentVariables()),
      this.runCheck('disk-space', () => this.checkDiskSpace()),
      this.runCheck('process', () => this.checkProcessHealth())
    ]);
    
    const totalDuration = Date.now() - this.startTime;
    const passedChecks = this.checks.filter(check => check.status === 'pass').length;
    const failedChecks = this.checks.filter(check => check.status === 'fail').length;
    
    const summary = {
      overall: failedChecks === 0 ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      duration: totalDuration,
      checks: {
        total: this.checks.length,
        passed: passedChecks,
        failed: failedChecks
      },
      details: this.checks
    };
    
    this.log('info', 'Health check completed', summary);
    
    return summary;
  }

  determineExitCode() {
    for (const check of this.checks) {
      if (check.status === 'fail') {
        switch (check.name) {
          case 'http-endpoints':
            return EXIT_CODES.HTTP_ERROR;
          case 'database':
            return EXIT_CODES.DATABASE_ERROR;
          case 'filesystem':
          case 'disk-space':
            return EXIT_CODES.FILESYSTEM_ERROR;
          case 'memory':
            return EXIT_CODES.MEMORY_ERROR;
          case 'environment':
            return EXIT_CODES.ENV_ERROR;
          default:
            return EXIT_CODES.UNKNOWN_ERROR;
        }
      }
    }
    return EXIT_CODES.SUCCESS;
  }
}

// Main execution
async function main() {
  const checker = new HealthChecker();
  
  try {
    // Set up timeout for entire health check process
    const timeoutId = setTimeout(() => {
      console.error('Health check timeout exceeded');
      process.exit(EXIT_CODES.TIMEOUT_ERROR);
    }, CONFIG.timeout);
    
    const summary = await checker.runAllChecks();
    clearTimeout(timeoutId);
    
    // Output summary for Docker health check
    if (summary.overall === 'healthy') {
      console.log('HEALTHY: All checks passed');
      process.exit(EXIT_CODES.SUCCESS);
    } else {
      console.error('UNHEALTHY: Some checks failed');
      console.error(JSON.stringify(summary, null, 2));
      process.exit(checker.determineExitCode());
    }
    
  } catch (error) {
    console.error('Health check error:', error.message);
    process.exit(EXIT_CODES.UNKNOWN_ERROR);
  }
}

// Handle process signals
process.on('SIGTERM', () => {
  console.log('Health check received SIGTERM, exiting...');
  process.exit(EXIT_CODES.SUCCESS);
});

process.on('SIGINT', () => {
  console.log('Health check received SIGINT, exiting...');
  process.exit(EXIT_CODES.SUCCESS);
});

// Run health check if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('Unhandled error:', error);
    process.exit(EXIT_CODES.UNKNOWN_ERROR);
  });
}

export { HealthChecker, EXIT_CODES };