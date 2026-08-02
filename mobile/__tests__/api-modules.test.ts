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

import { subjectsApi, semestersApi } from '../src/api/subjects';
import { tasksApi } from '../src/api/tasks';
import * as SecureStore from 'expo-secure-store';

const mockFetch = jest.fn() as jest.Mock;
global.fetch = mockFetch;

beforeEach(() => {
  mockFetch.mockReset();
  (SecureStore.getItemAsync as jest.Mock).mockReset();
});

describe('Subjects API', () => {
  it('lists subjects', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => [{ id: '1', name: 'Math', color: '#3b82f6' }],
    });

    const result = await subjectsApi.list();

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Math');
  });

  it('creates a subject', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ id: '2', name: 'Physics', color: '#ef4444' }),
    });

    const result = await subjectsApi.create({ name: 'Physics', color: '#ef4444', semesterId: 'sem-1' });

    expect(result.id).toBe('2');
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/subjects'),
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('updates a subject', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ id: '1', name: 'Math Updated' }),
    });

    const result = await subjectsApi.update('1', { name: 'Math Updated' });

    expect(result.name).toBe('Math Updated');
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/subjects/1'),
      expect.objectContaining({ method: 'PATCH' })
    );
  });

  it('deletes a subject', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 204,
    });

    await subjectsApi.delete('1');

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/subjects/1'),
      expect.objectContaining({ method: 'DELETE' })
    );
  });
});

describe('Semesters API', () => {
  it('lists semesters', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => [{ id: '1', label: 'Sem 1', isActive: true }],
    });

    const result = await semestersApi.list();

    expect(result).toHaveLength(1);
  });

  it('creates a semester', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ id: '2', label: 'Sem 2', isActive: false }),
    });

    const result = await semestersApi.create({ label: 'Sem 2' });

    expect(result.label).toBe('Sem 2');
  });

  it('updates a semester', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ id: '1', label: 'Sem 1 Updated' }),
    });

    const result = await semestersApi.update('1', { label: 'Sem 1 Updated' });

    expect(result.label).toBe('Sem 1 Updated');
  });

  it('deletes a semester', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 204,
    });

    await semestersApi.delete('1');

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/semesters/1'),
      expect.objectContaining({ method: 'DELETE' })
    );
  });
});

describe('Tasks API', () => {
  it('lists tasks', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => [{ id: '1', title: 'Study', completed: false, priority: 'medium' }],
    });

    const result = await tasksApi.list();

    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('Study');
  });

  it('creates a task', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ id: '2', title: 'New Task', completed: false, priority: 'high' }),
    });

    const result = await tasksApi.create({ title: 'New Task', priority: 'high' });

    expect(result.title).toBe('New Task');
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/tasks'),
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('updates a task', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ id: '1', title: 'Study', completed: true }),
    });

    const result = await tasksApi.update('1', { completed: true });

    expect(result.completed).toBe(true);
  });

  it('deletes a task', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 204,
    });

    await tasksApi.delete('1');

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/tasks/1'),
      expect.objectContaining({ method: 'DELETE' })
    );
  });

  it('filters tasks by priority', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => [{ id: '1', title: 'High Task', priority: 'high' }],
    });

    await tasksApi.list({ priority: 'high' });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/tasks'),
      expect.objectContaining({
        method: 'GET',
      })
    );
  });
});
