-- Junction table for user roles
CREATE TABLE user_roles (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL,
    PRIMARY KEY (user_id, role)
);


-- Junction table for student courses
CREATE TABLE student_courses (
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    PRIMARY KEY (student_id, course_id)
);

-- Junction table for class schedules
CREATE TABLE class_schedules (
    class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    schedule_id UUID NOT NULL REFERENCES schedules(id) ON DELETE CASCADE,
    PRIMARY KEY (class_id, schedule_id)
);