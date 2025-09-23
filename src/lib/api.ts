// API клиент для работы с backend
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// Отладочная информация
console.log('API_BASE_URL:', API_BASE_URL);
console.log('VITE_API_URL env:', import.meta.env.VITE_API_URL);

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
    
    console.log('Making API request to:', url);
    console.log('Request options:', options);
    
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

      console.log('Response status:', response.status);
      console.log('Response headers:', response.headers);
      
      // Проверяем, является ли ответ JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('Non-JSON response received:', text.substring(0, 200));
        return { error: 'Сервер вернул не JSON ответ' };
      }

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
    published?: boolean;
  }) {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.author_id) searchParams.append('author_id', params.author_id);
    if (params?.published !== undefined) searchParams.append('published', params.published.toString());

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

  // Chat endpoints
  async getChats() {
    return this.request('/chats');
  }

  async getChatMessages(chatId: string) {
    return this.request(`/chats/${chatId}/messages`);
  }

  async sendMessage(chatId: string, content: string) {
    return this.request(`/chats/${chatId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    });
  }

  async createChat(participantId: string) {
    return this.request('/chats', {
      method: 'POST',
      body: JSON.stringify({ participant_id: participantId }),
    });
  }

  // Expert endpoints
  async getExperts(params?: {
    page?: number;
    limit?: number;
    category?: string;
    city?: string;
  }) {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.category) searchParams.append('category', params.category);
    if (params?.city) searchParams.append('city', params.city);

    const queryString = searchParams.toString();
    const endpoint = `/experts${queryString ? `?${queryString}` : ''}`;
    
    return this.request(endpoint);
  }

  async getExpertProfile(expertId: string) {
    return this.request(`/experts/${expertId}`);
  }

  async getExpertServices(expertId: string) {
    return this.request(`/experts/${expertId}/services`);
  }

  async getExpertSchedule(expertId: string, startDate?: string, endDate?: string) {
    const searchParams = new URLSearchParams();
    if (startDate) searchParams.append('start_date', startDate);
    if (endDate) searchParams.append('end_date', endDate);

    const queryString = searchParams.toString();
    const endpoint = `/experts/${expertId}/schedule${queryString ? `?${queryString}` : ''}`;
    
    return this.request(endpoint);
  }

  async createBooking(bookingData: {
    expert_id: string;
    service_id: string;
    slot_id: string;
    booking_date: string;
    start_time: string;
    end_time: string;
  }) {
    return this.request('/bookings', {
      method: 'POST',
      body: JSON.stringify(bookingData),
    });
  }

  async getMyBookings() {
    return this.request('/bookings/my');
  }

  // Categories endpoints
  async getCategories() {
    return this.request('/categories');
  }

  // Likes and favorites endpoints
  async getMyLikes() {
    return this.request('/articles/my-likes');
  }

  async getMyFavorites() {
    return this.request('/articles/my-favorites');
  }

  async likeArticle(articleId: string) {
    return this.request(`/articles/${articleId}/like`, {
      method: 'POST',
    });
  }

  async unlikeArticle(articleId: string) {
    return this.request(`/articles/${articleId}/unlike`, {
      method: 'DELETE',
    });
  }

  async favoriteArticle(articleId: string) {
    return this.request(`/articles/${articleId}/favorite`, {
      method: 'POST',
    });
  }

  async unfavoriteArticle(articleId: string) {
    return this.request(`/articles/${articleId}/unfavorite`, {
      method: 'DELETE',
    });
  }
}

export const apiClient = new ApiClient(API_BASE_URL);
export default apiClient;
