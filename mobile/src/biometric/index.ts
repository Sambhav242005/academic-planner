import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';

const BIOMETRIC_ENABLED_KEY = 'biometric_enabled';

export async function isBiometricAvailable(): Promise<boolean> {
  const hasHardware = await LocalAuthentication.hasHardwareAsync();
  const isEnrolled = await LocalAuthentication.isEnrolledAsync();
  return hasHardware && isEnrolled;
}

export async function isBiometricEnabled(): Promise<boolean> {
  const value = await SecureStore.getItemAsync(BIOMETRIC_ENABLED_KEY);
  return value === 'true';
}

export async function setBiometricEnabled(enabled: boolean): Promise<void> {
  await SecureStore.setItemAsync(BIOMETRIC_ENABLED_KEY, enabled ? 'true' : 'false');
}

export async function authenticateWithBiometrics(): Promise<boolean> {
  const compatible = await isBiometricAvailable();
  if (!compatible) return false;

  const enabled = await isBiometricEnabled();
  if (!enabled) return false;

  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: 'Unlock Academic Planner',
    cancelLabel: 'Use Password',
    disableDeviceFallback: false,
  });

  return result.success;
}

export async function getBiometricType(): Promise<string | null> {
  const hasHardware = await LocalAuthentication.hasHardwareAsync();
  if (!hasHardware) return null;

  const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
  if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
    return 'Face ID';
  }
  if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
    return 'Fingerprint';
  }
  return null;
}
