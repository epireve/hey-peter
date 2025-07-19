/**
 * Course Service (Refactored)
 * 
 * This service handles course-related operations with dependency injection
 * and improved testability.
 */

import { ServiceBase, ServiceMethod, BaseServiceFactory, type ServiceDependencies } from './base';
import { CRUDService, withRetry } from "./crud-service";
import { supabase } from "@/lib/supabase";
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

export class CourseService extends ServiceBase {
  private crudService: CRUDService<Course>;

  constructor(dependencies?: ServiceDependencies) {
    super({
      name: 'CourseService',
      dependencies,
      options: {}
    });

    // Initialize CRUD service with injected dependencies
    this.crudService = new CRUDService<Course>({
      table: "courses",
      cache: {
        enabled: true,
        ttl: 10 * 60 * 1000, // 10 minutes
      },
      supabaseClient: this.supabaseClient || supabase,
    });

    // If no Supabase client is injected, use default
    if (!this.supabaseClient) {
      this.supabaseClient = supabase;
    }
  }

  @ServiceMethod('createCourse')
  async createCourse(data: Omit<Course, "id" | "created_at" | "updated_at">) {
    return this.executeOperation('createCourse', async () => {
      return withRetry(async () => {
        const validatedData = courseSchema.omit({ 
          id: true, 
          created_at: true, 
          updated_at: true 
        }).parse(data);
        
        return this.crudService.create(validatedData);
      });
    });
  }

  @ServiceMethod('updateCourse')
  async updateCourse(id: string, data: Partial<Course>) {
    return this.executeOperation('updateCourse', async () => {
      return withRetry(async () => {
        const validatedData = courseSchema.partial().parse(data);
        return this.crudService.update(id, validatedData);
      });
    });
  }

  @ServiceMethod('getById')
  async getById(id: string) {
    return this.executeOperation('getById', async () => {
      return this.crudService.getById(id);
    });
  }

  @ServiceMethod('getAll')
  async getAll(options?: any) {
    return this.executeOperation('getAll', async () => {
      return this.crudService.getAll(options);
    });
  }

  @ServiceMethod('getActiveCourses')
  async getActiveCourses() {
    return this.executeOperation('getActiveCourses', async () => {
      return this.crudService.getAll({
        filters: [{ column: "is_active", operator: "eq", value: true }],
        orderBy: { column: "title", ascending: true },
      });
    });
  }

  @ServiceMethod('getCoursesByType')
  async getCoursesByType(courseType: string) {
    return this.executeOperation('getCoursesByType', async () => {
      return this.crudService.getAll({
        filters: [
          { column: "course_type", operator: "eq", value: courseType },
          { column: "is_active", operator: "eq", value: true },
        ],
        orderBy: { column: "title", ascending: true },
      });
    });
  }

  @ServiceMethod('getCoursesByDeliveryMode')
  async getCoursesByDeliveryMode(mode: string) {
    return this.executeOperation('getCoursesByDeliveryMode', async () => {
      return this.crudService.getAll({
        filters: [
          { column: "delivery_mode", operator: "eq", value: mode },
          { column: "is_active", operator: "eq", value: true },
        ],
        orderBy: { column: "title", ascending: true },
      });
    });
  }

  @ServiceMethod('toggleCourseStatus')
  async toggleCourseStatus(id: string) {
    return this.executeOperation('toggleCourseStatus', async () => {
      const { data: course } = await this.getById(id);
      if (!course) throw new Error("Course not found");
      
      return this.crudService.update(id, { is_active: !course.is_active });
    });
  }

  @ServiceMethod('duplicateCourse')
  async duplicateCourse(id: string, newTitle: string) {
    return this.executeOperation('duplicateCourse', async () => {
      const { data: course } = await this.getById(id);
      if (!course) throw new Error("Course not found");
      
      const { id: _, created_at, updated_at, ...courseData } = course;
      return this.createCourse({
        ...courseData,
        title: newTitle,
        is_active: false, // Start as inactive
      });
    });
  }

  @ServiceMethod('delete')
  async delete(id: string) {
    return this.executeOperation('delete', async () => {
      return this.crudService.delete(id);
    });
  }

  @ServiceMethod('deleteMany')
  async deleteMany(ids: string[]) {
    return this.executeOperation('deleteMany', async () => {
      return this.crudService.deleteMany(ids);
    });
  }
}

/**
 * Factory for creating CourseService instances
 */
export class CourseServiceFactory extends BaseServiceFactory<CourseService> {
  create(dependencies?: ServiceDependencies, options?: Record<string, any>): CourseService {
    return new CourseService(dependencies);
  }
}

/**
 * Factory function for creating service instances
 */
export function createCourseService(dependencies?: ServiceDependencies): CourseService {
  return new CourseService(dependencies);
}

// Export singleton instance for backward compatibility
export const courseService = new CourseService();