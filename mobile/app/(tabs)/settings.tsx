import { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, Alert } from 'react-native';
import { Text, Card, List, Switch, Button, Divider } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { useAppStore } from '../../src/stores/app-store';
import { useSemesters } from '../../src/hooks/useSubjects';
import { isBiometricAvailable, isBiometricEnabled, setBiometricEnabled } from '../../src/biometric';

export default function SettingsScreen() {
  const router = useRouter();
  const { user, logout } = useAppStore();
  const { data: semesters } = useSemesters();
  const [biometricSupported, setBiometricSupported] = useState(false);
  const [biometricOn, setBiometricOn] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      const supported = await isBiometricAvailable();
      setBiometricSupported(supported);
      const enabled = await isBiometricEnabled();
      setBiometricOn(enabled);
    };
    loadData();
  }, []);

  const handleBiometricToggle = async (value: boolean) => {
    if (value) {
      const supported = await isBiometricAvailable();
      if (!supported) {
        Alert.alert('Not Available', 'Biometric authentication is not available on this device');
        return;
      }
    }
    await setBiometricEnabled(value);
    setBiometricOn(value);
  };

  const handleLogout = async () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await SecureStore.deleteItemAsync('auth_token');
          logout();
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  const handleSyncNow = async () => {
    Alert.alert('Sync Complete', 'Your data has been synchronized');
  };

  return (
    <ScrollView style={styles.container}>
      {/* Profile Section */}
      <Card style={styles.sectionCard}>
        <Card.Content>
          <View style={styles.profileHeader}>
            <View style={styles.avatar}>
              <MaterialCommunityIcons name="account" size={32} color="#6366f1" />
            </View>
            <View style={styles.profileInfo}>
              <Text variant="titleMedium">{user?.displayName || 'Student'}</Text>
              <Text variant="bodySmall" style={styles.email}>{user?.email}</Text>
            </View>
          </View>
        </Card.Content>
      </Card>

      {/* Semesters Section */}
      <Card style={styles.sectionCard}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.sectionTitle}>Semesters</Text>
          <Divider style={styles.divider} />
          {(!semesters || semesters.length === 0) ? (
            <Text variant="bodyMedium" style={styles.emptyText}>No semesters added</Text>
          ) : (
            semesters.map((semester) => (
              <List.Item
                key={semester.id}
                title={semester.label}
                description={semester.isActive ? 'Active' : ''}
                left={(props) => <List.Icon {...props} icon="school" />}
                right={() => semester.isActive && <MaterialCommunityIcons name="check" size={20} color="#10b981" />}
              />
            ))
          )}
        </Card.Content>
      </Card>

      {/* Security Section */}
      <Card style={styles.sectionCard}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.sectionTitle}>Security</Text>
          <Divider style={styles.divider} />
          {biometricSupported && (
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <MaterialCommunityIcons name="fingerprint" size={24} color="#6366f1" />
                <View style={styles.settingText}>
                  <Text variant="bodyLarge">Biometric Login</Text>
                  <Text variant="bodySmall" style={styles.settingDescription}>
                    Use fingerprint or face to unlock
                  </Text>
                </View>
              </View>
              <Switch value={biometricOn} onValueChange={handleBiometricToggle} />
            </View>
          )}
        </Card.Content>
      </Card>

      {/* App Info */}
      <Card style={styles.sectionCard}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.sectionTitle}>About</Text>
          <Divider style={styles.divider} />
          <List.Item
            title="Version"
            description="1.0.0"
            left={(props) => <List.Icon {...props} icon="information" />}
          />
          <List.Item
            title="Academic Planner"
            description="Built for Indian MBBS students"
            left={(props) => <List.Icon {...props} icon="school" />}
          />
        </Card.Content>
      </Card>

      {/* Logout Button */}
      <Button
        mode="contained"
        onPress={handleLogout}
        style={styles.logoutButton}
        buttonColor="#ef4444"
      >
        Logout
      </Button>

      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  sectionCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
  },
  sectionTitle: {
    fontWeight: '600',
    marginBottom: 8,
  },
  divider: {
    marginBottom: 8,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#e0e7ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInfo: {
    flex: 1,
  },
  email: {
    opacity: 0.7,
    marginTop: 2,
  },
  emptyText: {
    opacity: 0.7,
    paddingVertical: 12,
  },
  syncInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  syncText: {
    flex: 1,
  },
  syncButton: {
    alignSelf: 'flex-start',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  settingText: {
    flex: 1,
  },
  settingDescription: {
    opacity: 0.7,
    marginTop: 2,
  },
  logoutButton: {
    marginHorizontal: 16,
    marginTop: 8,
  },
});
