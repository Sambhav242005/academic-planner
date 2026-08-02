-- Restore RLS policies as a database-level safety net.
--
-- SECURITY MODEL:
--   All route handlers currently use the admin client (service role), which
--   bypasses RLS entirely. Routes MUST include .eq('user_id', userId).
--   These policies protect against two scenarios:
--     1. Future code using the anon/user client (e.g. mobile direct queries)
--     2. A route handler that forgets the ownership filter (defense in depth)
--
-- NOTE: The service role key bypasses RLS, so these policies do NOT protect
-- routes using the admin client. They are a safety net, not the primary
-- security boundary.

-- Re-enable RLS (already enabled by 00004, but idempotent)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurring_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE holidays ENABLE ROW LEVEL SECURITY;
ALTER TABLE semesters ENABLE ROW LEVEL SECURITY;
ALTER TABLE mcp_api_keys ENABLE ROW LEVEL SECURITY;

-- Restore user_isolation policies (same as 00001, using auth.uid())
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

-- Grant minimal access back to anon/authenticated roles.
-- The admin client (service role) bypasses these grants entirely.
-- These exist so that RLS policies have a role to apply to.
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE subjects TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE recurring_classes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE class_instances TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE attendance_records TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE tasks TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE holidays TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE semesters TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE mcp_api_keys TO authenticated;
