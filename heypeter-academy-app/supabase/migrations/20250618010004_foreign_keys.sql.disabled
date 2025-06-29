-- Define foreign key relationships

-- users table (no foreign keys)

-- teachers table
ALTER TABLE teachers ADD CONSTRAINT fk_teachers_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- students table
ALTER TABLE students ADD CONSTRAINT fk_students_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- courses table (no foreign keys)

-- classes table
ALTER TABLE classes ADD CONSTRAINT fk_classes_course_id FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE;
ALTER TABLE classes ADD CONSTRAINT fk_classes_teacher_id FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE SET NULL;

-- schedules table (no foreign keys)

-- bookings table
ALTER TABLE bookings ADD CONSTRAINT fk_bookings_student_id FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE;
ALTER TABLE bookings ADD CONSTRAINT fk_bookings_class_id FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE;

-- attendance table
ALTER TABLE attendance ADD CONSTRAINT fk_attendance_booking_id FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE;

-- leave_requests table
ALTER TABLE leave_requests ADD CONSTRAINT fk_leave_requests_student_id FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE;
ALTER TABLE leave_requests ADD CONSTRAINT fk_leave_requests_class_id FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE;

-- materials table
ALTER TABLE materials ADD CONSTRAINT fk_materials_class_id FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE;

-- notifications table
ALTER TABLE notifications ADD CONSTRAINT fk_notifications_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- feedback table
ALTER TABLE feedback ADD CONSTRAINT fk_feedback_student_id FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE;
ALTER TABLE feedback ADD CONSTRAINT fk_feedback_class_id FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE;

-- user_roles table
ALTER TABLE user_roles ADD CONSTRAINT fk_user_roles_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- student_courses table
ALTER TABLE student_courses ADD CONSTRAINT fk_student_courses_student_id FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE;
ALTER TABLE student_courses ADD CONSTRAINT fk_student_courses_course_id FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE;

-- class_schedules table
ALTER TABLE class_schedules ADD CONSTRAINT fk_class_schedules_class_id FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE;
ALTER TABLE class_schedules ADD CONSTRAINT fk_class_schedules_schedule_id FOREIGN KEY (schedule_id) REFERENCES schedules(id) ON DELETE CASCADE;

-- audit_logs table (no foreign keys)

-- user_sessions table
ALTER TABLE user_sessions ADD CONSTRAINT fk_user_sessions_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- system_events table (no foreign keys)