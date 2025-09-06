#!/usr/bin/env node

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

console.log('🌟 Setting up Sandy - Personal Support Chatbot\n');

async function main() {
  try {
    await checkNodeVersion();
    await createDirectories();
    await checkEnvironmentFile();
    await checkDependencies();
    await initializeDatabase();
    await runHealthCheck();
    
    console.log('\n✅ Setup completed successfully!');
    console.log('\n🚀 Next steps:');
    console.log('1. Add your OpenAI API key to the .env file');
    console.log('2. Run "npm run dev" to start the development server');
    console.log('3. Open http://localhost:3000 in your browser');
    console.log('\n📖 See README.md for detailed documentation');
    
  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    process.exit(1);
  }
}

async function checkNodeVersion() {
  const nodeVersion = process.version;
  const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
  
  console.log(`📋 Checking Node.js version: ${nodeVersion}`);
  
  if (majorVersion < 18) {
    throw new Error(`Node.js version 18.0.0 or higher is required. Current version: ${nodeVersion}`);
  }
  
  console.log('✅ Node.js version is compatible\n');
}

async function createDirectories() {
  console.log('📁 Creating required directories...');
  
  const directories = [
    'data',
    'logs',
    'public/assets',
    'src/components',
    'src/models',
    'src/services',
    'test'
  ];
  
  for (const dir of directories) {
    const fullPath = path.join(__dirname, '..', dir);
    try {
      await fs.mkdir(fullPath, { recursive: true });
      console.log(`   Created: ${dir}`);
    } catch (error) {
      if (error.code !== 'EEXIST') {
        throw new Error(`Failed to create directory ${dir}: ${error.message}`);
      }
    }
  }
  
  console.log('✅ Directories created\n');
}

async function checkEnvironmentFile() {
  console.log('🔧 Checking environment configuration...');
  
  const envPath = path.join(__dirname, '..', '.env');
  const envExamplePath = path.join(__dirname, '..', '.env.example');
  
  try {
    await fs.access(envPath);
    console.log('✅ .env file exists');
  } catch {
    console.log('📝 Creating .env file from template...');
    try {
      const envExample = await fs.readFile(envExamplePath, 'utf8');
      await fs.writeFile(envPath, envExample);
      console.log('✅ .env file created');
      console.log('⚠️  Remember to add your OpenAI API key to the .env file');
    } catch (error) {
      throw new Error(`Failed to create .env file: ${error.message}`);
    }
  }
  
  // Validate critical environment variables
  try {
    const envContent = await fs.readFile(envPath, 'utf8');
    if (!envContent.includes('OPENAI_API_KEY=') || envContent.includes('your_openai_api_key_here')) {
      console.log('⚠️  OpenAI API key not configured in .env file');
    }
  } catch (error) {
    console.log('⚠️  Could not validate .env file contents');
  }
  
  console.log();
}

async function checkDependencies() {
  console.log('📦 Checking dependencies...');
  
  try {
    const packagePath = path.join(__dirname, '..', 'package.json');
    const packageContent = await fs.readFile(packagePath, 'utf8');
    const packageJson = JSON.parse(packageContent);
    
    // Check if node_modules exists
    const nodeModulesPath = path.join(__dirname, '..', 'node_modules');
    try {
      await fs.access(nodeModulesPath);
      console.log('✅ Dependencies are installed');
    } catch {
      console.log('⚠️  Dependencies not installed. Run "npm install" first.');
    }
    
    // Check for critical dependencies
    const criticalDeps = [
      'openai',
      'rate-limiter-flexible',
      'express',
      'pg',
      'bcryptjs',
      'jsonwebtoken',
      'ws'
    ];
    
    for (const dep of criticalDeps) {
      if (!packageJson.dependencies[dep]) {
        console.log(`⚠️  Missing critical dependency: ${dep}`);
      }
    }
    
  } catch (error) {
    throw new Error(`Failed to check dependencies: ${error.message}`);
  }
  
  console.log();
}

async function initializeDatabase() {
  console.log('🗄️  Initializing PostgreSQL database...');
  
  const dbUrl = process.env.DATABASE_URL || 'postgresql://sandy:sandy@localhost:5432/sandy_db';
  
  try {
    // Import and test PostgreSQL database service
    const { PostgreSQLService } = await import('../src/services/PostgreSQLService.js');
    const dbService = new PostgreSQLService(dbUrl);
    
    console.log('🔗 Testing database connection...');
    await dbService.initialize();
    
    console.log('✅ Database connection test passed');
    console.log('📊 Database tables created/verified');
    
    await dbService.close();
    console.log('✅ PostgreSQL database initialization completed');
  } catch (error) {
    console.log('⚠️  Database test failed - please check PostgreSQL connection');
    console.log(`   Error: ${error.message}`);
    console.log('   Make sure PostgreSQL is running and DATABASE_URL is correct');
  }
}

async function runHealthCheck() {
  console.log('🔍 Running health checks...');
  
  // Check file permissions
  const testFile = path.join(__dirname, '..', 'data', '.test');
  try {
    await fs.writeFile(testFile, 'test');
    await fs.unlink(testFile);
    console.log('✅ File system permissions OK');
  } catch (error) {
    console.log('⚠️  File system permission issue:', error.message);
  }
  
  // Check port availability (basic check)
  const port = process.env.PORT || 3000;
  console.log(`✅ Will attempt to use port ${port}`);
  
  // Check memory availability
  const memUsage = process.memoryUsage();
  const memMB = Math.round(memUsage.heapUsed / 1024 / 1024);
  console.log(`✅ Memory usage: ${memMB}MB`);
  
  console.log();
}

// Additional utility functions

async function generateSecrets() {
  console.log('🔐 Generating secure secrets...');
  
  const crypto = await import('crypto');
  const sessionSecret = crypto.randomBytes(32).toString('hex');
  
  const envPath = path.join(__dirname, '..', '.env');
  let envContent = await fs.readFile(envPath, 'utf8');
  
  // Replace placeholder session secret
  envContent = envContent.replace(
    'SESSION_SECRET=your_secure_session_secret_here',
    `SESSION_SECRET=${sessionSecret}`
  );
  
  await fs.writeFile(envPath, envContent);
  console.log('✅ Security secrets generated');
}

async function createSampleData() {
  console.log('📊 Creating sample data...');
  
  const sampleProfile = {
    id: 'sample_user_123',
    personalInfo: {
      name: 'Sample User',
      age: 35
    },
    physicalNeeds: {
      mobilityLevel: 'moderate',
      exerciseCapability: 'light'
    },
    preferences: {
      communicationStyle: 'balanced',
      supportType: ['emotional', 'practical']
    }
  };
  
  const samplePath = path.join(__dirname, '..', 'data', 'sample_profile.json');
  await fs.writeFile(samplePath, JSON.stringify(sampleProfile, null, 2));
  console.log('✅ Sample data created');
}

// CLI argument handling
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
Sandy Setup Script

Usage:
  node scripts/setup.js [options]

Options:
  --help, -h          Show this help message
  --generate-secrets  Generate new security secrets
  --sample-data      Create sample data files
  --clean            Clean up generated files
  --verbose          Enable verbose output

Examples:
  node scripts/setup.js                    # Standard setup
  node scripts/setup.js --generate-secrets # Setup with new secrets
  node scripts/setup.js --sample-data      # Setup with sample data
`);
  process.exit(0);
}

if (process.argv.includes('--generate-secrets')) {
  await generateSecrets();
}

if (process.argv.includes('--sample-data')) {
  await createSampleData();
}

if (process.argv.includes('--clean')) {
  console.log('🧹 Cleaning up...');
  const filesToClean = [
    'data/sample_profile.json',
    'data/.test',
    'logs/*.log'
  ];
  
  for (const file of filesToClean) {
    try {
      await fs.unlink(path.join(__dirname, '..', file));
      console.log(`   Removed: ${file}`);
    } catch {
      // File doesn't exist, ignore
    }
  }
  console.log('✅ Cleanup completed');
  process.exit(0);
}

// Run main setup if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { main as setup };