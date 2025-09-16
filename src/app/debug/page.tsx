'use client';

import React, { useState } from 'react';
import PostgreSQLService from '../../services/PostgreSQLService';

export default function DebugPage() {
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runSimpleTest = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await PostgreSQLService.simpleTest();
      setResults(result);
      console.log('Simple test results:', result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      console.error('Simple test error:', err);
    } finally {
      setLoading(false);
    }
  };

  const runDebugHeaders = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await PostgreSQLService.debugHeaders();
      setResults(result);
      console.log('Debug headers results:', result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      console.error('Debug headers error:', err);
    } finally {
      setLoading(false);
    }
  };

  const testLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await PostgreSQLService.login('test@gmail.com', 'test1234!');
      setResults(result);
      console.log('Login results:', result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  const testMe = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await PostgreSQLService.me();
      setResults(result);
      console.log('Me results:', result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      console.error('Me error:', err);
    } finally {
      setLoading(false);
    }
  };

  const testQueryParam = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await PostgreSQLService.queryParamTest();
      setResults(result);
      console.log('Query param test results:', result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      console.error('Query param test error:', err);
    } finally {
      setLoading(false);
    }
  };

  const clearTokens = async () => {
    setLoading(true);
    setError(null);
    try {
      await PostgreSQLService.clearTokens();
      setResults({ message: 'Tokens cleared successfully' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      console.error('Clear tokens error:', err);
    } finally {
      setLoading(false);
    }
  };

  const checkLocalStorage = () => {
    const token = localStorage.getItem('sandy_access');
    const refreshToken = localStorage.getItem('sandy_refresh');
    setResults({
      accessToken: token ? token.substring(0, 50) + '...' : 'None',
      refreshToken: refreshToken ? refreshToken.substring(0, 50) + '...' : 'None',
      accessTokenLength: token ? token.length : 0
    });
    console.log('Stored tokens:', { accessToken: token, refreshToken: refreshToken });
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h1>Debug Page - Header Testing</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <h2>Available Tests:</h2>
        
        <div style={{ marginBottom: '10px' }}>
          <button onClick={checkLocalStorage} disabled={loading} style={{ marginRight: '10px', padding: '10px' }}>
            Check localStorage
          </button>
          
          <button onClick={runSimpleTest} disabled={loading} style={{ marginRight: '10px', padding: '10px' }}>
            Run Simple Header Test
          </button>
          
          <button onClick={runDebugHeaders} disabled={loading} style={{ marginRight: '10px', padding: '10px' }}>
            Run Debug Headers Test
          </button>
          
          <button onClick={testLogin} disabled={loading} style={{ marginRight: '10px', padding: '10px' }}>
            Test Login
          </button>
          
          <button onClick={testMe} disabled={loading} style={{ marginRight: '10px', padding: '10px' }}>
            Test /me Endpoint
          </button>
          
          <button onClick={testQueryParam} disabled={loading} style={{ marginRight: '10px', padding: '10px' }}>
            Test Query Param (bypasses CORS)
          </button>
          
          <button onClick={clearTokens} disabled={loading} style={{ marginRight: '10px', padding: '10px' }}>
            Clear Stored Tokens
          </button>
        </div>
      </div>

      {loading && (
        <div style={{ padding: '10px', background: '#f0f0f0', margin: '10px 0' }}>
          Loading...
        </div>
      )}

      {error && (
        <div style={{ padding: '10px', background: '#ffebee', margin: '10px 0', color: 'red' }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {results && (
        <div style={{ marginTop: '20px' }}>
          <h3>Results:</h3>
          <pre style={{ background: '#f5f5f5', padding: '10px', overflow: 'auto' }}>
            {JSON.stringify(results, null, 2)}
          </pre>
        </div>
      )}

      <div style={{ marginTop: '30px', fontSize: '12px', color: '#666' }}>
        <p><strong>Instructions:</strong></p>
        <ol>
          <li>Check localStorage to see if tokens are stored</li>
          <li>Run Simple Header Test to see what headers get through</li>
          <li>Test Login to get fresh tokens</li>
          <li>Test /me endpoint to see authentication</li>
          <li>Test Query Param method (bypasses CORS entirely)</li>
          <li>Clear Stored Tokens if you get expired token errors</li>
          <li>Check browser console for detailed logs</li>
        </ol>
      </div>
    </div>
  );
}