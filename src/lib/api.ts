// API клиент для работы с backend
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

class ApiClient {
  private baseURL: string;
  private token: string | null = null;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
    this.token = localStorage.getItem('accessToken');
  }

  setToken(token: string) {
    this.token = token;
    localStorage.setItem('accessToken', token);
  }

  clearToken() {
    this.token = null;
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseURL}${endpoint}`;
    
    const headers: any = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        // Если токен истек, пытаемся обновить его
        if (response.status === 401 && this.token) {
          const refreshed = await this.refreshToken();
          if (refreshed) {
            // Повторяем запрос с новым токеном
            headers.Authorization = `Bearer ${this.token}`;
            const retryResponse = await fetch(url, {
              ...options,
              headers,
            });
            return await retryResponse.json();
          }
        }
        
        return { error: data.error || 'Ошибка сервера' };
      }

      return { data };
    } catch (error) {
      console.error('API Error:', error);
      return { error: 'Ошибка сети' };
    }
  }

  private async refreshToken(): Promise<boolean> {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) return false;

    try {
      const response = await fetch(`${this.baseURL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken }),
      });

      if (response.ok) {
        const data = await response.json();
        this.setToken(data.accessToken);
        localStorage.setItem('refreshToken', data.refreshToken);
        return true;
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
    }

    this.clearToken();
    return false;
  }

  // Auth endpoints
  async register(userData: {
    email: string;
    password: string;
    full_name: string;
  }) {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async login(credentials: { email: string; password: string }) {
    const response = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });

    if (response.data) {
      this.setToken((response.data as any).accessToken);
      localStorage.setItem('refreshToken', (response.data as any).refreshToken);
    }

    return response;
  }

  async logout() {
    const response = await this.request('/auth/logout', {
      method: 'POST',
    });
    this.clearToken();
    return response;
  }

  // Profile endpoints
  async getProfile(userId?: string) {
    const endpoint = userId ? `/profile/${userId}` : '/profile/me';
    return this.request(endpoint);
  }

  async updateProfile(profileData: Partial<{
    full_name: string;
    bio: string;
    website_url: string;
    github_url: string;
    linkedin_url: string;
    twitter_url: string;
    instagram_url: string;
    telegram_url: string;
  }>) {
    return this.request('/profile/me', {
      method: 'PUT',
      body: JSON.stringify(profileData),
    });
  }

  async uploadAvatar(file: File) {
    const formData = new FormData();
    formData.append('avatar', file);

    const response = await fetch(`${this.baseURL}/profile/me/avatar`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.token}`,
      },
      body: formData,
    });

    return response.json();
  }

  // Articles endpoints
  async getArticles(params?: {
    page?: number;
    limit?: number;
    author_id?: string;
  }) {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.author_id) searchParams.append('author_id', params.author_id);

    const queryString = searchParams.toString();
    const endpoint = `/articles${queryString ? `?${queryString}` : ''}`;
    
    return this.request(endpoint);
  }

  async getMyArticles() {
    return this.request('/articles/my');
  }

  async getArticle(id: string) {
    return this.request(`/articles/${id}`);
  }

  async createArticle(articleData: {
    title: string;
    content: string;
    published?: boolean;
  }) {
    return this.request('/articles', {
      method: 'POST',
      body: JSON.stringify(articleData),
    });
  }

  async updateArticle(id: string, articleData: {
    title?: string;
    content?: string;
    published?: boolean;
  }) {
    return this.request(`/articles/${id}`, {
      method: 'PUT',
      body: JSON.stringify(articleData),
    });
  }

  async deleteArticle(id: string) {
    return this.request(`/articles/${id}`, {
      method: 'DELETE',
    });
  }

  // Friendships endpoints
  async getFriendships(status?: string) {
    const endpoint = status ? `/friendships?status=${status}` : '/friendships';
    return this.request(endpoint);
  }

  async sendFriendRequest(friendId: string) {
    return this.request('/friendships/request', {
      method: 'POST',
      body: JSON.stringify({ friend_id: friendId }),
    });
  }

  async respondToFriendRequest(id: string, status: 'accepted' | 'rejected') {
    return this.request(`/friendships/${id}/respond`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }

  async deleteFriendship(id: string) {
    return this.request(`/friendships/${id}`, {
      method: 'DELETE',
    });
  }

  // Notifications endpoints
  async getNotifications() {
    return this.request('/notifications');
  }

  async markNotificationAsRead(id: string) {
    return this.request(`/notifications/${id}/read`, {
      method: 'PATCH',
    });
  }

  async markAllNotificationsAsRead() {
    return this.request('/notifications/read-all', {
      method: 'PATCH',
    });
  }

  async deleteNotification(id: string) {
    return this.request(`/notifications/${id}`, {
      method: 'DELETE',
    });
  }

  async getUnreadCount() {
    return this.request('/notifications/unread-count');
  }
}

export const apiClient = new ApiClient(API_BASE_URL);
export default apiClient;
