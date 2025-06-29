**HeyPeter Academy - Product Requirement Document (PRD)**

---

### 1. Student Management

#### 1.1 Student Information Entry

* Manual entry of the following fields:

  * Full Name
  * Gender
  * Photo (uploadable to profile)
  * Student ID (auto-generated unique identifier)
  * Internal Code (e.g., F7 — where F = coach code, 7 = student number under that coach)
  * Test Level (Basic, Everyday A, Everyday B, Speak Up, Business English, 1-on-1)
  * Enrolled Courses (Online/Offline; categories same as above)
  * Total Course Hours
  * Purchased Teaching Materials (Yes/No)
  * Lead Source (Referrer)
  * Course Sales Representative (Assistant Teacher)
  * Payment Date, Amount, Discount (if any), Course Start Date

#### 1.2 Student Profile Management

* Material Issuance Tracking:

  * For students who purchased materials, record distributed books (e.g., Daily U1-8, Debate U1-8, etc.)
  * For students without purchases, confirm whether PDF was sent
* Course Progress:

  * Completed lessons shown in gray
  * Unattended lessons shown in red
* Leave Management:

  * Students submit leave via system
  * Admin-defined leave rules: advance notice hours, hour deduction rules
  * Leave approval and auto-postponement logic
  * Auto-suggest make-up classes
* Hour Tracking:

  * Record total and remaining class hours
  * Hour deduction rules:

    * Attended: Deduct by class duration
    * Leave > 48 hrs notice: Postpone
    * Leave <= 48 hrs: One chance to postpone
    * No-show: Full deduction
* Additional Records:

  * Assigned class
  * Class attendance log
  * English proficiency: manual and AI-based adjustment supported

#### 1.3 Student Portal Features

* Daily/Speak Up/Business/Basic Classes:

  * Monthly calendar with progress (e.g., "2025-3-17 Unit 5 Lesson 3")
  * Daily class PDF, class time, teacher, post-class feedback
  * Leave application
  * Remaining class hours display
  * Weekly course schedule (time, room, teacher, material)
* 1v1 & Online Small Group Classes:

  * Daily class PDF, time, teacher, feedback
  * Remaining hours display
  * Weekly reservation schedule
  * Class meeting link uploadable by admin
  * Class reminders (5–10 mins before)
  * Weekly booking capability
  * Success/cancel notifications for 1v1 bookings

#### 1.4 Notifications (Student-Side)

* Remind student and admin when hours are nearly used up
* Notify teachers and students of class changes
* Auto-generate weekly schedule and notify teachers

---

### 2. Teacher Management

#### 2.1 Class Hour Tracking

* Track total hours taught by each teacher
* Filter by day/week/month
* Data includes:

  * Course Topic
  * Class Time
  * Student List
  * Course Duration

#### 2.2 Teaching Availability

* Teachers define weekly available teaching times (e.g., Mon/Wed/Fri 9:30–12:30)

#### 2.3 Weekly Timetable

* Auto-update schedule with drag-and-drop editing
* Display:

  * Time
  * Course topic
  * Students
  * Class duration
* Export to Excel/PDF + printing

#### 2.4 Compensation & Feedback

* Teacher portal displays:

  * Weekly/monthly income
  * Salary status (settled/unsettled)
  * Bonus availability
  * Compensation rules
* Analytics:

  * Total teaching hours per teacher
  * Student feedback
  * Average class hour consumption
  * Attendance rate by class

---

### 3. Smart Scheduling System

#### 3.1 Automatic Scheduling Rules

* AI schedules classes based on unlearned content
* Class size capped at 9 students
* Prevent duplicate lesson assignments
* Ensure synced content for all students in a class
* Auto-recommend alternative classes if full
* Manual adjustment with AI recommendations allowed
* Use daily-updated table data for tracking student participation, absence, pending attendance, and planning adjustments

---

### 4. 1v1 Booking System

#### 4.1 Booking Logic

* Students can:

  * View and book sessions
  * Select teachers from those available
  * Book only within teachers' available times
  * Choose duration (e.g., 30 or 60 minutes)
  * Submit learning goals in advance

#### 4.2 Auto-Matching Feature

* Students enter desired time → system suggests all available teachers
* Option to select teacher first → see their available times
* If time conflict → auto-recommend alternatives

---

### 5. Other Features

#### 5.1 Visitor Popup

* Website popup for unregistered users to contact sales

#### 5.2 Data Export

* Export student and teacher records (Excel/PDF)

#### 5.3 Data Visualization

* Attendance reports (by class, teacher, period)
* Hour usage and balance analytics
* Teacher performance (hours, feedback, etc.)

#### 5.4 Course Evaluation

* Student: Rate and comment after class
* Teacher: Leave notes on student performance
* Admin: View all feedback to improve curriculum

---

*End of Document*
