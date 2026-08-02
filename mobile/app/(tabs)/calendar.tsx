import { useState } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { Text, Card, Chip } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { calendarApi } from '../../src/api';
import { useSubjects } from '../../src/hooks/useSubjects';
import { formatTime, getMonthDays } from '../../src/utils/dates';

export default function CalendarScreen() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const currentMonth = selectedDate.getMonth();
  const currentYear = selectedDate.getFullYear();

  const startDate = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-01`;
  const endDate = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${new Date(currentYear, currentMonth + 1, 0).getDate()}`;

  const { data: calendarData } = useQuery({
    queryKey: ['calendar', startDate, endDate],
    queryFn: () => calendarApi.getData(startDate, endDate),
  });

  const { data: subjects } = useSubjects();
  const subjectMap = new Map(subjects?.map((s) => [s.id, s]) || []);

  const days = getMonthDays(currentYear, currentMonth);
  const firstDayOffset = new Date(currentYear, currentMonth, 1).getDay();

  const getClassesForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return calendarData?.classInstances?.filter((i) => i.date === dateStr) || [];
  };

  const selectedDateStr = selectedDate.toISOString().split('T')[0];
  const selectedClasses = getClassesForDate(selectedDate);

  const navigateMonth = (delta: number) => {
    const newDate = new Date(selectedDate);
    newDate.setMonth(newDate.getMonth() + delta);
    setSelectedDate(newDate);
  };

  return (
    <ScrollView style={styles.container}>
      {/* Month Navigation */}
      <View style={styles.monthNav}>
        <MaterialCommunityIcons
          name="chevron-left"
          size={28}
          onPress={() => navigateMonth(-1)}
        />
        <Text variant="titleLarge" style={styles.monthTitle}>
          {selectedDate.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
        </Text>
        <MaterialCommunityIcons
          name="chevron-right"
          size={28}
          onPress={() => navigateMonth(1)}
        />
      </View>

      {/* Calendar Grid */}
      <Card style={styles.calendarCard}>
        <Card.Content>
          {/* Day headers */}
          <View style={styles.dayHeaders}>
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <Text key={day} style={styles.dayHeader}>
                {day}
              </Text>
            ))}
          </View>

          {/* Days grid */}
          <View style={styles.daysGrid}>
            {/* Empty cells for offset */}
            {Array.from({ length: firstDayOffset }).map((_, i) => (
              <View key={`empty-${i}`} style={styles.dayCell} />
            ))}

            {/* Day cells */}
            {days.map((day, index) => {
              const dateStr = day.toISOString().split('T')[0];
              const isToday = dateStr === new Date().toISOString().split('T')[0];
              const isSelected = dateStr === selectedDateStr;
              const classes = getClassesForDate(day);
              const hasClasses = classes.length > 0;

              return (
                <View
                  key={index}
                  style={[
                    styles.dayCell,
                    isToday && styles.todayCell,
                    isSelected && styles.selectedCell,
                  ]}
                  onTouchEnd={() => setSelectedDate(day)}
                >
                  <Text
                    style={[
                      styles.dayText,
                      isToday && styles.todayText,
                      isSelected && styles.selectedText,
                    ]}
                  >
                    {day.getDate()}
                  </Text>
                  {hasClasses && (
                    <View style={styles.classIndicator}>
                      {classes.slice(0, 3).map((cls, i) => {
                        const subject = subjectMap.get(cls.subjectId);
                        return (
                          <View
                            key={i}
                            style={[styles.classDot, { backgroundColor: subject?.color || '#6366f1' }]}
                          />
                        );
                      })}
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        </Card.Content>
      </Card>

      {/* Selected Date Classes */}
      <Card style={styles.classesCard}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            {selectedDate.toLocaleDateString('en-IN', { weekday: 'long', month: 'long', day: 'numeric' })}
          </Text>

          {selectedClasses.length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="calendar-blank" size={48} color="#94a3b8" />
              <Text variant="bodyMedium" style={styles.emptyText}>
                No classes on this day
              </Text>
            </View>
          ) : (
            selectedClasses.map((cls, index) => {
              const subject = subjectMap.get(cls.subjectId);
              return (
                <View key={index} style={styles.classItem}>
                  <View style={[styles.colorBar, { backgroundColor: subject?.color || '#6366f1' }]} />
                  <View style={styles.classInfo}>
                    <Text variant="bodyLarge" style={styles.className}>
                      {subject?.name || 'Unknown'}
                    </Text>
                    <Text variant="bodySmall" style={styles.classTime}>
                      {formatTime(cls.startTime)} • {cls.classType}
                    </Text>
                  </View>
                  {cls.attendance && (
                    <Chip compact style={[
                      styles.attendanceChip,
                      { backgroundColor: cls.attendance.status === 'present' ? '#d1fae5' : '#fee2e2' }
                    ]}>
                      {cls.attendance.status}
                    </Chip>
                  )}
                </View>
              );
            })
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
  monthNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  monthTitle: {
    fontWeight: '600',
  },
  calendarCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
  },
  dayHeaders: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  dayHeader: {
    flex: 1,
    textAlign: 'center',
    fontWeight: '600',
    opacity: 0.7,
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.28%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  todayCell: {
    backgroundColor: '#e0e7ff',
  },
  selectedCell: {
    backgroundColor: '#6366f1',
  },
  dayText: {
    fontSize: 14,
  },
  todayText: {
    fontWeight: 'bold',
    color: '#6366f1',
  },
  selectedText: {
    color: 'white',
    fontWeight: 'bold',
  },
  classIndicator: {
    flexDirection: 'row',
    gap: 2,
    marginTop: 2,
  },
  classDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  classesCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
  },
  sectionTitle: {
    fontWeight: '600',
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
  colorBar: {
    width: 4,
    height: 40,
    borderRadius: 2,
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
  attendanceChip: {
    height: 28,
  },
});
