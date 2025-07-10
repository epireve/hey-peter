import { supabase } from "@/lib/supabase";
import { CRUDService, withRetry } from "./crud-service";
import { 
  StudentProgress, 
  ContentItem, 
  UnlearnedContent, 
  LearningAnalytics, 
  TopicPerformance,
  CourseType,
  SchedulingPriority,
  ClassType 
} from "@/types/scheduling";
import { z } from "zod";

export class ContentAnalysisService {
  private crudService: CRUDService<any>;

  constructor() {
    this.crudService = new CRUDService({
      table: "student_courses",
      cache: {
        enabled: true,
        ttl: 2 * 60 * 1000, // 2 minutes for dynamic content
      },
    });
  }

  /**
   * Analyze student progress across all enrolled courses
   */
  async analyzeStudentProgress(studentId: string): Promise<StudentProgress[]> {
    return withRetry(async () => {
      const { data: enrollments, error } = await supabase
        .from("student_courses")
        .select(`
          *,
          course:courses(*),
          student:students(*)
        `)
        .eq("student_id", studentId);

      if (error) throw error;

      const progressData: StudentProgress[] = [];

      for (const enrollment of enrollments || []) {
        const { data: completedLessons } = await supabase
          .from("feedback")
          .select("lesson_unit, lesson_number, submitted_time, rating")
          .eq("student_id", studentId)
          .eq("lesson_completed", true)
          .order("submitted_time", { ascending: false });

        const { data: classHistory } = await supabase
          .from("attendance")
          .select(`
            *,
            booking:bookings(*)
          `)
          .eq("booking.student_id", studentId)
          .eq("status", "present")
          .order("attendance_time", { ascending: false });

        const learningPace = this.calculateLearningPace(completedLessons || []);
        const strugglingTopics = await this.identifyStrugglingTopics(studentId, enrollment.course_id);
        const masteredTopics = await this.identifyMasteredTopics(studentId, enrollment.course_id);
        const nextPriorityContent = await this.getNextPriorityContent(
          studentId, 
          enrollment.course_id,
          enrollment.current_unit,
          enrollment.current_lesson
        );

        progressData.push({
          student_id: studentId,
          course_id: enrollment.course_id,
          current_unit: enrollment.current_unit || 1,
          current_lesson: enrollment.current_lesson || 1,
          progress_percentage: enrollment.progress_percentage || 0,
          last_completed_lesson: this.getLastCompletedLesson(completedLessons || []),
          last_class_date: classHistory?.[0]?.attendance_time,
          learning_pace: learningPace,
          struggling_topics: strugglingTopics,
          mastered_topics: masteredTopics,
          learning_goals: await this.extractLearningGoals(studentId, enrollment.course_id),
          next_priority_content: nextPriorityContent
        });
      }

      return progressData;
    });
  }

  /**
   * Identify unlearned content for a student
   */
  async identifyUnlearnedContent(studentId: string, courseId?: string): Promise<UnlearnedContent[]> {
    return withRetry(async () => {
      const progressData = await this.analyzeStudentProgress(studentId);
      const unlearnedContent: UnlearnedContent[] = [];

      for (const progress of progressData) {
        if (courseId && progress.course_id !== courseId) continue;

        const { data: allCourseContent } = await supabase
          .from("materials")
          .select("*")
          .eq("course_id", progress.course_id)
          .order("unit_number", { ascending: true })
          .order("lesson_number", { ascending: true });

        const { data: completedContent } = await supabase
          .from("feedback")
          .select("lesson_unit, lesson_number")
          .eq("student_id", studentId)
          .eq("lesson_completed", true);

        const completedLessons = new Set(
          completedContent?.map(c => `${c.lesson_unit}-${c.lesson_number}`) || []
        );

        const unlearnedItems: ContentItem[] = [];
        
        for (const material of allCourseContent || []) {
          const contentKey = `${material.unit_number}-${material.lesson_number}`;
          if (!completedLessons.has(contentKey)) {
            unlearnedItems.push({
              id: material.id,
              title: material.title,
              unit_number: material.unit_number,
              lesson_number: material.lesson_number,
              content_type: this.inferContentType(material.material_type),
              difficulty_level: this.calculateDifficultyLevel(material.unit_number, material.lesson_number),
              prerequisites: await this.getPrerequisites(material.id),
              estimated_duration_minutes: this.estimateDuration(material.material_type),
              tags: this.extractTags(material.description),
              learning_objectives: this.extractLearningObjectives(material.description)
            });
          }
        }

        const priorityScore = this.calculatePriorityScore(progress, unlearnedItems);
        const urgencyLevel = this.determineUrgencyLevel(progress, unlearnedItems);
        const recommendedClassType = this.recommendClassType(unlearnedItems, progress);
        const groupingCompatibility = await this.findGroupingCompatibility(studentId, unlearnedItems);

        unlearnedContent.push({
          student_id: studentId,
          content_items: unlearnedItems,
          priority_score: priorityScore,
          urgency_level: urgencyLevel,
          recommended_class_type: recommendedClassType,
          estimated_learning_time: unlearnedItems.reduce((sum, item) => sum + item.estimated_duration_minutes, 0),
          grouping_compatibility: groupingCompatibility
        });
      }

      return unlearnedContent;
    });
  }

  /**
   * Generate learning analytics for a student
   */
  async generateLearningAnalytics(studentId: string): Promise<LearningAnalytics> {
    return withRetry(async () => {
      const { data: student } = await supabase
        .from("students")
        .select("*")
        .eq("id", studentId)
        .single();

      if (!student) throw new Error("Student not found");

      const { data: attendanceData } = await supabase
        .from("attendance")
        .select(`
          *,
          booking:bookings(
            *,
            class:classes(*)
          )
        `)
        .eq("booking.student_id", studentId)
        .order("attendance_time", { ascending: false });

      const { data: feedbackData } = await supabase
        .from("feedback")
        .select("*")
        .eq("student_id", studentId)
        .order("submitted_time", { ascending: false });

      const learningVelocity = this.calculateLearningVelocity(attendanceData || []);
      const retentionRate = this.calculateRetentionRate(feedbackData || []);
      const engagementScore = this.calculateEngagementScore(attendanceData || [], feedbackData || []);
      const preferredLearningStyle = this.inferLearningStyle(feedbackData || []);
      const optimalClassSize = this.calculateOptimalClassSize(attendanceData || [], feedbackData || []);
      const bestTimeSlots = this.identifyBestTimeSlots(attendanceData || []);
      const peerCompatibility = await this.findPeerCompatibility(studentId);
      const topicPerformance = await this.analyzeTopicPerformance(studentId);

      return {
        student_id: studentId,
        learning_velocity: learningVelocity,
        retention_rate: retentionRate,
        engagement_score: engagementScore,
        preferred_learning_style: preferredLearningStyle,
        optimal_class_size: optimalClassSize,
        best_time_slots: bestTimeSlots,
        peer_compatibility: peerCompatibility,
        topic_performance: topicPerformance
      };
    });
  }

  /**
   * Find students who can learn similar content together
   */
  async findCompatibleStudents(contentItems: ContentItem[], courseType: CourseType): Promise<string[]> {
    return withRetry(async () => {
      const { data: students } = await supabase
        .from("students")
        .select(`
          *,
          student_courses(*)
        `)
        .eq("test_level", courseType);

      const compatibleStudents: string[] = [];

      for (const student of students || []) {
        const studentProgress = await this.analyzeStudentProgress(student.id);
        const unlearnedContent = await this.identifyUnlearnedContent(student.id);
        
        const hasCompatibleContent = unlearnedContent.some(unlearned => 
          unlearned.content_items.some(item => 
            contentItems.some(targetItem => 
              item.unit_number === targetItem.unit_number &&
              Math.abs(item.lesson_number - targetItem.lesson_number) <= 2
            )
          )
        );

        if (hasCompatibleContent) {
          compatibleStudents.push(student.id);
        }
      }

      return compatibleStudents;
    });
  }

  // Private helper methods
  private calculateLearningPace(completedLessons: any[]): 'slow' | 'average' | 'fast' {
    if (completedLessons.length === 0) return 'average';
    
    const totalLessons = completedLessons.length;
    const firstLesson = new Date(completedLessons[completedLessons.length - 1].submitted_time);
    const lastLesson = new Date(completedLessons[0].submitted_time);
    const daysDiff = Math.max(1, (lastLesson.getTime() - firstLesson.getTime()) / (1000 * 60 * 60 * 24));
    
    const lessonsPerWeek = (totalLessons / daysDiff) * 7;
    
    if (lessonsPerWeek < 1) return 'slow';
    if (lessonsPerWeek > 3) return 'fast';
    return 'average';
  }

  private async identifyStrugglingTopics(studentId: string, courseId: string): Promise<string[]> {
    const { data: feedback } = await supabase
      .from("feedback")
      .select("*")
      .eq("student_id", studentId)
      .lt("rating", 3);

    return feedback?.map(f => f.areas_for_improvement).filter(Boolean) || [];
  }

  private async identifyMasteredTopics(studentId: string, courseId: string): Promise<string[]> {
    const { data: feedback } = await supabase
      .from("feedback")
      .select("*")
      .eq("student_id", studentId)
      .gte("rating", 4);

    return feedback?.map(f => f.strengths).filter(Boolean) || [];
  }

  private async getNextPriorityContent(
    studentId: string, 
    courseId: string, 
    currentUnit: number, 
    currentLesson: number
  ): Promise<ContentItem[]> {
    const { data: nextContent } = await supabase
      .from("materials")
      .select("*")
      .eq("course_id", courseId)
      .or(`unit_number.gt.${currentUnit},and(unit_number.eq.${currentUnit},lesson_number.gte.${currentLesson})`)
      .order("unit_number", { ascending: true })
      .order("lesson_number", { ascending: true })
      .limit(3);

    return nextContent?.map(material => ({
      id: material.id,
      title: material.title,
      unit_number: material.unit_number,
      lesson_number: material.lesson_number,
      content_type: this.inferContentType(material.material_type),
      difficulty_level: this.calculateDifficultyLevel(material.unit_number, material.lesson_number),
      prerequisites: [],
      estimated_duration_minutes: this.estimateDuration(material.material_type),
      tags: this.extractTags(material.description),
      learning_objectives: this.extractLearningObjectives(material.description)
    })) || [];
  }

  private getLastCompletedLesson(completedLessons: any[]): number {
    if (completedLessons.length === 0) return 0;
    return Math.max(...completedLessons.map(l => l.lesson_number));
  }

  private async extractLearningGoals(studentId: string, courseId: string): Promise<string[]> {
    const { data: bookings } = await supabase
      .from("bookings")
      .select("learning_goals")
      .eq("student_id", studentId)
      .not("learning_goals", "is", null);

    return bookings?.map(b => b.learning_goals).filter(Boolean) || [];
  }

  private inferContentType(materialType: string): any {
    const typeMap: Record<string, any> = {
      'PDF': 'reading',
      'Audio': 'listening',
      'Video': 'listening',
      'Book': 'reading',
      'Other': 'speaking'
    };
    return typeMap[materialType] || 'speaking';
  }

  private calculateDifficultyLevel(unitNumber: number, lessonNumber: number): number {
    // Basic algorithm: difficulty increases with unit and lesson
    return Math.min(10, Math.floor(unitNumber * 1.5 + lessonNumber * 0.3));
  }

  private async getPrerequisites(materialId: string): Promise<string[]> {
    // In a real implementation, this would be stored in the database
    // For now, return empty array
    return [];
  }

  private estimateDuration(materialType: string): number {
    const durationMap: Record<string, number> = {
      'PDF': 45,
      'Audio': 60,
      'Video': 60,
      'Book': 90,
      'Other': 45
    };
    return durationMap[materialType] || 45;
  }

  private extractTags(description: string): string[] {
    if (!description) return [];
    // Simple tag extraction - in practice, this would be more sophisticated
    return description.toLowerCase().split(/\s+/)
      .filter(word => word.length > 3)
      .slice(0, 5);
  }

  private extractLearningObjectives(description: string): string[] {
    if (!description) return [];
    // Simple objective extraction - in practice, this would use NLP
    return description.split('.').filter(s => s.trim().length > 10).slice(0, 3);
  }

  private calculatePriorityScore(progress: StudentProgress, unlearnedItems: ContentItem[]): number {
    let score = 0;
    
    // Higher priority for students who are behind
    if (progress.progress_percentage < 50) score += 30;
    else if (progress.progress_percentage < 75) score += 20;
    else score += 10;

    // Higher priority for struggling students
    if (progress.struggling_topics.length > 3) score += 20;
    else if (progress.struggling_topics.length > 0) score += 10;

    // Higher priority for students with many unlearned items
    if (unlearnedItems.length > 10) score += 25;
    else if (unlearnedItems.length > 5) score += 15;
    else score += 5;

    // Adjust for learning pace
    if (progress.learning_pace === 'slow') score += 15;
    else if (progress.learning_pace === 'fast') score -= 5;

    return Math.min(100, Math.max(0, score));
  }

  private determineUrgencyLevel(progress: StudentProgress, unlearnedItems: ContentItem[]): SchedulingPriority {
    const priorityScore = this.calculatePriorityScore(progress, unlearnedItems);
    
    if (priorityScore >= 80) return 'urgent';
    if (priorityScore >= 60) return 'high';
    if (priorityScore >= 40) return 'medium';
    return 'low';
  }

  private recommendClassType(unlearnedItems: ContentItem[], progress: StudentProgress): ClassType {
    // Recommend individual classes for struggling students or complex topics
    if (progress.struggling_topics.length > 2) return 'individual';
    if (unlearnedItems.some(item => item.difficulty_level > 7)) return 'individual';
    return 'group';
  }

  private async findGroupingCompatibility(studentId: string, unlearnedItems: ContentItem[]): Promise<string[]> {
    const { data: similarStudents } = await supabase
      .from("students")
      .select(`
        id,
        test_level,
        student_courses(*)
      `)
      .neq("id", studentId);

    const compatible: string[] = [];

    for (const student of similarStudents || []) {
      const studentProgress = await this.analyzeStudentProgress(student.id);
      const studentUnlearned = await this.identifyUnlearnedContent(student.id);
      
      const hasOverlap = studentUnlearned.some(unlearned =>
        unlearned.content_items.some(item =>
          unlearnedItems.some(targetItem =>
            item.unit_number === targetItem.unit_number &&
            Math.abs(item.lesson_number - targetItem.lesson_number) <= 1
          )
        )
      );

      if (hasOverlap) {
        compatible.push(student.id);
      }
    }

    return compatible.slice(0, 8); // Maximum group size
  }

  private calculateLearningVelocity(attendanceData: any[]): number {
    if (attendanceData.length === 0) return 0;
    
    const totalClasses = attendanceData.length;
    const firstClass = new Date(attendanceData[attendanceData.length - 1].attendance_time);
    const lastClass = new Date(attendanceData[0].attendance_time);
    const weeksSpan = Math.max(1, (lastClass.getTime() - firstClass.getTime()) / (1000 * 60 * 60 * 24 * 7));
    
    return totalClasses / weeksSpan;
  }

  private calculateRetentionRate(feedbackData: any[]): number {
    if (feedbackData.length === 0) return 0;
    
    const totalFeedback = feedbackData.length;
    const positiveRatings = feedbackData.filter(f => f.rating >= 4).length;
    
    return (positiveRatings / totalFeedback) * 100;
  }

  private calculateEngagementScore(attendanceData: any[], feedbackData: any[]): number {
    let score = 0;
    
    // Attendance factor
    const attendanceRate = attendanceData.filter(a => a.status === 'present').length / Math.max(1, attendanceData.length);
    score += attendanceRate * 40;
    
    // Feedback quality factor
    const avgRating = feedbackData.reduce((sum, f) => sum + (f.rating || 0), 0) / Math.max(1, feedbackData.length);
    score += (avgRating / 5) * 60;
    
    return Math.min(100, Math.max(0, score));
  }

  private inferLearningStyle(feedbackData: any[]): 'visual' | 'auditory' | 'kinesthetic' | 'mixed' {
    // Simple heuristic based on feedback patterns
    // In practice, this would analyze feedback content and performance patterns
    return 'mixed';
  }

  private calculateOptimalClassSize(attendanceData: any[], feedbackData: any[]): number {
    // Analyze performance in different class sizes
    const classPerformance = new Map<number, number>();
    
    for (const attendance of attendanceData) {
      if (attendance.booking?.class) {
        const classSize = attendance.booking.class.current_enrollment || 1;
        const feedback = feedbackData.find(f => f.booking_id === attendance.booking.id);
        const rating = feedback?.rating || 3;
        
        if (!classPerformance.has(classSize)) {
          classPerformance.set(classSize, []);
        }
        classPerformance.get(classSize).push(rating);
      }
    }
    
    let bestSize = 4; // Default
    let bestAvgRating = 0;
    
    for (const [size, ratings] of classPerformance) {
      const avgRating = ratings.reduce((sum, r) => sum + r, 0) / ratings.length;
      if (avgRating > bestAvgRating) {
        bestAvgRating = avgRating;
        bestSize = size;
      }
    }
    
    return bestSize;
  }

  private identifyBestTimeSlots(attendanceData: any[]): any[] {
    // Analyze attendance patterns to identify optimal time slots
    const timeSlotPerformance = new Map<string, number>();
    
    for (const attendance of attendanceData) {
      if (attendance.booking) {
        const scheduledTime = new Date(attendance.booking.scheduled_at);
        const timeSlot = `${scheduledTime.getDay()}-${scheduledTime.getHours()}`;
        
        if (!timeSlotPerformance.has(timeSlot)) {
          timeSlotPerformance.set(timeSlot, 0);
        }
        
        if (attendance.status === 'present') {
          timeSlotPerformance.set(timeSlot, timeSlotPerformance.get(timeSlot) + 1);
        }
      }
    }
    
    // Convert to time slot objects
    return Array.from(timeSlotPerformance.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([slot, count]) => {
        const [day, hour] = slot.split('-').map(Number);
        return {
          day_of_week: day,
          start_time: `${hour.toString().padStart(2, '0')}:00`,
          end_time: `${(hour + 1).toString().padStart(2, '0')}:00`,
          is_available: true,
          recurring: true
        };
      });
  }

  private async findPeerCompatibility(studentId: string): Promise<string[]> {
    const { data: classmates } = await supabase
      .from("bookings")
      .select(`
        class_id,
        student_id
      `)
      .eq("student_id", studentId);

    const classmateIds = new Set<string>();
    
    for (const booking of classmates || []) {
      const { data: otherStudents } = await supabase
        .from("bookings")
        .select("student_id")
        .eq("class_id", booking.class_id)
        .neq("student_id", studentId);
      
      for (const other of otherStudents || []) {
        classmateIds.add(other.student_id);
      }
    }
    
    return Array.from(classmateIds);
  }

  private async analyzeTopicPerformance(studentId: string): Promise<TopicPerformance[]> {
    const { data: feedback } = await supabase
      .from("feedback")
      .select("*")
      .eq("student_id", studentId)
      .order("submitted_time", { ascending: false });

    const topicPerformanceMap = new Map<string, any>();
    
    for (const fb of feedback || []) {
      if (fb.areas_for_improvement) {
        const topics = fb.areas_for_improvement.split(',').map(t => t.trim());
        for (const topic of topics) {
          if (!topicPerformanceMap.has(topic)) {
            topicPerformanceMap.set(topic, {
              topic,
              ratings: [],
              lastPracticed: fb.submitted_time
            });
          }
          topicPerformanceMap.get(topic).ratings.push(fb.rating);
        }
      }
    }
    
    return Array.from(topicPerformanceMap.entries()).map(([topic, data]) => ({
      topic,
      mastery_level: (data.ratings.reduce((sum, r) => sum + r, 0) / data.ratings.length) * 20,
      time_to_master: 60, // Placeholder
      difficulty_rating: Math.max(1, Math.min(10, 10 - (data.ratings.reduce((sum, r) => sum + r, 0) / data.ratings.length))),
      requires_review: data.ratings.some(r => r < 3),
      last_practiced: data.lastPracticed
    }));
  }
}

// Export singleton instance
export const contentAnalysisService = new ContentAnalysisService();