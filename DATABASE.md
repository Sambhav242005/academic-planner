# DATABASE.md — Supabase Schema

## Overview

The Academic Planner stores all user data in **Supabase (Postgres 15)** with 9 tables. NextAuth users access data only through authenticated server routes; public Data API roles have no table privileges or RLS policies.

- **Auth:** `next-auth` adapter tables (accounts, sessions, verification_tokens) managed by `@auth/supabase-adapter`
- **Migrations:** Apply all SQL migrations in order, including `00004_lock_down_public_database_access.sql`.
- **Calculated values:** Never stored — percentages and aggregates computed at query time in application code

---

## Domain Groups

| Domain | Tables | Purpose |
|--------|--------|---------|
| User | `profiles` | User profile, preferences, settings |
| Academic Structure | `subjects`, `semesters` | Subjects and semester definitions |
| Scheduling | `recurring_classes`, `class_instances`, `holidays` | Timetable and calendar |
| Attendance | `attendance_records` | Per-class-instance attendance marks |
| Productivity | `tasks` | Todo items (user + AI sourced) |
| Access | `mcp_api_keys` | MCP server authentication keys |

---

## 1. profiles

1:1 mapping with `auth.users`. Created automatically by the `handle_new_user()` trigger function whenever a new user signs up.

```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  college TEXT,
  semester SMALLINT,
  default_target NUMERIC(5,2) NOT NULL DEFAULT 75.00,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| id | UUID | PK, FK → auth.users(id) CASCADE | — | Matches auth.users.id |
| display_name | TEXT | — | null | User's display name |
| college | TEXT | — | null | College/institution name |
| semester | SMALLINT | — | null | Current semester number |
| default_target | NUMERIC(5,2) | NOT NULL | 75.00 | Default attendance target percentage |
| created_at | TIMESTAMPTZ | NOT NULL | now() | Row creation timestamp |
| updated_at | TIMESTAMPTZ | NOT NULL | now() | Last update timestamp |

### Trigger: `handle_new_user()`

```sql
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id) VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

Fires on every new `auth.users` row, creating a corresponding profile automatically.

### RLS Policy

```sql
CREATE POLICY user_isolation ON profiles
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());
```

Users can only see or update their own profile. The `id` column directly equals `auth.uid()` (no `user_id` column — the PK IS the user ID).

---

## 2. subjects

Academic subjects/courses. Each has a unique colour for visual identification across the app.

```sql
CREATE TABLE subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL,
  semester_id UUID REFERENCES semesters(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_subjects_user ON subjects(user_id);
CREATE INDEX idx_subjects_semester ON subjects(semester_id);
```

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| id | UUID | PK | gen_random_uuid() | Unique identifier |
| user_id | UUID | NOT NULL, FK → auth.users(id) CASCADE | — | Owner of this subject |
| name | TEXT | NOT NULL | — | e.g. "Anatomy", "Pharmacology" |
| color | TEXT | NOT NULL | — | Hex colour string, e.g. "#3b82f6" |
| semester_id | UUID | FK → semesters(id) SET NULL | null | Associates subject with a semester |
| created_at | TIMESTAMPTZ | NOT NULL | now() | Row creation timestamp |

### Indexes

- `idx_subjects_user` on `user_id` — fast lookup scoped to user
- `idx_subjects_semester` on `semester_id` — fast filter by semester

### RLS Policy

```sql
CREATE POLICY user_isolation ON subjects
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
```

### Relationships

- `semester_id` references `semesters.id` (SET NULL on delete)
- Referenced by `recurring_classes.subject_id` (CASCADE delete)
- Referenced by `class_instances.subject_id` (CASCADE delete)
- Referenced by `tasks.subject_id` (SET NULL on delete)

---

## 3. recurring_classes

Base weekly timetable template. Each row represents one recurring class slot (e.g., "Anatomy lecture every Monday at 9:00 AM").

```sql
CREATE TABLE recurring_classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time TIME NOT NULL,
  end_time TIME,
  class_type TEXT NOT NULL DEFAULT 'theory' CHECK (class_type IN ('theory','clinical','practical','tutorial','exam')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_recurring_classes_user ON recurring_classes(user_id);
```

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| id | UUID | PK | gen_random_uuid() | Unique identifier |
| user_id | UUID | NOT NULL, FK → auth.users(id) CASCADE | — | Owner |
| subject_id | UUID | NOT NULL, FK → subjects(id) CASCADE | — | Which subject |
| day_of_week | SMALLINT | CHECK 0–6 | — | 0=Monday, 6=Sunday |
| start_time | TIME | NOT NULL | — | e.g. "09:00" |
| end_time | TIME | — | null | e.g. "09:50" |
| class_type | TEXT | CHECK enum | 'theory' | theory/clinical/practical/tutorial/exam |
| created_at | TIMESTAMPTZ | NOT NULL | now() | Row creation timestamp |

### Indexes

- `idx_recurring_classes_user` on `user_id`

### RLS Policy

```sql
CREATE POLICY user_isolation ON recurring_classes
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
```

### Relationships

- Referenced by `class_instances.recurring_class_id` (SET NULL on delete)

---

## 4. class_instances

Actual class occurrences on specific dates. One row per scheduled class. Can be generated from `recurring_classes` or created as one-off instances.

```sql
CREATE TABLE class_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recurring_class_id UUID REFERENCES recurring_classes(id) ON DELETE SET NULL,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME,
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  class_type TEXT NOT NULL DEFAULT 'theory' CHECK (class_type IN ('theory','clinical','practical','tutorial','exam')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, date, start_time, subject_id)
);

CREATE INDEX idx_class_instances_user_date ON class_instances(user_id, date);
```

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| id | UUID | PK | gen_random_uuid() | Unique identifier |
| user_id | UUID | NOT NULL, FK → auth.users(id) CASCADE | — | Owner |
| recurring_class_id | UUID | FK → recurring_classes(id) SET NULL | null | Source recurring class (optional) |
| date | DATE | NOT NULL | — | "2026-07-27" |
| start_time | TIME | NOT NULL | — | e.g. "09:00" |
| end_time | TIME | — | null | e.g. "09:50" |
| subject_id | UUID | NOT NULL, FK → subjects(id) CASCADE | — | Which subject |
| class_type | TEXT | CHECK enum | 'theory' | theory/clinical/practical/tutorial/exam |
| created_at | TIMESTAMPTZ | NOT NULL | now() | Row creation timestamp |

### Unique Constraint

`UNIQUE(user_id, date, start_time, subject_id)` — prevents duplicate instances for the same user/date/time/subject.

### Indexes

- `idx_class_instances_user_date` on `(user_id, date)` — fast queries by user + date range

### RLS Policy

```sql
CREATE POLICY user_isolation ON class_instances
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
```

### Relationships

- Referenced by `attendance_records.class_instance_id` (CASCADE delete)

---

## 5. attendance_records

One record per class instance attendance mark. Only raw status is stored — percentage is computed at render time.

```sql
CREATE TABLE attendance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  class_instance_id UUID NOT NULL REFERENCES class_instances(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('present','absent','cancelled','holiday')),
  note TEXT NOT NULL DEFAULT '',
  marked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, class_instance_id)
);

CREATE INDEX idx_attendance_user ON attendance_records(user_id);
```

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| id | UUID | PK | gen_random_uuid() | Unique identifier |
| user_id | UUID | NOT NULL, FK → auth.users(id) CASCADE | — | Owner |
| class_instance_id | UUID | NOT NULL, FK → class_instances(id) CASCADE | — | Which class instance |
| status | TEXT | CHECK enum | — | present/absent/cancelled/holiday |
| note | TEXT | NOT NULL | '' | Optional note (empty string if none) |
| marked_at | TIMESTAMPTZ | NOT NULL | now() | When the record was created |

### Unique Constraint

`UNIQUE(user_id, class_instance_id)` — one attendance record per class instance per user (upsert pattern).

### Status Values

| Status | Included in % calculation | Description |
|--------|--------------------------|-------------|
| `present` | Yes | Student attended |
| `absent` | Yes | Student did not attend |
| `cancelled` | No | Class was cancelled by institution |
| `holiday` | No | Date was a holiday |

### Percentage Calculation (at query time)

```
effective_total = present_count + absent_count
percentage = present_count / effective_total * 100  (if effective_total > 0, else 0)
```

### Indexes

- `idx_attendance_user` on `user_id`

### RLS Policy

```sql
CREATE POLICY user_isolation ON attendance_records
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
```

---

## 6. tasks

Todo items. Supports both user-created (`source = 'user'`) and AI-created (`source = 'ai'`) tasks.

```sql
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  subject_id UUID REFERENCES subjects(id) ON DELETE SET NULL,
  due_date DATE,
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low','medium','high')),
  note TEXT NOT NULL DEFAULT '',
  completed BOOLEAN NOT NULL DEFAULT false,
  source TEXT NOT NULL DEFAULT 'user' CHECK (source IN ('user','ai')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_tasks_user ON tasks(user_id);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);
```

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| id | UUID | PK | gen_random_uuid() | Unique identifier |
| user_id | UUID | NOT NULL, FK → auth.users(id) CASCADE | — | Owner |
| title | TEXT | NOT NULL | — | Task title |
| subject_id | UUID | FK → subjects(id) SET NULL | null | Linked subject (optional) |
| due_date | DATE | — | null | Deadline (YYYY-MM-DD) |
| priority | TEXT | CHECK enum | 'medium' | low/medium/high |
| note | TEXT | NOT NULL | '' | Free-text note |
| completed | BOOLEAN | NOT NULL | false | Completion status |
| source | TEXT | CHECK enum | 'user' | user/ai — who created the task |
| created_at | TIMESTAMPTZ | NOT NULL | now() | Row creation timestamp |

### Indexes

- `idx_tasks_user` on `user_id`
- `idx_tasks_due_date` on `due_date` — sorting and overdue queries

### RLS Policy

```sql
CREATE POLICY user_isolation ON tasks
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
```

---

## 7. holidays

Dates marked as holidays. One row per holiday per user.

```sql
CREATE TABLE holidays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  UNIQUE(user_id, date)
);

CREATE INDEX idx_holidays_user ON holidays(user_id);
```

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| id | UUID | PK | gen_random_uuid() | Unique identifier |
| user_id | UUID | NOT NULL, FK → auth.users(id) CASCADE | — | Owner |
| date | DATE | NOT NULL | — | "2026-01-26" |

### Unique Constraint

`UNIQUE(user_id, date)` — one holiday entry per date per user.

### Behaviour

- Classes on holiday dates are excluded from attendance percentage calculations
- Holiday records in `attendance_records` with status 'holiday' are created automatically when a date is marked

### Indexes

- `idx_holidays_user` on `user_id`

### RLS Policy

```sql
CREATE POLICY user_isolation ON holidays
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
```

---

## 8. semesters

Semester definitions for organizing attendance and schedules.

```sql
CREATE TABLE semesters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_semesters_user ON semesters(user_id);
```

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| id | UUID | PK | gen_random_uuid() | Unique identifier |
| user_id | UUID | NOT NULL, FK → auth.users(id) CASCADE | — | Owner |
| label | TEXT | NOT NULL | — | e.g. "Semester 1", "3rd Year" |
| is_active | BOOLEAN | NOT NULL | false | Only one semester is active per user |
| created_at | TIMESTAMPTZ | NOT NULL | now() | Row creation timestamp |

### RLS Policy

```sql
CREATE POLICY user_isolation ON semesters
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
```

---

## 9. mcp_api_keys

API keys for authenticating external AI assistants via the MCP server.

```sql
CREATE TABLE mcp_api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'default',
  key_hash TEXT NOT NULL,
  key_prefix TEXT NOT NULL,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_mcp_keys_user ON mcp_api_keys(user_id);
```

| Column | Type | Constraints | Default | Description |
|--------|------|-------------|---------|-------------|
| id | UUID | PK | gen_random_uuid() | Unique identifier |
| user_id | UUID | NOT NULL, FK → auth.users(id) CASCADE | — | Owner |
| name | TEXT | NOT NULL | 'default' | Human-readable key name |
| key_hash | TEXT | NOT NULL | — | Argon2/bcrypt hash of the full key |
| key_prefix | TEXT | NOT NULL | — | First 8 characters (for display) |
| last_used_at | TIMESTAMPTZ | — | null | Timestamp of last use |
| created_at | TIMESTAMPTZ | NOT NULL | now() | Row creation timestamp |

### Security

- Full key is shown only once at creation time
- Only `key_prefix` is stored for display purposes
- `key_hash` is used to verify incoming MCP requests
- Keys can be revoked (deleted) by the user in Settings

### RLS Policy

```sql
CREATE POLICY user_isolation ON mcp_api_keys
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
```

---

## RLS Summary

Migration `00004_lock_down_public_database_access.sql` removes the permissive policy and revokes direct browser Data API access.

```sql
ALTER TABLE <table> ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_isolation ON <table>
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
```

For `profiles`, the policy uses `id = auth.uid()` instead (since the PK is the user ID).

This ensures that every query is automatically scoped to the authenticated user. No WHERE clause is needed — RLS enforces it at the database level.

---

## Admin Client

Authenticated application routes and the MCP server use a Supabase admin client. The user ID extracted from a NextAuth session or validated MCP key scopes every query.

```typescript
// src/lib/supabase/admin.ts
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}
```

The admin client does NOT use RLS — data isolation is enforced by explicit `.eq('user_id', userId)` filters in every tool handler.

---

## Export / Import

Settings export/import runs through authenticated server routes. Export scopes every table to the current user; import validates and remaps relationships without trusting source owner IDs.

MCP API-key rows and hashes are never exported or imported.
