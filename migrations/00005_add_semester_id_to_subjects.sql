ALTER TABLE subjects ADD COLUMN semester_id UUID REFERENCES semesters(id) ON DELETE SET NULL;
CREATE INDEX idx_subjects_semester ON subjects(semester_id);
