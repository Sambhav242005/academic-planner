import { useState } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { Text, Card, SegmentedButtons, ProgressBar, Divider } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSubjects } from '../../src/hooks/useSubjects';
import { useDashboard } from '../../src/hooks/useDashboard';

export default function AnalyticsScreen() {
  const [period, setPeriod] = useState<'week' | 'month' | 'semester' | 'overall'>('semester');
  const { data: dashboardData } = useDashboard();
  const { data: subjects } = useSubjects();

  const stats = dashboardData?.stats;

  return (
    <ScrollView style={styles.container}>
      <SegmentedButtons
        value={period}
        onValueChange={(value) => setPeriod(value as 'week' | 'month' | 'semester' | 'overall')}
        buttons={[
          { value: 'week', label: 'Week' },
          { value: 'month', label: 'Month' },
          { value: 'semester', label: 'Semester' },
          { value: 'overall', label: 'Overall' },
        ]}
        style={styles.periodSelector}
      />

      {/* Overall Stats */}
      <Card style={styles.statsCard}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Attendance Statistics
          </Text>
          <Divider style={styles.divider} />

          <View style={styles.percentageContainer}>
            <Text variant="displayLarge" style={styles.percentage}>
              {stats?.percentage?.toFixed(1) || '0.0'}%
            </Text>
            <Text variant="bodyMedium" style={styles.percentageLabel}>
              Overall Attendance
            </Text>
          </View>

          <ProgressBar
            progress={(stats?.percentage || 0) / 100}
            color={stats?.percentage && stats.percentage >= 75 ? '#10b981' : '#ef4444'}
            style={styles.progressBar}
          />

          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text variant="headlineSmall" style={[styles.statValue, { color: '#10b981' }]}>
                {stats?.present || 0}
              </Text>
              <Text variant="bodySmall">Present</Text>
            </View>
            <View style={styles.statItem}>
              <Text variant="headlineSmall" style={[styles.statValue, { color: '#ef4444' }]}>
                {stats?.absent || 0}
              </Text>
              <Text variant="bodySmall">Absent</Text>
            </View>
            <View style={styles.statItem}>
              <Text variant="headlineSmall" style={[styles.statValue, { color: '#f59e0b' }]}>
                {stats?.cancelled || 0}
              </Text>
              <Text variant="bodySmall">Cancelled</Text>
            </View>
            <View style={styles.statItem}>
              <Text variant="headlineSmall" style={[styles.statValue, { color: '#8b5cf6' }]}>
                {stats?.holiday || 0}
              </Text>
              <Text variant="bodySmall">Holiday</Text>
            </View>
          </View>
        </Card.Content>
      </Card>

      {/* Per Subject Breakdown */}
      <Card style={styles.subjectsCard}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Subject-wise Attendance
          </Text>
          <Divider style={styles.divider} />

          {(!subjects || subjects.length === 0) ? (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="book-open-variant" size={48} color="#94a3b8" />
              <Text variant="bodyMedium" style={styles.emptyText}>
                No subjects added yet
              </Text>
            </View>
          ) : (
            subjects.map((subject) => (
              <View key={subject.id} style={styles.subjectItem}>
                <View style={[styles.colorDot, { backgroundColor: subject.color }]} />
                <View style={styles.subjectInfo}>
                  <Text variant="bodyLarge" style={styles.subjectName}>
                    {subject.name}
                  </Text>
                  <ProgressBar
                    progress={0.85}
                    color={subject.color}
                    style={styles.subjectProgress}
                  />
                </View>
                <Text variant="bodyMedium" style={styles.subjectPercentage}>
                  85%
                </Text>
              </View>
            ))
          )}
        </Card.Content>
      </Card>

      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  periodSelector: {
    margin: 16,
    marginBottom: 8,
  },
  statsCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
  },
  sectionTitle: {
    fontWeight: '600',
    marginBottom: 8,
  },
  divider: {
    marginBottom: 16,
  },
  percentageContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  percentage: {
    fontWeight: 'bold',
    color: '#6366f1',
  },
  percentageLabel: {
    opacity: 0.7,
    marginTop: 4,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontWeight: 'bold',
  },
  subjectsCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
  },
  emptyState: {
    alignItems: 'center',
    padding: 24,
  },
  emptyText: {
    marginTop: 8,
    opacity: 0.7,
  },
  subjectItem: {
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
  subjectInfo: {
    flex: 1,
  },
  subjectName: {
    fontWeight: '500',
    marginBottom: 4,
  },
  subjectProgress: {
    height: 6,
    borderRadius: 3,
  },
  subjectPercentage: {
    fontWeight: '600',
    marginLeft: 12,
  },
});
