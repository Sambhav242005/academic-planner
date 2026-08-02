import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import type { RecurringClass, Task, Subject } from '../types';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function registerForPushNotifications(): Promise<string | undefined> {
  if (!Device.isDevice) {
    console.warn('Push notifications require a physical device');
    return undefined;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.warn('Push notification permission not granted');
    return undefined;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('classes', {
      name: 'Class Reminders',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
    });

    await Notifications.setNotificationChannelAsync('tasks', {
      name: 'Task Reminders',
      importance: Notifications.AndroidImportance.HIGH,
    });

    await Notifications.setNotificationChannelAsync('attendance', {
      name: 'Attendance Alerts',
      importance: Notifications.AndroidImportance.HIGH,
    });
  }

  return undefined;
}

export async function scheduleClassReminders(
  classes: (RecurringClass & { subject: Subject })[]
): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();

  for (const cls of classes) {
    const [hours, minutes] = cls.startTime.split(':').map(Number);
    const reminderMinutes = minutes - 15;
    const reminderHour = reminderMinutes < 0 ? hours - 1 : hours;
    const reminderMin = reminderMinutes < 0 ? reminderMinutes + 60 : reminderMinutes;

    if (reminderHour < 0) continue;

    await Notifications.scheduleNotificationAsync({
      content: {
        title: `📚 ${cls.subject?.name || 'Class'}`,
        body: `${cls.classType} class in 15 minutes`,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
        weekday: cls.dayOfWeek + 1,
        hour: reminderHour,
        minute: reminderMin,
      },
    });
  }
}

export async function scheduleTaskReminder(task: Task, subject?: Subject): Promise<void> {
  if (!task.dueDate) return;

  const dueDate = new Date(task.dueDate);
  dueDate.setHours(9, 0, 0, 0);

  await Notifications.scheduleNotificationAsync({
    content: {
      title: '📝 Task Due Today',
      body: `${subject?.name ? subject.name + ': ' : ''}${task.title}`,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: dueDate,
    },
  });
}

export async function scheduleOverdueAlert(task: Task, subject?: Subject): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: '⚠️ Overdue Task',
      body: `${subject?.name ? subject.name + ': ' : ''}${task.title} was due yesterday`,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: new Date(Date.now() + 60000),
    },
  });
}

export async function scheduleAttendanceWarning(
  subjectName: string,
  percentage: number
): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: '🔔 Attendance Warning',
      body: `${subjectName}: ${percentage.toFixed(1)}% attendance (below 75%)`,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: new Date(Date.now() + 5000),
    },
  });
}

export async function scheduleDailySummary(
  classCount: number,
  pendingTasks: number
): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: '📋 Daily Summary',
      body: `You have ${classCount} classes today${pendingTasks > 0 ? ` and ${pendingTasks} pending tasks` : ''}`,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: 8,
      minute: 0,
    },
  });
}

export function addNotificationListener(
  handler: (notification: Notifications.Notification) => void
): Notifications.Subscription {
  return Notifications.addNotificationReceivedListener(handler);
}

export function addResponseListener(
  handler: (response: Notifications.NotificationResponse) => void
): Notifications.Subscription {
  return Notifications.addNotificationResponseReceivedListener(handler);
}
