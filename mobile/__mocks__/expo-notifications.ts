const mockNotifications: unknown[] = [];

const mockNotificationsModule = {
  setNotificationHandler: jest.fn(),
  scheduleNotificationAsync: jest.fn(async (notification: unknown) => {
    mockNotifications.push(notification);
    return 'notification-id';
  }),
  cancelAllScheduledNotificationsAsync: jest.fn(async () => {}),
  cancelScheduledNotificationAsync: jest.fn(async () => {}),
  getAllScheduledNotificationsAsync: jest.fn(async () => mockNotifications),
  requestPermissionsAsync: jest.fn(async () => ({ status: 'granted' })),
  getPermissionsAsync: jest.fn(async () => ({ status: 'granted' })),
  _mockNotifications: mockNotifications,
};

export default mockNotificationsModule;