import * as SQLite from 'expo-sqlite';
import { drizzle } from 'drizzle-orm/expo-sqlite';
import * as schema from './schema';

let db: ReturnType<typeof drizzle<typeof schema>> | null = null;

export async function getDatabase() {
  if (db) return db;

  const sqlite = await SQLite.openDatabaseAsync('academic-planner.db');
  db = drizzle(sqlite, { schema });

  await sqlite.execAsync(`
    CREATE TABLE IF NOT EXISTS semesters (
      id TEXT PRIMARY KEY,
      remote_id TEXT,
      label TEXT NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 0,
      sync_status TEXT NOT NULL DEFAULT 'synced',
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS subjects (
      id TEXT PRIMARY KEY,
      remote_id TEXT,
      name TEXT NOT NULL,
      color TEXT NOT NULL,
      semester_id TEXT NOT NULL,
      sync_status TEXT NOT NULL DEFAULT 'synced',
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      remote_id TEXT,
      title TEXT NOT NULL,
      subject_id TEXT,
      due_date TEXT,
      priority TEXT NOT NULL DEFAULT 'medium',
      note TEXT,
      completed INTEGER NOT NULL DEFAULT 0,
      source TEXT NOT NULL DEFAULT 'user',
      sync_status TEXT NOT NULL DEFAULT 'synced',
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS recurring_classes (
      id TEXT PRIMARY KEY,
      remote_id TEXT,
      subject_id TEXT NOT NULL,
      semester_id TEXT NOT NULL,
      day_of_week INTEGER NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT,
      class_type TEXT NOT NULL DEFAULT 'theory',
      sync_status TEXT NOT NULL DEFAULT 'synced',
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS class_instances (
      id TEXT PRIMARY KEY,
      remote_id TEXT,
      recurring_class_id TEXT,
      date TEXT NOT NULL,
      subject_id TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT,
      class_type TEXT NOT NULL DEFAULT 'theory',
      sync_status TEXT NOT NULL DEFAULT 'synced',
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS attendance_records (
      id TEXT PRIMARY KEY,
      remote_id TEXT,
      class_instance_id TEXT NOT NULL,
      status TEXT NOT NULL,
      note TEXT,
      marked_at TEXT,
      sync_status TEXT NOT NULL DEFAULT 'synced',
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS holidays (
      id TEXT PRIMARY KEY,
      remote_id TEXT,
      date TEXT NOT NULL,
      name TEXT,
      sync_status TEXT NOT NULL DEFAULT 'synced',
      updated_at INTEGER NOT NULL
    );
  `);

  return db;
}
