-- Academic Planner — Initial Schema
-- Run this in Supabase SQL Editor or via migration tool

-- 1. PROFILES (1:1 with auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  college TEXT,
  semester SMALLINT,
  default_target NUMERIC(5,2) NOT NULL DEFAULT 75.00,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

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

-- 2. SUBJECTS
CREATE TABLE subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_subjects_user ON subjects(user_id);

-- 3. RECURRING CLASSES (base week template)
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

-- 4. CLASS INSTANCES (actual occurrences on specific dates)
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

-- 5. ATTENDANCE RECORDS
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

-- 6. TASKS
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

-- 7. HOLIDAYS
CREATE TABLE holidays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  UNIQUE(user_id, date)
);

CREATE INDEX idx_holidays_user ON holidays(user_id);

-- 8. SEMESTERS
CREATE TABLE semesters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_semesters_user ON semesters(user_id);

-- 9. MCP API KEYS
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

-- ROW LEVEL SECURITY
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurring_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE holidays ENABLE ROW LEVEL SECURITY;
ALTER TABLE semesters ENABLE ROW LEVEL SECURITY;
ALTER TABLE mcp_api_keys ENABLE ROW LEVEL SECURITY;

-- RLS POLICIES — all tables: user can only see/insert/update/delete own rows
CREATE POLICY user_isolation ON profiles
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());

CREATE POLICY user_isolation ON subjects
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY user_isolation ON recurring_classes
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY user_isolation ON class_instances
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY user_isolation ON attendance_records
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY user_isolation ON tasks
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY user_isolation ON holidays
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY user_isolation ON semesters
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY user_isolation ON mcp_api_keys
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

ALTER TABLE recurring_classes
ADD COLUMN semester_id UUID REFERENCES semesters(id) ON DELETE SET NULL;

CREATE INDEX idx_recurring_classes_semester ON recurring_classes(semester_id);

UPDATE recurring_classes rc
SET semester_id = s.id
FROM semesters s
WHERE rc.user_id = s.user_id AND s.is_active = true;
