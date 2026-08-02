import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PaperProvider, DefaultTheme } from 'react-native-paper';
import { StatusBar } from 'expo-status-bar';
import { useAppStore } from '../src/stores/app-store';
import { registerForPushNotifications } from '../src/notifications/scheduler';
import * as SecureStore from 'expo-secure-store';
import { authenticateWithBiometrics, isBiometricEnabled } from '../src/biometric';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000,
      retry: 2,
    },
  },
});

const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: '#6366f1',
    secondary: '#8b5cf6',
  },
};

export default function RootLayout() {
  const { setAuthenticated } = useAppStore();

  useEffect(() => {
    const initializeApp = async () => {
      // Check for existing auth token
      const token = await SecureStore.getItemAsync('auth_token');
      if (token) {
        // Try biometric auth
        const biometricEnabled = await isBiometricEnabled();
        if (biometricEnabled) {
          const success = await authenticateWithBiometrics();
          if (!success) {
            // Biometric failed, stay on login
            return;
          }
        }
        setAuthenticated(true);
      }

      // Register for notifications
      registerForPushNotifications();
    };
    initializeApp();
  }, [setAuthenticated]);

  return (
    <QueryClientProvider client={queryClient}>
      <PaperProvider theme={theme}>
        <StatusBar style="auto" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen
            name="add-modal"
            options={{
              presentation: 'modal',
              headerShown: true,
              title: 'Quick Add',
            }}
          />
        </Stack>
      </PaperProvider>
    </QueryClientProvider>
  );
}
