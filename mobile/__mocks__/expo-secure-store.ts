const mockStore: Record<string, string> = {};

const mockSecureStore = {
  getItemAsync: jest.fn(async (key: string) => mockStore[key] || null),
  setItemAsync: jest.fn(async (key: string, value: string) => {
    mockStore[key] = value;
  }),
  deleteItemAsync: jest.fn(async (key: string) => {
    delete mockStore[key];
  }),
  _reset: () => {
    Object.keys(mockStore).forEach((key) => delete mockStore[key]);
  },
};

export default mockSecureStore;