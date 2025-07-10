# Class Capacity Management System

## Overview

The Class Capacity Management system handles the constraint management for class capacity in the HeyPeter Academy LMS. It enforces the maximum 9 students per group class constraint, manages 1-on-1 classes, and provides sophisticated capacity optimization.

## Features

### 1. Class Capacity Enforcement
- **Group Classes**: Maximum 9 students per class
- **1-on-1 Classes**: Maximum 1 student per class  
- **Course Type Specific Rules**: Different capacity rules for Basic, Everyday A/B, Speak Up, Business English, and 1-on-1 courses

### 2. Real-time Enrollment Tracking
- Live capacity monitoring with utilization percentages
- Available spots calculation
- Automatic capacity validation

### 3. Waiting List Management
- Automatic waitlist enrollment when classes are full
- Position-based queue management (FIFO)
- Automatic promotion from waitlist when spots become available
- Maximum waitlist capacity of 15 students

### 4. Automatic Class Creation
- Overflow class creation when capacity is reached
- Teacher availability consideration for new classes
- Resource allocation for multiple classes

### 5. Capacity Optimization
- Class splitting recommendations
- Capacity utilization alerts
- Performance analytics and reporting

## Usage

### Basic Component Usage

```tsx
import { ClassCapacityManagement } from '@/components/teacher';

function TeacherDashboard() {
  const handleCapacityChange = (classId: string, capacity: ClassCapacityInfo) => {
    console.log(`Class ${classId} capacity updated:`, capacity);
  };

  return (
    <ClassCapacityManagement 
      classId="class-123"
      teacherId="teacher-456"
      onCapacityChange={handleCapacityChange}
    />
  );
}
```

### Service Usage

```tsx
import { classCapacityService } from '@/lib/services';

// Get class capacity information
const capacity = await classCapacityService.getClassCapacity('class-123');

// Enroll a student
const result = await classCapacityService.enrollStudent('class-123', 'student-456');
if (result.success) {
  if (result.waitlisted) {
    console.log(`Student waitlisted at position ${result.position}`);
  } else {
    console.log('Student enrolled successfully');
  }
}

// Get waiting list
const waitingList = await classCapacityService.getWaitingList('class-123');

// Validate capacity for course type
const validation = classCapacityService.validateClassCapacity('Basic', 8);
if (!validation.valid) {
  console.log(validation.message);
}
```

## Capacity Rules by Course Type

| Course Type | Min Students | Max Students | Optimal |
|-------------|--------------|--------------|---------|
| Basic | 3 | 9 | 6 |
| Everyday A | 3 | 9 | 6 |
| Everyday B | 3 | 9 | 6 |
| Speak Up | 4 | 9 | 7 |
| Business English | 2 | 6 | 4 |
| 1-on-1 | 1 | 1 | 1 |

## States and Statuses

### Enrollment Status
- **enrolled**: Student is enrolled in the class
- **waitlisted**: Student is on the waiting list
- **dropped**: Student has dropped from the class
- **completed**: Student has completed the class

### Capacity Status
- **Available**: Under 70% capacity
- **High**: 70-84% capacity  
- **Nearly Full**: 85-99% capacity
- **Full**: 100% capacity

## Integration Points

### With Scheduling Architecture (7.7.1)
- Capacity information feeds into scheduling decisions
- Teacher availability considered for overflow classes
- Time slot allocation for split classes

### With Rules Engine (7.7.2)  
- Capacity rules enforcement
- Course type specific constraints
- Validation rules integration

### With Conflict Detection
- Capacity conflicts identified and flagged
- Resolution recommendations provided
- Automatic conflict prevention

## API Reference

### ClassCapacityService Methods

#### `getClassCapacity(classId: string): Promise<ClassCapacityInfo | null>`
Returns comprehensive capacity information for a class.

#### `enrollStudent(classId: string, studentId: string): Promise<EnrollmentResult>`
Enrolls a student in a class or adds them to the waiting list.

#### `dropStudent(classId: string, studentId: string): Promise<DropResult>`
Removes a student from a class and promotes waitlisted students.

#### `getWaitingList(classId: string): Promise<WaitingListEntry[]>`
Returns the ordered waiting list for a class.

#### `createOverflowClass(originalClassId: string): Promise<CreateClassResult>`
Creates a new class instance when the original reaches capacity.

#### `validateClassCapacity(courseType: string, capacity: number): ValidationResult`
Validates if a capacity is appropriate for the given course type.

## Testing

The system includes comprehensive tests for both the service layer and React components:

- **Service Tests**: `src/lib/services/__tests__/class-capacity-service.test.ts`
- **Component Tests**: `src/components/teacher/__tests__/ClassCapacityManagement.test.tsx`

Run tests with:
```bash
npm test -- --testPathPatterns="class-capacity"
```

## Error Handling

The system provides robust error handling with descriptive messages:

- Validation errors for invalid capacity configurations
- Network errors with retry mechanisms  
- User-friendly error messages in the UI
- Graceful degradation when services are unavailable

## Performance Considerations

- **Caching**: Service layer includes intelligent caching with TTL
- **Real-time Updates**: Efficient subscription-based updates
- **Lazy Loading**: Components load data on demand
- **Optimistic Updates**: UI updates immediately for better UX