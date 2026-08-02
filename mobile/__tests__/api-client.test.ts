jest.mock('expo-secure-store', () => {
  const store: Record<string, string> = {};
  return {
    getItemAsync: jest.fn(async (key: string) => store[key] || null),
    setItemAsync: jest.fn(async (key: string, value: string) => {
      store[key] = value;
    }),
    deleteItemAsync: jest.fn(async (key: string) => {
      delete store[key];
    }),
    _reset: () => Object.keys(store).forEach((k) => delete store[k]),
  };
});

import { api } from '../src/api/client';
import * as SecureStore from 'expo-secure-store';

const mockFetch = jest.fn() as jest.Mock;
global.fetch = mockFetch;

describe('API Client', () => {
  beforeEach(() => {
    mockFetch.mockReset();
    (SecureStore.getItemAsync as jest.Mock).mockReset();
    (SecureStore.setItemAsync as jest.Mock).mockReset();
    (SecureStore.deleteItemAsync as jest.Mock).mockReset();
  });

  describe('request', () => {
    it('sends GET request with correct headers', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ data: 'test' }),
      });

      await api.get('/api/test');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/test'),
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      );
    });

    it('includes auth token when available', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue('test-token');
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ data: 'test' }),
      });

      await api.get('/api/test');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token',
          }),
        })
      );
    });

    it('throws error on non-ok response', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        json: async () => ({ message: 'Not found' }),
      });

      await expect(api.get('/api/missing')).rejects.toEqual({
        message: 'Not found',
        status: 404,
      });
    });

    it('handles 204 No Content', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 204,
      });

      const result = await api.delete('/api/test');
      expect(result).toBeNull();
    });

    it('sends POST with body', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ id: '1' }),
      });

      await api.post('/api/items', { name: 'test' });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ name: 'test' }),
        })
      );
    });

    it('sends PATCH with body', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ id: '1' }),
      });

      await api.patch('/api/items/1', { name: 'updated' });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/items/1'),
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({ name: 'updated' }),
        })
      );
    });

    it('appends query params', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => [],
      });

      await api.get('/api/items', { priority: 'high' });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('priority=high'),
        expect.any(Object)
      );
    });
  });

  describe('sendOtp', () => {
    it('sends OTP to email', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({}),
      });

      await api.sendOtp('test@test.com');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/auth/otp/send'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ email: 'test@test.com' }),
        })
      );
    });
  });

  describe('verifyOtp', () => {
    it('verifies OTP and stores token', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ token: 'auth-token-123' }),
      });

      const result = await api.verifyOtp('test@test.com', '123456');

      expect(result.token).toBe('auth-token-123');
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith('auth_token', 'auth-token-123');
    });
  });

  describe('logout', () => {
    it('clears auth token', async () => {
      await api.logout();
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('auth_token');
    });
  });

  describe('isAuthenticated', () => {
    it('returns true when token exists', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue('token');
      const result = await api.isAuthenticated();
      expect(result).toBe(true);
    });

    it('returns false when no token', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);
      const result = await api.isAuthenticated();
      expect(result).toBe(false);
    });
  });
});
