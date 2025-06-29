import { CRUDService, withRetry } from "./crud-service";
import { z } from "zod";

// Course schema
export const courseSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().min(1, "Title is required").max(255),
  description: z.string().optional(),
  course_type: z.enum(["Basic", "Everyday A", "Everyday B", "Speak Up", "Business English", "1-on-1"]),
  delivery_mode: z.enum(["Online", "Offline", "Hybrid"]),
  duration_hours: z.number().int().min(1),
  max_students: z.number().int().min(1).max(20).default(9),
  price: z.number().min(0),
  is_active: z.boolean().default(true),
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional(),
});

export type Course = z.infer<typeof courseSchema>;

export interface CourseWithStats extends Course {
  _count?: {
    classes: number;
    enrollments: number;
  };
}

export class CourseService extends CRUDService<Course> {
  constructor() {
    super({
      table: "courses",
      cache: {
        enabled: true,
        ttl: 10 * 60 * 1000, // 10 minutes
      },
    });
  }

  async createCourse(data: Omit<Course, "id" | "created_at" | "updated_at">) {
    return withRetry(async () => {
      const validatedData = courseSchema.omit({ 
        id: true, 
        created_at: true, 
        updated_at: true 
      }).parse(data);
      
      return this.create(validatedData);
    });
  }

  async updateCourse(id: string, data: Partial<Course>) {
    return withRetry(async () => {
      const validatedData = courseSchema.partial().parse(data);
      return this.update(id, validatedData);
    });
  }

  async getActiveCourses() {
    return this.getAll({
      filters: [{ column: "is_active", operator: "eq", value: true }],
      orderBy: { column: "title", ascending: true },
    });
  }

  async getCoursesByType(courseType: string) {
    return this.getAll({
      filters: [
        { column: "course_type", operator: "eq", value: courseType },
        { column: "is_active", operator: "eq", value: true },
      ],
      orderBy: { column: "title", ascending: true },
    });
  }

  async getCoursesByDeliveryMode(mode: string) {
    return this.getAll({
      filters: [
        { column: "delivery_mode", operator: "eq", value: mode },
        { column: "is_active", operator: "eq", value: true },
      ],
      orderBy: { column: "title", ascending: true },
    });
  }

  async toggleCourseStatus(id: string) {
    const { data: course } = await this.getById(id);
    if (!course) throw new Error("Course not found");
    
    return this.update(id, { is_active: !course.is_active });
  }

  async duplicateCourse(id: string, newTitle: string) {
    const { data: course } = await this.getById(id);
    if (!course) throw new Error("Course not found");
    
    const { id: _, created_at, updated_at, ...courseData } = course;
    return this.createCourse({
      ...courseData,
      title: newTitle,
      is_active: false, // Start as inactive
    });
  }
}

// Export singleton instance
export const courseService = new CourseService();