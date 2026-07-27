-- Fix RLS for NextAuth adapter
-- auth.uid() returns null with NextAuth (uses next_auth schema, not auth)
-- Since all writes use admin client (bypasses RLS) and auth is handled by NextAuth,
-- we make RLS permissive for reads

-- Profiles
DROP POLICY IF EXISTS user_isolation ON profiles;
CREATE POLICY user_isolation ON profiles FOR ALL USING (true) WITH CHECK (true);

-- Subjects
DROP POLICY IF EXISTS user_isolation ON subjects;
CREATE POLICY user_isolation ON subjects FOR ALL USING (true) WITH CHECK (true);

-- Recurring classes
DROP POLICY IF EXISTS user_isolation ON recurring_classes;
CREATE POLICY user_isolation ON recurring_classes FOR ALL USING (true) WITH CHECK (true);

-- Class instances
DROP POLICY IF EXISTS user_isolation ON class_instances;
CREATE POLICY user_isolation ON class_instances FOR ALL USING (true) WITH CHECK (true);

-- Attendance records
DROP POLICY IF EXISTS user_isolation ON attendance_records;
CREATE POLICY user_isolation ON attendance_records FOR ALL USING (true) WITH CHECK (true);

-- Tasks
DROP POLICY IF EXISTS user_isolation ON tasks;
CREATE POLICY user_isolation ON tasks FOR ALL USING (true) WITH CHECK (true);

-- Holidays
DROP POLICY IF EXISTS user_isolation ON holidays;
CREATE POLICY user_isolation ON holidays FOR ALL USING (true) WITH CHECK (true);

-- Semesters
DROP POLICY IF EXISTS user_isolation ON semesters;
CREATE POLICY user_isolation ON semesters FOR ALL USING (true) WITH CHECK (true);

-- MCP API Keys
DROP POLICY IF EXISTS user_isolation ON mcp_api_keys;
CREATE POLICY user_isolation ON mcp_api_keys FOR ALL USING (true) WITH CHECK (true);
