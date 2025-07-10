import { CRUDService, withRetry } from "./crud-service";
import { supabase } from "@/lib/supabase";
import { z } from "zod";

// Student schema based on database structure
export const studentSchema = z.object({
  id: z.string().uuid().optional(),
  user_id: z.string().uuid(),
  internal_code: z.string().max(100),
  test_level: z.string().max(50).optional(),
  course_type: z.string().max(100).optional(),
  hours_tutored: z.number().int().default(0),
  hours_remaining: z.number().int().default(0),
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional(),
});

export const createStudentSchema = z.object({
  // User fields
  email: z.string().email("Invalid email address"),
  full_name: z.string().min(1, "Full name is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  
  // Student fields
  internal_code: z.string().min(1, "Internal code is required"),
  test_level: z.enum(["Basic", "Everyday A", "Everyday B", "Speak Up", "Business English", "1-on-1"]).optional(),
  course_type: z.enum(["Online", "Offline"]).optional(),
  total_hours: z.number().int().min(0).default(0),
  
  // Additional fields from requirements
  gender: z.enum(["male", "female", "other"]).optional(),
  photo_url: z.string().url().optional(),
  enrolled_courses: z.array(z.string()).optional(),
  purchased_materials: z.boolean().default(false),
  lead_source: z.string().optional(),
  sales_representative: z.string().optional(),
  payment_date: z.string().datetime().optional(),
  payment_amount: z.number().min(0).optional(),
  discount: z.number().min(0).max(100).optional(),
  course_start_date: z.string().datetime().optional(),
});

export type Student = z.infer<typeof studentSchema>;
export type CreateStudentData = z.infer<typeof createStudentSchema>;

interface StudentWithUser extends Student {
  user: {
    id: string;
    email: string;
    full_name: string;
    role: string;
  };
}

export class StudentService extends CRUDService<Student> {
  constructor(options?: { supabaseClient?: any }) {
    super({
      table: "students",
      select: `
        *,
        user:users(*)
      `,
      cache: {
        enabled: true,
        ttl: 5 * 60 * 1000, // 5 minutes
      },
      supabaseClient: options?.supabaseClient,
    });
    this.supabaseClient = options?.supabaseClient || supabase;
  }
  
  private supabaseClient: any;

  async createStudent(data: CreateStudentData) {
    return withRetry(async () => {
      // Validate data
      const validatedData = createStudentSchema.parse(data);
      
      // Start a transaction-like operation
      // First create the user
      const { data: newUser, error: userError } = await this.supabaseClient
        .from("users")
        .insert({
          email: validatedData.email,
          password_hash: await this.hashPassword(validatedData.password),
          full_name: validatedData.full_name,
          role: "student",
        })
        .select()
        .single();

      if (userError) {
        throw new Error(`Failed to create user: ${userError.message}`);
      }

      // Then create the student record
      const { data: newStudent, error: studentError } = await this.supabaseClient
        .from("students")
        .insert({
          user_id: newUser.id,
          internal_code: validatedData.internal_code,
          test_level: validatedData.test_level,
          course_type: validatedData.course_type,
          hours_tutored: 0,
          hours_remaining: validatedData.total_hours,
        })
        .select(`
          *,
          user:users(*)
        `)
        .single();

      if (studentError) {
        // Ideally, we should rollback the user creation here
        // For now, we'll just throw an error
        throw new Error(`Failed to create student: ${studentError.message}`);
      }

      // Store additional student metadata if needed
      if (validatedData.photo_url || validatedData.gender || validatedData.purchased_materials) {
        await this.updateStudentMetadata(newStudent.id, {
          photo_url: validatedData.photo_url,
          gender: validatedData.gender,
          purchased_materials: validatedData.purchased_materials,
          lead_source: validatedData.lead_source,
          sales_representative: validatedData.sales_representative,
          payment_date: validatedData.payment_date,
          payment_amount: validatedData.payment_amount,
          discount: validatedData.discount,
          course_start_date: validatedData.course_start_date,
        });
      }

      return { data: newStudent, error: null };
    }, {
      maxRetries: 3,
      onRetry: (error, attempt) => {
        console.log(`Retry attempt ${attempt} for student creation:`, error);
      },
    });
  }

  async updateStudent(id: string, data: Partial<CreateStudentData>) {
    return withRetry(async () => {
      const updates: any = {};
      const userUpdates: any = {};

      // Separate student and user fields
      if (data.internal_code) updates.internal_code = data.internal_code;
      if (data.test_level) updates.test_level = data.test_level;
      if (data.course_type) updates.course_type = data.course_type;
      if (data.total_hours !== undefined) updates.hours_remaining = data.total_hours;

      if (data.email) userUpdates.email = data.email;
      if (data.full_name) userUpdates.full_name = data.full_name;
      if (data.password) userUpdates.password_hash = await this.hashPassword(data.password);

      // Update student record
      if (Object.keys(updates).length > 0) {
        const { error } = await this.supabaseClient
          .from("students")
          .update(updates)
          .eq("id", id);

        if (error) throw error;
      }

      // Update user record if needed
      if (Object.keys(userUpdates).length > 0) {
        // Get the user_id first
        const { data: student } = await this.getById(id);
        if (student && student.user_id) {
          const { error } = await this.supabaseClient
            .from("users")
            .update(userUpdates)
            .eq("id", student.user_id);

          if (error) throw error;
        }
      }

      // Get updated student
      return this.getById(id);
    });
  }

  async getStudentsByTestLevel(testLevel: string) {
    return this.getAll({
      filters: [{ column: "test_level", operator: "eq", value: testLevel }],
      orderBy: { column: "created_at", ascending: false },
    });
  }

  async getStudentsByCourseType(courseType: string) {
    return this.getAll({
      filters: [{ column: "course_type", operator: "eq", value: courseType }],
      orderBy: { column: "created_at", ascending: false },
    });
  }

  async updateStudentHours(id: string, hoursToDeduct: number) {
    const { data: student } = await this.getById(id);
    if (!student) throw new Error("Student not found");

    const newHoursRemaining = Math.max(0, student.hours_remaining - hoursToDeduct);
    const newHoursTutored = student.hours_tutored + hoursToDeduct;

    return this.update(id, {
      hours_remaining: newHoursRemaining,
      hours_tutored: newHoursTutored,
    });
  }

  private async hashPassword(password: string): Promise<string> {
    // In a real app, use bcrypt or similar
    // This is just a placeholder
    const bcrypt = await import("bcryptjs");
    return bcrypt.hash(password, 10);
  }

  private async updateStudentMetadata(studentId: string, metadata: any) {
    // This would typically be stored in a separate metadata table
    // For now, we'll skip this implementation
    console.log("Storing student metadata:", { studentId, metadata });
  }
}

// Export singleton instance
export const studentService = new StudentService();