/* Lightweight client that forwards database-related calls to the Django backend (DRF).
   The frontend/Next API should call Django endpoints (e.g., /api/auth/login/) rather than executing DB logic in TypeScript.

   Note: Update API_HOST if Django runs on a different origin during development.
*/

// Ensure we have an absolute host for server-side requests during build/export.
// NEXT_PUBLIC_API_HOST is used in the browser; API_HOST falls back to API_HOST or localhost:8000 for Django.
let API_HOST = (process.env.NEXT_PUBLIC_API_HOST || process.env.API_HOST || 'http://localhost:8000').replace(/\/$/, '');

// Sanitize local development hosts: if someone mistakenly set https://localhost:8000
// force plain http so fetch doesn't attempt TLS against a non-TLS dev server.
try {
  const parsed = new URL(API_HOST);
  const hostname = parsed.hostname;
  if ((hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') && parsed.protocol === 'https:') {
    parsed.protocol = 'http:';
    API_HOST = parsed.toString().replace(/\/$/, '');
  }
} catch (err) {
  // If parsing fails, keep the fallback value which is an absolute http URL.
}

async function request(path: string, options: RequestInit = {}) {
  const url = API_HOST + path;
  // Automatically attach stored access token (if present) using X-Auth-Token to bypass CORS issues
  const storedAccess = typeof window !== 'undefined' ? localStorage.getItem('sandy_access') : null;
  const authHeader = storedAccess ? { 'X-Auth-Token': storedAccess } : {};

  // Build headers with correct typing for fetch
  const baseHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(authHeader as Record<string, string>),
    ...((options.headers as Record<string, string>) || {})
  };

  console.log(url);
  const res = await fetch(url, {
    method: options.method || 'GET',
    headers: baseHeaders as HeadersInit,
    ...options
  });
  console.log(res);

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${res.status} ${res.statusText}: ${text}`);
  }

  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return res.json();
  }
  return res.text();
}

export const PostgreSQLService = {
  // Auth
  async register(email: string, password: string, firstName?: string, lastName?: string) {
    return request('/api/auth/register/', {
      method: 'POST',
      body: JSON.stringify({ email, password, first_name: firstName, last_name: lastName })
    });
  },

  async login(email: string, password: string) {
    try {
      // Clear any existing tokens before login
      try {
        localStorage.removeItem('sandy_access');
        localStorage.removeItem('sandy_refresh');
        localStorage.removeItem('sandy_user');
      } catch (err) {
        // ignore storage errors in SSR or private mode
      }

      const data = await request('/api/auth/login/', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });

      // TokenObtainPairView returns { access, refresh }
      if (data && data.access) {
        try {
          localStorage.setItem('sandy_access', data.access);
          if (data.refresh) localStorage.setItem('sandy_refresh', data.refresh);
          console.log('DEBUG: Tokens stored successfully', {
            accessTokenLength: data.access.length,
            hasRefresh: !!data.refresh
          });
        } catch (err) {
          console.error('DEBUG: Token storage failed', err);
          // ignore storage errors in SSR or private mode
        }
      }

      return data;
    } catch (error) {
      // Check if error is due to invalid/expired tokens
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('token_not_valid') || errorMessage.includes('Token is invalid or expired')) {
        console.log('DEBUG: Clearing expired tokens from localStorage');
        try {
          localStorage.removeItem('sandy_access');
          localStorage.removeItem('sandy_refresh');
          localStorage.removeItem('sandy_user');
        } catch (err) {
          // ignore storage errors
        }
      }
      throw error;
    }
  },

  async logout() {
    // Clear stored tokens and call logout endpoint
    try {
      localStorage.removeItem('sandy_access');
      localStorage.removeItem('sandy_refresh');
      localStorage.removeItem('sandy_user');
    } catch (err) {
      // ignore
    }
    try {
      return await request('/api/auth/logout/', { method: 'POST' });
    } catch (err) {
      // Even if logout endpoint fails, we've cleared local tokens
      console.log('Logout endpoint failed, but tokens cleared locally');
    }
  },

  // Helper function to handle 401 errors globally
  handleUnauthorized() {
    try {
      localStorage.removeItem('sandy_access');
      localStorage.removeItem('sandy_refresh');
      localStorage.removeItem('sandy_user');
    } catch (err) {
      // ignore storage errors
    }

    // Redirect to login page
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  },

  async me(token?: string) {
    // Use query parameter to bypass CORS issues
    const storedToken = token || (typeof window !== 'undefined' ? localStorage.getItem('sandy_access') : null);
    if (!storedToken) {
      throw new Error('No authentication token available');
    }

    const url = `${API_HOST}/api/auth/simple-me/?token=${encodeURIComponent(storedToken)}`;
    const response = await fetch(url, { method: 'GET' });

    if (!response.ok) {
      const text = await response.text();

      // Handle 401 Unauthorized - token is invalid/expired
      if (response.status === 401) {
        console.log('Token expired or invalid, redirecting to login');
        this.handleUnauthorized();
        throw new Error('Authentication expired. Redirecting to login.');
      }

      throw new Error(`${response.status} ${response.statusText}: ${text}`);
    }

    return response.json();
  },

  // Profiles
  async getUserProfile(userId: string) {
    const storedToken = typeof window !== 'undefined' ? localStorage.getItem('sandy_access') : null;
    if (!storedToken) {
      throw new Error('No authentication token available');
    }

    const url = `${API_HOST}/api/users/${userId}/profile/?token=${encodeURIComponent(storedToken)}`;
    const response = await fetch(url, { method: 'GET' });

    if (!response.ok) {
      const text = await response.text();

      // Handle 401 Unauthorized - token is invalid/expired
      if (response.status === 401) {
        console.log('Token expired or invalid, redirecting to login');
        this.handleUnauthorized();
        throw new Error('Authentication expired. Redirecting to login.');
      }

      throw new Error(`${response.status} ${response.statusText}: ${text}`);
    }

    return response.json();
  },

  // Token refresh functionality
  async refreshToken() {
    const refreshToken = typeof window !== 'undefined' ? localStorage.getItem('sandy_refresh') : null;
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await fetch(`${API_HOST}/api/auth/token/refresh/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        refresh: refreshToken
      })
    });

    if (!response.ok) {
      // If refresh fails, clear all tokens
      if (typeof window !== 'undefined') {
        localStorage.removeItem('sandy_access');
        localStorage.removeItem('sandy_refresh');
        localStorage.removeItem('sandy_user');
      }
      throw new Error('Token refresh failed');
    }

    const data = await response.json();

    // Update stored tokens
    if (typeof window !== 'undefined') {
      localStorage.setItem('sandy_access', data.access);
      if (data.refresh) {
        localStorage.setItem('sandy_refresh', data.refresh);
      }
    }

    return data.access;
  },

  // Enhanced getUserProfile with automatic token refresh
  async getUserProfileWithRefresh(userId: string) {
    try {
      return await this.getUserProfile(userId);
    } catch (error: any) {
      // If we get 401, try to refresh token and retry
      if (error.message.includes('401')) {
        try {
          await this.refreshToken();
          return await this.getUserProfile(userId);
        } catch (refreshError) {
          throw new Error('Authentication failed. Please login again.');
        }
      }
      throw error;
    }
  },

  async saveUserProfile(userId: string, profile: any) {
    const storedToken = typeof window !== 'undefined' ? localStorage.getItem('sandy_access') : null;
    if (!storedToken) {
      throw new Error('No authentication token available');
    }

    const url = `${API_HOST}/api/users/${userId}/profile/?token=${encodeURIComponent(storedToken)}`;
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(profile)
    });

    if (!response.ok) {
      const text = await response.text();

      // Handle 401 Unauthorized - token is invalid/expired
      if (response.status === 401) {
        console.log('Token expired or invalid, redirecting to login');
        this.handleUnauthorized();
        throw new Error('Authentication expired. Redirecting to login.');
      }

      throw new Error(`${response.status} ${response.statusText}: ${text}`);
    }

    return response.json();
  },

  // Conversations
  async saveConversation(userId: string, messageType: string, messageText: string, contextData?: any) {
    return request(`/api/users/${userId}/chat/`, {
      method: 'POST',
      body: JSON.stringify({ message_type: messageType, message_text: messageText, context_data: contextData })
    });
  },

  async getConversationHistory(userId: string, limit: number = 50) {
    return request(`/api/users/${userId}/chat/?limit=${limit}`);
  },

  // Recommendations
  async getRecommendations(userId: string, limit: number = 20) {
    return request(`/api/users/${userId}/recommendations/?limit=${limit}`);
  },

  async saveRecommendation(userId: string, recommendationType: string, recommendationData: any) {
    return request(`/api/users/${userId}/recommendations/`, {
      method: 'POST',
      body: JSON.stringify({ recommendation_type: recommendationType, recommendation_data: recommendationData })
    });
  },

  async recordInteraction(userId: string, interactionType: string, interactionData?: any) {
    return request(`/api/users/${userId}/interactions/`, {
      method: 'POST',
      body: JSON.stringify({ interaction_type: interactionType, interaction_data: interactionData })
    });
  },

  async deleteUserProfile(userId: string) {
    return request(`/api/users/${userId}/profile/`, { method: 'DELETE' });
  },

  async clearConversationHistory(userId: string) {
    return request(`/api/users/${userId}/conversation/`, { method: 'DELETE' });
  },

  // Health
  async health() {
    return request('/api/health/', {method: 'GET'});
  },

  // Test method to manually test /me/ endpoint
  async testMe() {
    const storedToken = typeof window !== 'undefined' ? localStorage.getItem('sandy_access') : null;
    console.log('DEBUG testMe: stored token:', storedToken ? storedToken.substring(0, 50) + '...' : 'none');

    if (!storedToken) {
      throw new Error('No stored token found');
    }

    const url = API_HOST + '/api/auth/me/';
    console.log('DEBUG testMe: making direct fetch to:', url);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${storedToken}`,
        'Origin': 'http://localhost:3000'
      }
    });

    console.log('DEBUG testMe: response status:', response.status);
    console.log('DEBUG testMe: response headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const text = await response.text();
      console.error('DEBUG testMe: error response:', text);
      throw new Error(`${response.status} ${response.statusText}: ${text}`);
    }

    const data = await response.json();
    console.log('DEBUG testMe: success data:', data);
    return data;
  },

  // Debug function to test what headers Django receives
  async debugHeaders() {
    const storedToken = typeof window !== 'undefined' ? localStorage.getItem('sandy_access') : null;
    console.log('DEBUG debugHeaders: stored token:', storedToken ? storedToken.substring(0, 50) + '...' : 'none');

    const url = API_HOST + '/api/auth/debug-headers/';
    console.log('DEBUG debugHeaders: making request to:', url);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Origin': 'http://localhost:3000'
    };

    if (storedToken) {
      headers['X-Auth-Token'] = storedToken;
    }

    console.log('DEBUG debugHeaders: sending headers:', headers);

    const response = await fetch(url, {
      method: 'GET',
      headers: headers
    });

    console.log('DEBUG debugHeaders: response status:', response.status);

    if (!response.ok) {
      const text = await response.text();
      console.error('DEBUG debugHeaders: error response:', text);
      throw new Error(`${response.status} ${response.statusText}: ${text}`);
    }

    const data = await response.json();
    console.log('DEBUG debugHeaders: Django received headers:', data);
    return data;
  },

  // Minimal test to see what headers get through
  async simpleTest() {
    console.log('SIMPLE TEST: Starting basic header test...');

    const url = API_HOST + '/api/auth/debug-headers/';

    try {
      // Test 1: No headers
      console.log('SIMPLE TEST 1: No custom headers');
      const response1 = await fetch(url);
      const data1 = await response1.json();
      console.log('SIMPLE TEST 1 result:', data1);

      // Test 2: Simple custom header
      console.log('SIMPLE TEST 2: Simple custom header');
      const response2 = await fetch(url, {
        headers: {
          'X-Test-Header': 'test-value'
        }
      });
      const data2 = await response2.json();
      console.log('SIMPLE TEST 2 result:', data2);

      // Test 3: X-Auth-Token header
      console.log('SIMPLE TEST 3: X-Auth-Token header');
      const response3 = await fetch(url, {
        headers: {
          'X-Auth-Token': 'test-token-123'
        }
      });
      const data3 = await response3.json();
      console.log('SIMPLE TEST 3 result:', data3);

      return { test1: data1, test2: data2, test3: data3 };
    } catch (error) {
      console.error('SIMPLE TEST failed:', error);
      throw error;
    }
  },

  // Test using query parameters (bypasses CORS entirely)
  async queryParamTest() {
    console.log('QUERY PARAM TEST: Testing token via query parameter...');

    const storedToken = typeof window !== 'undefined' ? localStorage.getItem('sandy_access') : null;
    if (!storedToken) {
      throw new Error('No stored token found');
    }

    const url = `${API_HOST}/api/auth/simple-me/?token=${encodeURIComponent(storedToken)}`;
    console.log('QUERY PARAM TEST: Making request to:', url);

    try {
      const response = await fetch(url, {
        method: 'GET'
      });

      console.log('QUERY PARAM TEST: Response status:', response.status);

      if (!response.ok) {
        const text = await response.text();
        console.error('QUERY PARAM TEST: Error response:', text);
        throw new Error(`${response.status} ${response.statusText}: ${text}`);
      }

      const data = await response.json();
      console.log('QUERY PARAM TEST: Success data:', data);
      return data;
    } catch (error) {
      console.error('QUERY PARAM TEST failed:', error);
      throw error;
    }
  },

  // Clear all stored tokens for debugging
  async clearTokens() {
    console.log('CLEAR TOKENS: Removing all stored tokens');
    try {
      localStorage.removeItem('sandy_access');
      localStorage.removeItem('sandy_refresh');
      console.log('CLEAR TOKENS: Tokens cleared successfully');
    } catch (err) {
      console.error('CLEAR TOKENS: Failed to clear tokens', err);
    }
  }
};

export type PostgreSQLServiceType = typeof PostgreSQLService;

// Add to global window object for debugging in browser console
if (typeof window !== 'undefined') {
  (window as any).PostgreSQLService = PostgreSQLService;
}

export default PostgreSQLService;
