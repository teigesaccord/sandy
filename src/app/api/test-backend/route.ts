import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 BACKEND TEST: Starting Django connectivity test...');
    
    // Test 1: Simple health check
    const apiHost = process.env.API_HOST || 'http://localhost:8000';
    const healthUrl = `${apiHost}/api/health/`;
    console.log('🔍 BACKEND TEST: Testing health endpoint:', healthUrl);
    console.log('🔍 BACKEND TEST: Using API_HOST:', apiHost);
    
    const healthResponse = await fetch(healthUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('🔍 BACKEND TEST: Health response status:', healthResponse.status);
    const healthData = await healthResponse.json();
    console.log('🔍 BACKEND TEST: Health response data:', healthData);
    
    // Test 2: Try login endpoint
    const loginUrl = `${apiHost}/api/auth/login/`;
    console.log('🔍 BACKEND TEST: Testing login endpoint connectivity:', loginUrl);
    
    const loginResponse = await fetch(loginUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'WrongPassword123!'  // Intentionally wrong to test connectivity
      })
    });
    
    console.log('🔍 BACKEND TEST: Login response status:', loginResponse.status);
    const loginData = await loginResponse.text();
    console.log('🔍 BACKEND TEST: Login response:', loginData);
    
    return NextResponse.json({
      message: 'Django backend connectivity test',
      timestamp: new Date().toISOString(),
      tests: {
        health: {
          url: healthUrl,
          status: healthResponse.status,
          data: healthData
        },
        login: {
          url: loginUrl,
          status: loginResponse.status,
          data: loginData
        }
      },
      environment: {
        NEXT_PUBLIC_API_HOST: process.env.NEXT_PUBLIC_API_HOST,
        API_HOST: process.env.API_HOST,
        NODE_ENV: process.env.NODE_ENV
      }
    });
    
  } catch (error) {
    console.error('🔍 BACKEND TEST: Error during test:', error);
    
    return NextResponse.json(
      {
        message: 'Django backend connectivity test failed',
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString(),
        environment: {
          NEXT_PUBLIC_API_HOST: process.env.NEXT_PUBLIC_API_HOST,
          API_HOST: process.env.API_HOST,
          NODE_ENV: process.env.NODE_ENV
        }
      },
      { status: 500 }
    );
  }
}

export async function OPTIONS(request: NextRequest) {
  return NextResponse.json({}, { status: 200 });
}