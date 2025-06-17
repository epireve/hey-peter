-- Define primary key constraints (already defined in table creation, this is for completeness)
ALTER TABLE users ADD PRIMARY KEY (id);
ALTER TABLE teachers ADD PRIMARY KEY (id);
ALTER TABLE students ADD PRIMARY KEY (id);
ALTER TABLE courses ADD PRIMARY KEY (id);
ALTER TABLE classes ADD PRIMARY KEY (id);
ALTER TABLE schedules ADD PRIMARY KEY (id);
ALTER TABLE bookings ADD PRIMARY KEY (id);
ALTER TABLE attendance ADD PRIMARY KEY (id);
ALTER TABLE leave_requests ADD PRIMARY KEY (id);
ALTER TABLE materials ADD PRIMARY KEY (id);
ALTER TABLE notifications ADD PRIMARY KEY (id);
ALTER TABLE feedback ADD PRIMARY KEY (id);

-- Define composite primary keys for junction tables
ALTER TABLE user_roles ADD PRIMARY KEY (user_id, role);
ALTER TABLE student_courses ADD PRIMARY KEY (student_id, course_id);
ALTER TABLE class_schedules ADD PRIMARY KEY (class_id, schedule_id);