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
  // Automatically attach stored access token (if present) to avoid CSRF/session cookies
  const storedAccess = typeof window !== 'undefined' ? localStorage.getItem('sandy_access') : null;
  const authHeader = storedAccess ? { Authorization: `Bearer ${storedAccess}` } : {};

  // Build headers with correct typing for fetch
  const baseHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(authHeader as Record<string, string>),
    ...((options.headers as Record<string, string>) || {})
  };

  const res = await fetch(url, {
    headers: baseHeaders as HeadersInit,
    // keep include for cases where cookies are still used (e.g., session-based endpoints)
    credentials: 'include',
    ...options
  });

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
    const data = await request('/api/auth/login/', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });

    // TokenObtainPairView returns { access, refresh }
    if (data && data.access) {
      try {
        localStorage.setItem('sandy_access', data.access);
        if (data.refresh) localStorage.setItem('sandy_refresh', data.refresh);
      } catch (err) {
        // ignore storage errors in SSR or private mode
      }
    }

    return data;
  },

  async logout() {
    // Clear stored tokens and call logout endpoint
    try {
      localStorage.removeItem('sandy_access');
      localStorage.removeItem('sandy_refresh');
    } catch (err) {
      // ignore
    }
    return request('/api/auth/logout/', { method: 'POST' });
  },

  async me(token?: string) {
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return request('/api/auth/me/', { headers });
  },

  // Profiles
  async getUserProfile(userId: string) {
    return request(`/api/users/${userId}/profile/`);
  },

  async saveUserProfile(userId: string, profile: any) {
    return request(`/api/users/${userId}/profile/`, {
      method: 'PUT',
      body: JSON.stringify(profile)
    });
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
    return request('/api/health/');
  }
};

export type PostgreSQLServiceType = typeof PostgreSQLService;

export default PostgreSQLService;