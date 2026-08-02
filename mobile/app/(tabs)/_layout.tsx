import { useState } from 'react';
import { StyleSheet } from 'react-native';
import { Tabs, useRouter } from 'expo-router';
import { FAB, Portal } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function TabsLayout() {
  const [fabOpen, setFabOpen] = useState(false);
  const router = useRouter();

  const fabActions = [
    { icon: 'book-plus', label: 'Add Subject', onPress: () => router.push('/add-modal?type=subject') },
    { icon: 'calendar-plus', label: 'Add Class', onPress: () => router.push('/add-modal?type=class') },
    { icon: 'checkbox-marked-circle-plus', label: 'Add Task', onPress: () => router.push('/add-modal?type=task') },
    { icon: 'check-circle', label: 'Mark Attendance', onPress: () => router.push('/add-modal?type=attendance') },
  ];

  return (
    <>
      <Tabs
        screenOptions={{
          headerShown: true,
          tabBarActiveTintColor: '#6366f1',
          tabBarInactiveTintColor: '#94a3b8',
          tabBarStyle: {
            height: 60,
            paddingBottom: 8,
            paddingTop: 8,
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Home',
            tabBarIcon: ({ color, size }) => (
              <MaterialCommunityIcons name="home" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="calendar"
          options={{
            title: 'Calendar',
            tabBarIcon: ({ color, size }) => (
              <MaterialCommunityIcons name="calendar" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="tasks"
          options={{
            title: 'Tasks',
            tabBarIcon: ({ color, size }) => (
              <MaterialCommunityIcons name="checkbox-marked" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="analytics"
          options={{
            title: 'Analytics',
            tabBarIcon: ({ color, size }) => (
              <MaterialCommunityIcons name="chart-line" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: 'Settings',
            tabBarIcon: ({ color, size }) => (
              <MaterialCommunityIcons name="cog" size={size} color={color} />
            ),
          }}
        />
      </Tabs>

      <Portal>
        <FAB.Group
          open={fabOpen}
          visible
          icon={fabOpen ? 'close' : 'plus'}
          actions={fabActions}
          onStateChange={({ open }) => setFabOpen(open)}
          onPress={() => {
            if (fabOpen) {
              // Do nothing - action was already pressed
            }
          }}
          style={styles.fab}
        />
      </Portal>
    </>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 76,
  },
});
