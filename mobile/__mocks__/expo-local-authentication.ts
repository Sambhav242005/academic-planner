const mockLocalAuth = {
  hasHardwareAsync: jest.fn(async () => true),
  isEnrolledAsync: jest.fn(async () => true),
  authenticateAsync: jest.fn(async () => ({ success: true })),
  cancelAuthenticate: jest.fn(),
};

export default mockLocalAuth;