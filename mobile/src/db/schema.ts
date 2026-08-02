import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const semesters = sqliteTable('semesters', {
  id: text('id').primaryKey(),
  remoteId: text('remote_id'),
  label: text('label').notNull(),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(false),
  syncStatus: text('sync_status').notNull().default('synced'),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

export const subjects = sqliteTable('subjects', {
  id: text('id').primaryKey(),
  remoteId: text('remote_id'),
  name: text('name').notNull(),
  color: text('color').notNull(),
  semesterId: text('semester_id').notNull(),
  syncStatus: text('sync_status').notNull().default('synced'),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

export const tasks = sqliteTable('tasks', {
  id: text('id').primaryKey(),
  remoteId: text('remote_id'),
  title: text('title').notNull(),
  subjectId: text('subject_id'),
  dueDate: text('due_date'),
  priority: text('priority').notNull().default('medium'),
  note: text('note'),
  completed: integer('completed', { mode: 'boolean' }).notNull().default(false),
  source: text('source').notNull().default('user'),
  syncStatus: text('sync_status').notNull().default('synced'),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

export const recurringClasses = sqliteTable('recurring_classes', {
  id: text('id').primaryKey(),
  remoteId: text('remote_id'),
  subjectId: text('subject_id').notNull(),
  semesterId: text('semester_id').notNull(),
  dayOfWeek: integer('day_of_week').notNull(),
  startTime: text('start_time').notNull(),
  endTime: text('end_time'),
  classType: text('class_type').notNull().default('theory'),
  syncStatus: text('sync_status').notNull().default('synced'),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

export const classInstances = sqliteTable('class_instances', {
  id: text('id').primaryKey(),
  remoteId: text('remote_id'),
  recurringClassId: text('recurring_class_id'),
  date: text('date').notNull(),
  subjectId: text('subject_id').notNull(),
  startTime: text('start_time').notNull(),
  endTime: text('end_time'),
  classType: text('class_type').notNull().default('theory'),
  syncStatus: text('sync_status').notNull().default('synced'),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

export const attendanceRecords = sqliteTable('attendance_records', {
  id: text('id').primaryKey(),
  remoteId: text('remote_id'),
  classInstanceId: text('class_instance_id').notNull(),
  status: text('status').notNull(),
  note: text('note'),
  markedAt: text('marked_at'),
  syncStatus: text('sync_status').notNull().default('synced'),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

export const holidays = sqliteTable('holidays', {
  id: text('id').primaryKey(),
  remoteId: text('remote_id'),
  date: text('date').notNull(),
  name: text('name'),
  syncStatus: text('sync_status').notNull().default('synced'),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});
