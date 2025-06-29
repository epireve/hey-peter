import { z } from "zod";

export const teacherFormSchema = z.object({
  // User information
  email: z.string().email("Invalid email address"),
  full_name: z.string().min(1, "Full name is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  
  // Teacher specific information
  coach_code: z.string().min(1, "Coach code is required").max(100),
  
  // Availability - storing as JSON for flexibility
  availability: z.object({
    monday: z.array(z.object({
      start: z.string(),
      end: z.string()
    })).optional(),
    tuesday: z.array(z.object({
      start: z.string(),
      end: z.string()
    })).optional(),
    wednesday: z.array(z.object({
      start: z.string(),
      end: z.string()
    })).optional(),
    thursday: z.array(z.object({
      start: z.string(),
      end: z.string()
    })).optional(),
    friday: z.array(z.object({
      start: z.string(),
      end: z.string()
    })).optional(),
    saturday: z.array(z.object({
      start: z.string(),
      end: z.string()
    })).optional(),
    sunday: z.array(z.object({
      start: z.string(),
      end: z.string()
    })).optional(),
  }).optional(),
  
  // Compensation information
  compensation: z.object({
    hourly_rate: z.coerce.number().min(0, "Hourly rate must be positive"),
    payment_method: z.enum(["bank_transfer", "paypal", "cash", "other"]),
    bank_details: z.string().optional(),
    notes: z.string().optional()
  }).optional(),
  
  // Additional settings
  send_credentials: z.boolean().default(true),
  activate_immediately: z.boolean().default(true)
});

export type TeacherFormData = z.infer<typeof teacherFormSchema>;

// Schema for updating teacher (password is optional)
export const teacherUpdateSchema = teacherFormSchema.extend({
  password: z.string().min(8, "Password must be at least 8 characters").optional(),
});

export type TeacherUpdateData = z.infer<typeof teacherUpdateSchema>;