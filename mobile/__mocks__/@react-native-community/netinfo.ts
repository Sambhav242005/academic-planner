const mockNetInfo = {
  fetch: jest.fn(async () => ({
    isConnected: true,
    isInternetReachable: true,
    type: 'wifi',
    isWifi: true,
    isCellular: false,
  })),
  addEventListener: jest.fn(() => jest.fn()),
  useNetInfo: jest.fn(() => ({
    isConnected: true,
    isInternetReachable: true,
  })),
};

export default mockNetInfo;