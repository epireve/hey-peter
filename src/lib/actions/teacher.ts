"use server";

import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { teacherFormSchema, teacherUpdateSchema, type TeacherFormData, type TeacherUpdateData } from "@/lib/schemas/teacher";
import { z } from "zod";

export async function createTeacher(data: TeacherFormData) {
  const supabase = createServerComponentClient({ cookies });
  
  try {
    // Validate the data
    const validatedData = teacherFormSchema.parse(data);
    
    // Check if email already exists
    const { data: existingUser } = await supabase
      .from("users")
      .select("id")
      .eq("email", validatedData.email)
      .single();
    
    if (existingUser) {
      return { error: "A user with this email already exists" };
    }
    
    // Note: coach_code is not a column in the teachers table
    // It might be used for student internal_code reference
    
    // Start a transaction by creating user first
    // Note: Password should be handled through Supabase Auth, not stored in the users table
    const { data: newUser, error: userError } = await supabase
      .from("users")
      .insert({
        email: validatedData.email,
        full_name: validatedData.full_name,
        role: "teacher",
      })
      .select()
      .single();
    
    if (userError || !newUser) {
      return { error: userError?.message || "Failed to create user" };
    }
    
    // Create teacher record
    const { data: newTeacher, error: teacherError } = await supabase
      .from("teachers")
      .insert({
        user_id: newUser.id,
        email: validatedData.email,
        full_name: validatedData.full_name,
        availability: validatedData.availability,
        hourly_rate: validatedData.compensation?.hourly_rate || 0,
      })
      .select()
      .single();
    
    if (teacherError) {
      // If teacher creation fails, we should ideally rollback the user creation
      // For now, we'll just return an error
      return { error: teacherError.message };
    }
    
    // Send credentials email if requested
    if (validatedData.send_credentials) {
      // TODO: Implement email sending via Mailgun
      // await sendCredentialsEmail({
      //   email: validatedData.email,
      //   password: validatedData.password,
      //   full_name: validatedData.full_name,
      // });
    }
    
    return { 
      data: { 
        user: newUser, 
        teacher: newTeacher 
      } 
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { error: "Invalid form data" };
    }
    
    return { error: "An unexpected error occurred" };
  }
}

export async function getTeachers() {
  const supabase = createServerComponentClient({ cookies });
  
  const { data, error } = await supabase
    .from("teachers")
    .select("*")
    .order("created_at", { ascending: false });
  
  if (error) {
    return { error: error.message };
  }
  
  return { data };
}

export async function getTeacher(id: string) {
  const supabase = createServerComponentClient({ cookies });
  
  const { data, error } = await supabase
    .from("teachers")
    .select(`
      *,
      user:users(*)
    `)
    .eq("id", id)
    .single();
  
  if (error) {
    return { error: error.message };
  }
  
  return { data };
}

export async function updateTeacher(id: string, data: TeacherUpdateData) {
  const supabase = createServerComponentClient({ cookies });
  
  console.log("updateTeacher called with:", { id, data });
  
  try {
    // Validate the data
    const validatedData = teacherUpdateSchema.parse(data);
    console.log("Validated data:", validatedData);
    
    // Update teacher record
    const updateData: any = {};
    if (validatedData.availability) updateData.availability = validatedData.availability;
    if (validatedData.compensation?.hourly_rate !== undefined) updateData.hourly_rate = validatedData.compensation.hourly_rate;
    if (validatedData.email) updateData.email = validatedData.email;
    if (validatedData.full_name) updateData.full_name = validatedData.full_name;
    
    // Always update updated_at timestamp
    updateData.updated_at = new Date().toISOString();
    
    console.log("Updating teachers table with:", updateData);
    
    const { error: teacherError } = await supabase
      .from("teachers")
      .update(updateData)
      .eq("id", id);
    
    if (teacherError) {
      console.error("Teacher update error:", teacherError);
      return { error: teacherError.message };
    }
    
    // If user data needs updating
    if (validatedData.email || validatedData.full_name) {
      const { data: teacher } = await supabase
        .from("teachers")
        .select("user_id")
        .eq("id", id)
        .single();
      
      if (teacher) {
        const userUpdate: any = {};
        
        if (validatedData.email) userUpdate.email = validatedData.email;
        if (validatedData.full_name) userUpdate.full_name = validatedData.full_name;
        // Note: Password updates should be handled through Supabase Auth
        
        const { error: userError } = await supabase
          .from("users")
          .update(userUpdate)
          .eq("id", teacher.user_id);
        
        if (userError) {
          return { error: userError.message };
        }
      }
    }
    
    return { data: { success: true } };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { error: "Invalid form data: " + error.errors.map(e => e.message).join(", ") };
    }
    return { error: "An unexpected error occurred" };
  }
}

export async function deleteTeacher(id: string) {
  const supabase = createServerComponentClient({ cookies });
  
  // Get the user_id first
  const { data: teacher } = await supabase
    .from("teachers")
    .select("user_id")
    .eq("id", id)
    .single();
  
  if (!teacher) {
    return { error: "Teacher not found" };
  }
  
  // Delete the user (this will cascade delete the teacher record)
  const { error } = await supabase
    .from("users")
    .delete()
    .eq("id", teacher.user_id);
  
  if (error) {
    return { error: error.message };
  }
  
  return { data: { success: true } };
}