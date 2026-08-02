import { useState } from 'react';
import { View, ScrollView, StyleSheet, Alert } from 'react-native';
import { TextInput, Button, Text, Chip } from 'react-native-paper';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useCreateSubject } from '../src/hooks/useSubjects';
import { useCreateTask } from '../src/hooks/useTasks';

const COLORS = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899'];
const CLASS_TYPES = ['theory', 'clinical', 'practical', 'tutorial', 'exam'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const PRIORITIES = ['low', 'medium', 'high'];

export default function AddModalScreen() {
  const router = useRouter();
  const { type } = useLocalSearchParams<{ type: string }>();
  const createSubject = useCreateSubject();
  const createTask = useCreateTask();

  const [subjectName, setSubjectName] = useState('');
  const [subjectColor, setSubjectColor] = useState(COLORS[0]);

  const [taskTitle, setTaskTitle] = useState('');
  const [taskDueDate, setTaskDueDate] = useState('');
  const [taskPriority, setTaskPriority] = useState<string>('medium');

  const [classDay, setClassDay] = useState(1);
  const [classTime, setClassTime] = useState('09:00');
  const [classType, setClassType] = useState('theory');

  const [attStatus, setAttStatus] = useState<string>('present');

  const handleSubmit = async () => {
    try {
      switch (type) {
        case 'subject':
          if (!subjectName.trim()) {
            Alert.alert('Error', 'Please enter a subject name');
            return;
          }
          await createSubject.mutateAsync({
            name: subjectName,
            color: subjectColor,
            semesterId: 'current',
          });
          Alert.alert('Success', 'Subject created');
          router.back();
          break;

        case 'task':
          if (!taskTitle.trim()) {
            Alert.alert('Error', 'Please enter a task title');
            return;
          }
          await createTask.mutateAsync({
            title: taskTitle,
            dueDate: taskDueDate || undefined,
            priority: taskPriority as 'low' | 'medium' | 'high',
          });
          Alert.alert('Success', 'Task created');
          router.back();
          break;

        case 'class':
          Alert.alert('Info', 'Class created (local only)');
          router.back();
          break;

        case 'attendance':
          Alert.alert('Info', 'Attendance marked (local only)');
          router.back();
          break;

        default:
          router.back();
      }
    } catch (error: unknown) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Something went wrong');
    }
  };

  const renderSubjectForm = () => (
    <View style={styles.form}>
      <TextInput
        label="Subject Name"
        value={subjectName}
        onChangeText={setSubjectName}
        style={styles.input}
      />
      <Text variant="bodyMedium" style={styles.label}>Color</Text>
      <View style={styles.colorGrid}>
        {COLORS.map((color) => (
          <View
            key={color}
            style={[
              styles.colorOption,
              { backgroundColor: color },
              subjectColor === color && styles.colorSelected,
            ]}
            onTouchEnd={() => setSubjectColor(color)}
          />
        ))}
      </View>
    </View>
  );

  const renderTaskForm = () => (
    <View style={styles.form}>
      <TextInput
        label="Task Title"
        value={taskTitle}
        onChangeText={setTaskTitle}
        style={styles.input}
      />
      <TextInput
        label="Due Date (YYYY-MM-DD)"
        value={taskDueDate}
        onChangeText={setTaskDueDate}
        style={styles.input}
      />
      <Text variant="bodyMedium" style={styles.label}>Priority</Text>
      <View style={styles.chipRow}>
        {PRIORITIES.map((p) => (
          <Chip
            key={p}
            selected={taskPriority === p}
            onPress={() => setTaskPriority(p)}
            style={styles.chip}
          >
            {p}
          </Chip>
        ))}
      </View>
    </View>
  );

  const renderClassForm = () => (
    <View style={styles.form}>
      <Text variant="bodyMedium" style={styles.label}>Day</Text>
      <View style={styles.chipRow}>
        {DAYS.map((day, i) => (
          <Chip
            key={day}
            selected={classDay === i}
            onPress={() => setClassDay(i)}
            style={styles.chip}
          >
            {day}
          </Chip>
        ))}
      </View>
      <TextInput
        label="Start Time (HH:MM)"
        value={classTime}
        onChangeText={setClassTime}
        style={styles.input}
      />
      <Text variant="bodyMedium" style={styles.label}>Class Type</Text>
      <View style={styles.chipRow}>
        {CLASS_TYPES.map((t) => (
          <Chip
            key={t}
            selected={classType === t}
            onPress={() => setClassType(t)}
            style={styles.chip}
          >
            {t}
          </Chip>
        ))}
      </View>
    </View>
  );

  const renderAttendanceForm = () => (
    <View style={styles.form}>
      <Text variant="bodyMedium" style={styles.label}>Status</Text>
      <View style={styles.chipRow}>
        {['present', 'absent', 'cancelled', 'holiday'].map((s) => (
          <Chip
            key={s}
            selected={attStatus === s}
            onPress={() => setAttStatus(s)}
            style={styles.chip}
          >
            {s}
          </Chip>
        ))}
      </View>
    </View>
  );

  const titles: Record<string, string> = {
    subject: 'Add Subject',
    task: 'Add Task',
    class: 'Add Class',
    attendance: 'Mark Attendance',
  };

  return (
    <ScrollView style={styles.container}>
      <Text variant="headlineSmall" style={styles.title}>
        {titles[type as string] || 'Add'}
      </Text>

      {type === 'subject' && renderSubjectForm()}
      {type === 'task' && renderTaskForm()}
      {type === 'class' && renderClassForm()}
      {type === 'attendance' && renderAttendanceForm()}

      <View style={styles.actions}>
        <Button mode="outlined" onPress={() => router.back()} style={styles.button}>
          Cancel
        </Button>
        <Button
          mode="contained"
          onPress={handleSubmit}
          loading={createSubject.isPending || createTask.isPending}
          style={styles.button}
        >
          Save
        </Button>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    padding: 16,
  },
  title: {
    fontWeight: 'bold',
    marginBottom: 24,
  },
  form: {
    gap: 16,
  },
  input: {
    marginBottom: 8,
  },
  label: {
    fontWeight: '500',
    marginBottom: 8,
  },
  colorGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  colorOption: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  colorSelected: {
    borderWidth: 3,
    borderColor: '#000',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    marginBottom: 4,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 24,
    paddingBottom: 40,
  },
  button: {
    minWidth: 100,
  },
});
