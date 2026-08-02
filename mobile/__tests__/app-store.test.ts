import { useAppStore } from '../src/stores/app-store';

describe('App Store', () => {
  beforeEach(() => {
    useAppStore.setState({
      isAuthenticated: false,
      isOnboarded: false,
      user: null,
      activeSemesterId: null,
    });
  });

  it('has correct initial state', () => {
    const state = useAppStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.isOnboarded).toBe(false);
    expect(state.user).toBeNull();
    expect(state.activeSemesterId).toBeNull();
  });

  it('sets authentication', () => {
    useAppStore.getState().setAuthenticated(true);
    expect(useAppStore.getState().isAuthenticated).toBe(true);
  });

  it('sets onboarded', () => {
    useAppStore.getState().setOnboarded(true);
    expect(useAppStore.getState().isOnboarded).toBe(true);
  });

  it('sets user', () => {
    const user = { id: '1', email: 'test@test.com', displayName: 'Test User' };
    useAppStore.getState().setUser(user);
    expect(useAppStore.getState().user).toEqual(user);
  });

  it('sets active semester id', () => {
    useAppStore.getState().setActiveSemesterId('sem-123');
    expect(useAppStore.getState().activeSemesterId).toBe('sem-123');
  });

  it('clears active semester id', () => {
    useAppStore.getState().setActiveSemesterId('sem-123');
    useAppStore.getState().setActiveSemesterId(null);
    expect(useAppStore.getState().activeSemesterId).toBeNull();
  });

  it('logout clears all state', () => {
    useAppStore.getState().setAuthenticated(true);
    useAppStore.getState().setOnboarded(true);
    useAppStore.getState().setUser({ id: '1', email: 'test@test.com', displayName: 'Test' });
    useAppStore.getState().setActiveSemesterId('sem-123');

    useAppStore.getState().logout();

    const state = useAppStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.isOnboarded).toBe(false);
    expect(state.user).toBeNull();
    expect(state.activeSemesterId).toBeNull();
  });
});
