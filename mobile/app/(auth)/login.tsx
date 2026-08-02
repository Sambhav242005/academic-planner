import { useState } from 'react';
import { StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { TextInput, Button, Text, Surface } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { api } from '../../src/api/client';
import { useAppStore } from '../../src/stores/app-store';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const { setUser } = useAppStore();

  const handleSendOtp = async () => {
    if (!email.trim()) {
      setError('Please enter your email');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await api.sendOtp(email.trim());
      setUser({ id: '', email: email.trim(), displayName: '' });
      router.push('/(auth)/otp-verify');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <Surface style={styles.card} elevation={2}>
        <Text variant="headlineMedium" style={styles.title}>
          Academic Planner
        </Text>
        <Text variant="bodyLarge" style={styles.subtitle}>
          Sign in to continue
        </Text>

        <TextInput
          label="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          style={styles.input}
          disabled={loading}
        />

        {error ? (
          <Text variant="bodySmall" style={styles.error}>
            {error}
          </Text>
        ) : null}

        <Button
          mode="contained"
          onPress={handleSendOtp}
          loading={loading}
          disabled={loading || !email.trim()}
          style={styles.button}
        >
          Send OTP
        </Button>
      </Surface>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  card: {
    padding: 24,
    borderRadius: 16,
  },
  title: {
    textAlign: 'center',
    marginBottom: 8,
    fontWeight: 'bold',
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: 24,
    opacity: 0.7,
  },
  input: {
    marginBottom: 16,
  },
  error: {
    color: '#ef4444',
    marginBottom: 12,
    textAlign: 'center',
  },
  button: {
    marginTop: 8,
    paddingVertical: 4,
  },
});
