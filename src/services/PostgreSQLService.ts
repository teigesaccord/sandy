/* Lightweight client that forwards database-related calls to the Django backend (DRF).
   The frontend/Next API should call Django endpoints (e.g., /api/auth/login/) rather than executing DB logic in TypeScript.

   Note: Update API_HOST if Django runs on a different origin during development.
*/

const API_HOST = process.env.NEXT_PUBLIC_API_HOST || '';

async function request(path: string, options: RequestInit = {}) {
  const url = API_HOST + path;
  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    },
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
    return request('/api/auth/login/', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
  },

  async logout() {
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

export default PostgreSQLService;