'use client';

import { useState, useEffect } from 'react';

export default function DebugAuthPage() {
  const [debugInfo, setDebugInfo] = useState<any>({});
  const [testResults, setTestResults] = useState<any>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Get all localStorage data
    const localStorageData: any = {};
    if (typeof window !== 'undefined') {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          localStorageData[key] = localStorage.getItem(key);
        }
      }
    }

    setDebugInfo({
      localStorage: localStorageData,
      currentURL: window.location.href,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
    });
  }, []);

  const testEndpoint = async (userId: string) => {
    setLoading(true);
    const results: any = { userId };

    try {
      const token = localStorage.getItem('sandy_access');
      const API_HOST = process.env.NEXT_PUBLIC_API_HOST || 'http://localhost:8000';
      
      results.token = token ? `${token.substring(0, 50)}...` : 'No token found';
      results.apiHost = API_HOST;

      if (!token) {
        results.error = 'No authentication token found in localStorage';
        setTestResults(results);
        setLoading(false);
        return;
      }

      // Test the endpoint
      const url = `${API_HOST}/api/users/${userId}/profile/?token=${encodeURIComponent(token)}`;
      results.requestURL = url;

      console.log('Testing URL:', url);
      
      const response = await fetch(url, { 
        method: 'GET',
        // Don't include credentials to avoid CSRF issues
      });

      results.status = response.status;
      results.statusText = response.statusText;
      results.headers = Object.fromEntries(response.headers.entries());

      if (response.ok) {
        const data = await response.json();
        results.success = true;
        results.data = data;
      } else {
        const text = await response.text();
        results.success = false;
        results.errorText = text;
      }
    } catch (error: any) {
      results.success = false;
      results.error = error.message;
      results.stack = error.stack;
    }

    setTestResults(results);
    setLoading(false);
  };

  const clearTokens = () => {
    localStorage.removeItem('sandy_access');
    localStorage.removeItem('sandy_refresh');
    localStorage.removeItem('sandy_user');
    alert('Tokens cleared! Please login again.');
    window.location.reload();
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard!');
  };

  return (
    <div className="container mx-auto p-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Authentication Debug Page</h1>
      
      {/* Debug Info Section */}
      <div className="bg-gray-100 p-4 rounded-lg mb-6">
        <h2 className="text-xl font-semibold mb-4">Debug Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h3 className="font-medium mb-2">LocalStorage Contents:</h3>
            <pre className="text-xs bg-white p-2 rounded border overflow-auto max-h-40">
              {JSON.stringify(debugInfo.localStorage, null, 2)}
            </pre>
          </div>
          <div>
            <h3 className="font-medium mb-2">Environment:</h3>
            <div className="text-sm space-y-1">
              <div><strong>URL:</strong> {debugInfo.currentURL}</div>
              <div><strong>Time:</strong> {debugInfo.timestamp}</div>
              <div><strong>API Host:</strong> {process.env.NEXT_PUBLIC_API_HOST || 'http://localhost:8000'}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Test Section */}
      <div className="bg-blue-50 p-4 rounded-lg mb-6">
        <h2 className="text-xl font-semibold mb-4">Test Profile Endpoint</h2>
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => testEndpoint('5')}
            disabled={loading}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
          >
            {loading ? 'Testing...' : 'Test User ID 5'}
          </button>
          <button
            onClick={() => testEndpoint('1')}
            disabled={loading}
            className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:opacity-50"
          >
            {loading ? 'Testing...' : 'Test User ID 1'}
          </button>
          <button
            onClick={clearTokens}
            className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
          >
            Clear Tokens
          </button>
        </div>

        {testResults.userId && (
          <div className="bg-white p-4 rounded border">
            <h3 className="font-medium mb-2">Test Results for User {testResults.userId}:</h3>
            <div className="space-y-2 text-sm">
              <div><strong>Status:</strong> 
                <span className={testResults.success ? 'text-green-600' : 'text-red-600'}>
                  {testResults.status} {testResults.statusText}
                </span>
              </div>
              <div><strong>Token:</strong> {testResults.token}</div>
              <div><strong>Request URL:</strong> 
                <button 
                  onClick={() => copyToClipboard(testResults.requestURL)}
                  className="ml-2 text-blue-500 underline text-xs"
                >
                  Copy URL
                </button>
                <div className="text-xs text-gray-600 mt-1 break-all">{testResults.requestURL}</div>
              </div>
              
              {testResults.success && testResults.data && (
                <div>
                  <strong>Success! Profile Data:</strong>
                  <pre className="text-xs bg-green-50 p-2 rounded mt-1 overflow-auto">
                    {JSON.stringify(testResults.data, null, 2)}
                  </pre>
                </div>
              )}
              
              {!testResults.success && (
                <div>
                  <strong>Error:</strong>
                  <div className="text-red-600 text-xs mt-1">
                    {testResults.error || testResults.errorText}
                  </div>
                  {testResults.stack && (
                    <pre className="text-xs bg-red-50 p-2 rounded mt-1 overflow-auto max-h-32">
                      {testResults.stack}
                    </pre>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Quick Fixes */}
      <div className="bg-yellow-50 p-4 rounded-lg">
        <h2 className="text-xl font-semibold mb-4">Quick Fixes</h2>
        <div className="space-y-2 text-sm">
          <div>• <strong>If you see 401 Unauthorized:</strong> Your token might be expired. Try clearing tokens and logging in again.</div>
          <div>• <strong>If you see 404 Not Found:</strong> Check if the Django server is running on port 8000.</div>
          <div>• <strong>If you see CORS errors:</strong> Make sure the frontend and backend URLs are configured correctly.</div>
          <div>• <strong>If token is missing:</strong> Go to the login page and authenticate again.</div>
        </div>
        
        <div className="mt-4 pt-4 border-t">
          <h3 className="font-medium mb-2">Manual Test Links:</h3>
          <div className="space-y-1 text-xs">
            <div>
              <a href="http://localhost:8000/api/" target="_blank" className="text-blue-500 underline">
                Test Django API Root
              </a>
            </div>
            <div>
              <a href="http://localhost:8000/admin/" target="_blank" className="text-blue-500 underline">
                Django Admin (if enabled)
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}