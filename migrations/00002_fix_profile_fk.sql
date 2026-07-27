-- Fix: NextAuth SupabaseAdapter stores users in next_auth.users, not auth.users
-- The profiles FK to auth.users(id) causes foreign key violations on profile upsert

-- 1. Drop the auto-create trigger (adapter handles user creation in next_auth schema)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();

-- 2. Drop FK constraints that reference auth.users
-- profiles.id is the main blocker
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;

-- All user_id FKs also reference auth.users — drop them too
ALTER TABLE subjects DROP CONSTRAINT IF EXISTS subjects_user_id_fkey;
ALTER TABLE recurring_classes DROP CONSTRAINT IF EXISTS recurring_classes_user_id_fkey;
ALTER TABLE class_instances DROP CONSTRAINT IF EXISTS class_instances_user_id_fkey;
ALTER TABLE attendance_records DROP CONSTRAINT IF EXISTS attendance_records_user_id_fkey;
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_user_id_fkey;
ALTER TABLE holidays DROP CONSTRAINT IF EXISTS holidays_user_id_fkey;
ALTER TABLE semesters DROP CONSTRAINT IF EXISTS semesters_user_id_fkey;
ALTER TABLE mcp_api_keys DROP CONSTRAINT IF EXISTS mcp_api_keys_user_id_fkey;
