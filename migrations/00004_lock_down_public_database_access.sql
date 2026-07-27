-- Lock application data behind authenticated Next.js route handlers.
-- The browser must never query Supabase tables directly: NextAuth does not set
-- auth.uid(), and the prior permissive policy exposed every row to the anon key.

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurring_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE holidays ENABLE ROW LEVEL SECURITY;
ALTER TABLE semesters ENABLE ROW LEVEL SECURITY;
ALTER TABLE mcp_api_keys ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_isolation ON profiles;
DROP POLICY IF EXISTS user_isolation ON subjects;
DROP POLICY IF EXISTS user_isolation ON recurring_classes;
DROP POLICY IF EXISTS user_isolation ON class_instances;
DROP POLICY IF EXISTS user_isolation ON attendance_records;
DROP POLICY IF EXISTS user_isolation ON tasks;
DROP POLICY IF EXISTS user_isolation ON holidays;
DROP POLICY IF EXISTS user_isolation ON semesters;
DROP POLICY IF EXISTS user_isolation ON mcp_api_keys;

REVOKE ALL ON TABLE profiles FROM anon, authenticated;
REVOKE ALL ON TABLE subjects FROM anon, authenticated;
REVOKE ALL ON TABLE recurring_classes FROM anon, authenticated;
REVOKE ALL ON TABLE class_instances FROM anon, authenticated;
REVOKE ALL ON TABLE attendance_records FROM anon, authenticated;
REVOKE ALL ON TABLE tasks FROM anon, authenticated;
REVOKE ALL ON TABLE holidays FROM anon, authenticated;
REVOKE ALL ON TABLE semesters FROM anon, authenticated;
REVOKE ALL ON TABLE mcp_api_keys FROM anon, authenticated;
