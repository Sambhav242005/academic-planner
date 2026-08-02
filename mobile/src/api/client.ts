import * as SecureStore from 'expo-secure-store';

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'https://planner.sambhav-surana.online';

interface RequestOptions extends RequestInit {
  params?: Record<string, string>;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async getToken(): Promise<string | null> {
    return SecureStore.getItemAsync('auth_token');
  }

  private buildUrl(endpoint: string, params?: Record<string, string>): string {
    const url = new URL(`${this.baseUrl}${endpoint}`);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, value);
      });
    }
    return url.toString();
  }

  async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const { params, ...fetchOptions } = options;
    const token = await this.getToken();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(fetchOptions.headers as Record<string, string>),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const url = this.buildUrl(endpoint, params);

    const response = await fetch(url, {
      ...fetchOptions,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Request failed' }));
      throw { message: error.message || 'Request failed', status: response.status };
    }

    if (response.status === 204) {
      return null as T;
    }

    return response.json();
  }

  async get<T>(endpoint: string, params?: Record<string, string>): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET', params });
  }

  async post<T>(endpoint: string, body?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async patch<T>(endpoint: string, body?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  async sendOtp(email: string): Promise<void> {
    await this.post('/api/auth/otp/send', { email });
  }

  async verifyOtp(email: string, otp: string): Promise<{ token: string }> {
    const result = await this.post<{ token: string }>('/api/auth/otp/verify', { email, otp });
    if (result.token) {
      await SecureStore.setItemAsync('auth_token', result.token);
    }
    return result;
  }

  async logout(): Promise<void> {
    await SecureStore.deleteItemAsync('auth_token');
  }

  isAuthenticated(): Promise<boolean> {
    return this.getToken().then((t) => !!t);
  }
}

export const api = new ApiClient(API_BASE);
