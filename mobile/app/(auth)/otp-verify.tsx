import { useState, useRef } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { TextInput, Button, Text, Surface } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { api } from '../../src/api/client';
import { useAppStore } from '../../src/stores/app-store';

export default function OtpVerifyScreen() {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const inputRefs = useRef<any[]>([]);
  const router = useRouter();
  const { user, setAuthenticated } = useAppStore();

  const handleOtpChange = (text: string, index: number) => {
    if (text.length > 1) {
      text = text.slice(-1);
    }

    const newOtp = [...otp];
    newOtp[index] = text;
    setOtp(newOtp);

    if (text && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e: { nativeEvent: { key: string } }, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    const otpString = otp.join('');
    if (otpString.length !== 6) {
      setError('Please enter the complete OTP');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await api.verifyOtp(user?.email || '', otpString);
      setAuthenticated(true);
      router.replace('/(tabs)');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    try {
      await api.sendOtp(user?.email || '');
      setError('');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to resend OTP');
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <Surface style={styles.card} elevation={2}>
        <Text variant="headlineMedium" style={styles.title}>
          Verify OTP
        </Text>
        <Text variant="bodyLarge" style={styles.subtitle}>
          Enter the 6-digit code sent to {user?.email}
        </Text>

        <View style={styles.otpContainer}>
          {otp.map((digit, index) => (
            <TextInput
              key={index}
              ref={(ref: any) => (inputRefs.current[index] = ref)}
              value={digit}
              onChangeText={(text) => handleOtpChange(text, index)}
              onKeyPress={(e) => handleKeyPress(e, index)}
              keyboardType="number-pad"
              maxLength={1}
              style={styles.otpInput}
              textAlign="center"
              disabled={loading}
            />
          ))}
        </View>

        {error ? (
          <Text variant="bodySmall" style={styles.error}>
            {error}
          </Text>
        ) : null}

        <Button
          mode="contained"
          onPress={handleVerify}
          loading={loading}
          disabled={loading || otp.join('').length !== 6}
          style={styles.button}
        >
          Verify
        </Button>

        <Button
          mode="text"
          onPress={handleResend}
          disabled={loading}
          style={styles.resendButton}
        >
          Resend OTP
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
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 16,
  },
  otpInput: {
    width: 48,
    height: 48,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    fontSize: 24,
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
  resendButton: {
    marginTop: 8,
  },
});
