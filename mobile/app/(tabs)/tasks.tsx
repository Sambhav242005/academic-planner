import { useState } from 'react';
import { View, FlatList, StyleSheet } from 'react-native';
import { Text, Card, Chip, Checkbox, IconButton, SegmentedButtons } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTasks, useUpdateTask, useDeleteTask } from '../../src/hooks/useTasks';
import type { Task } from '../../src/types';

export default function TasksScreen() {
  const [filter, setFilter] = useState<'active' | 'done' | 'all'>('active');
  const { data: tasks, isLoading } = useTasks(
    filter === 'active' ? { completed: false } : filter === 'done' ? { completed: undefined } : undefined
  );
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();

  const handleToggle = (task: Task) => {
    updateTask.mutate({
      id: task.id,
      data: { completed: !task.completed },
    });
  };

  const handleDelete = (task: Task) => {
    deleteTask.mutate(task.id);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return '#ef4444';
      case 'medium': return '#f59e0b';
      case 'low': return '#10b981';
      default: return '#94a3b8';
    }
  };

  const renderTask = ({ item }: { item: Task }) => (
    <Card style={styles.taskCard}>
      <Card.Content style={styles.taskContent}>
        <Checkbox
          status={item.completed ? 'checked' : 'unchecked'}
          onPress={() => handleToggle(item)}
        />
        <View style={styles.taskInfo}>
          <Text
            variant="bodyLarge"
            style={[styles.taskTitle, item.completed && styles.completed]}
          >
            {item.title}
          </Text>
          <View style={styles.taskMeta}>
            <Chip compact style={[styles.priorityChip, { backgroundColor: getPriorityColor(item.priority) + '20' }]}>
              {item.priority}
            </Chip>
            {item.dueDate && (
              <Text variant="bodySmall" style={styles.dueDate}>
                Due: {new Date(item.dueDate).toLocaleDateString('en-IN')}
              </Text>
            )}
          </View>
        </View>
        <IconButton
          icon="delete-outline"
          size={20}
          onPress={() => handleDelete(item)}
        />
      </Card.Content>
    </Card>
  );

  return (
    <View style={styles.container}>
      <SegmentedButtons
        value={filter}
        onValueChange={(value) => setFilter(value as 'active' | 'done' | 'all')}
        buttons={[
          { value: 'active', label: 'Active' },
          { value: 'done', label: 'Done' },
          { value: 'all', label: 'All' },
        ]}
        style={styles.filterBar}
      />

      {isLoading ? (
        <View style={styles.loading}>
          <Text>Loading...</Text>
        </View>
      ) : !tasks || tasks.length === 0 ? (
        <View style={styles.emptyState}>
          <MaterialCommunityIcons name="checkbox-marked-circle-outline" size={64} color="#94a3b8" />
          <Text variant="bodyLarge" style={styles.emptyText}>
            No {filter === 'all' ? '' : filter} tasks
          </Text>
        </View>
      ) : (
        <FlatList
          data={tasks}
          renderItem={renderTask}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  filterBar: {
    margin: 16,
    marginBottom: 8,
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  list: {
    padding: 16,
    gap: 8,
  },
  taskCard: {
    borderRadius: 12,
  },
  taskContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  taskInfo: {
    flex: 1,
  },
  taskTitle: {
    fontWeight: '500',
  },
  completed: {
    textDecorationLine: 'line-through',
    opacity: 0.5,
  },
  taskMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  priorityChip: {
    height: 24,
  },
  dueDate: {
    opacity: 0.7,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  emptyText: {
    opacity: 0.7,
  },
});
