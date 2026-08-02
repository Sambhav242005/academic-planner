import { View, ScrollView, StyleSheet } from 'react-native';
import { Text, Card, Surface, Chip, Divider } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useDashboard } from '../../src/hooks/useDashboard';
import { useAppStore } from '../../src/stores/app-store';
import { formatTime, getDayName } from '../../src/utils/dates';

export default function DashboardScreen() {
  const { data, isLoading } = useDashboard();
  const user = useAppStore((s) => s.user);

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <Text>Loading...</Text>
      </View>
    );
  }

  const greeting = getGreeting();
  const dayName = getDayName(new Date().getDay());

  return (
    <ScrollView style={styles.container}>
      <Surface style={styles.header} elevation={0}>
        <Text variant="headlineSmall" style={styles.greeting}>
          {greeting}, {user?.displayName || 'Student'} 👋
        </Text>
        <Text variant="bodyMedium" style={styles.date}>
          {dayName}, {new Date().toLocaleDateString('en-IN', { month: 'long', day: 'numeric' })}
        </Text>
      </Surface>

      {/* Stats Cards */}
      <View style={styles.statsRow}>
        <Card style={[styles.statCard, { backgroundColor: '#e0e7ff' }]}>
          <Card.Content>
            <MaterialCommunityIcons name="book" size={24} color="#6366f1" />
            <Text variant="headlineMedium">{data?.subjects?.length || 0}</Text>
            <Text variant="bodySmall">Subjects</Text>
          </Card.Content>
        </Card>

        <Card style={[styles.statCard, { backgroundColor: '#dbeafe' }]}>
          <Card.Content>
            <MaterialCommunityIcons name="checkbox-marked" size={24} color="#3b82f6" />
            <Text variant="headlineMedium">{data?.stats?.total || 0}</Text>
            <Text variant="bodySmall">Classes</Text>
          </Card.Content>
        </Card>

        <Card style={[styles.statCard, { backgroundColor: '#d1fae5' }]}>
          <Card.Content>
            <MaterialCommunityIcons name="percent" size={24} color="#10b981" />
            <Text variant="headlineMedium">{data?.stats?.percentage?.toFixed(0) || 0}%</Text>
            <Text variant="bodySmall">Attendance</Text>
          </Card.Content>
        </Card>
      </View>

      {/* Today's Classes */}
      <Card style={styles.sectionCard}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Today&apos;s Classes
          </Text>
          <Divider style={styles.divider} />

          {(!data?.todayClasses || data.todayClasses.length === 0) ? (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="calendar-blank" size={48} color="#94a3b8" />
              <Text variant="bodyMedium" style={styles.emptyText}>
                No classes today
              </Text>
            </View>
          ) : (
            data.todayClasses.map((cls, index) => (
              <View key={index} style={styles.classItem}>
                <View style={[styles.colorDot, { backgroundColor: cls.subject?.color || '#6366f1' }]} />
                <View style={styles.classInfo}>
                  <Text variant="bodyLarge" style={styles.className}>
                    {cls.subject?.name || 'Unknown'}
                  </Text>
                  <Text variant="bodySmall" style={styles.classTime}>
                    {formatTime(cls.startTime)} • {cls.classType}
                  </Text>
                </View>
                <Chip compact style={styles.classTypeChip}>
                  {cls.classType}
                </Chip>
              </View>
            ))
          )}
        </Card.Content>
      </Card>

      {/* Attendance Overview */}
      <Card style={styles.sectionCard}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Attendance Overview
          </Text>
          <Divider style={styles.divider} />

          <View style={styles.attendanceGrid}>
            <View style={styles.attendanceItem}>
              <MaterialCommunityIcons name="check-circle" size={20} color="#10b981" />
              <Text variant="bodyMedium">{data?.stats?.present || 0}</Text>
              <Text variant="bodySmall">Present</Text>
            </View>
            <View style={styles.attendanceItem}>
              <MaterialCommunityIcons name="close-circle" size={20} color="#ef4444" />
              <Text variant="bodyMedium">{data?.stats?.absent || 0}</Text>
              <Text variant="bodySmall">Absent</Text>
            </View>
            <View style={styles.attendanceItem}>
              <MaterialCommunityIcons name="cancel" size={20} color="#f59e0b" />
              <Text variant="bodyMedium">{data?.stats?.cancelled || 0}</Text>
              <Text variant="bodySmall">Cancelled</Text>
            </View>
            <View style={styles.attendanceItem}>
              <MaterialCommunityIcons name="beach" size={20} color="#8b5cf6" />
              <Text variant="bodyMedium">{data?.stats?.holiday || 0}</Text>
              <Text variant="bodySmall">Holiday</Text>
            </View>
          </View>
        </Card.Content>
      </Card>

      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    padding: 20,
    paddingBottom: 8,
  },
  greeting: {
    fontWeight: 'bold',
  },
  date: {
    opacity: 0.7,
    marginTop: 4,
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    borderRadius: 12,
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
    marginBottom: 12,
  },
  emptyState: {
    alignItems: 'center',
    padding: 24,
  },
  emptyText: {
    marginTop: 8,
    opacity: 0.7,
  },
  classItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e2e8f0',
  },
  colorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  classInfo: {
    flex: 1,
  },
  className: {
    fontWeight: '500',
  },
  classTime: {
    opacity: 0.7,
    marginTop: 2,
  },
  classTypeChip: {
    height: 28,
  },
  attendanceGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
  },
  attendanceItem: {
    alignItems: 'center',
    gap: 4,
  },
});
