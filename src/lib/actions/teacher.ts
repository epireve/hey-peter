"use server";

import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { teacherFormSchema, type TeacherFormData } from "@/lib/schemas/teacher";
import { z } from "zod";
import bcrypt from "bcryptjs";

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
    
    // Check if coach code already exists
    const { data: existingTeacher } = await supabase
      .from("teachers")
      .select("id")
      .eq("coach_code", validatedData.coach_code)
      .single();
    
    if (existingTeacher) {
      return { error: "A teacher with this coach code already exists" };
    }
    
    // Hash the password
    const hashedPassword = await bcrypt.hash(validatedData.password, 10);
    
    // Start a transaction by creating user first
    const { data: newUser, error: userError } = await supabase
      .from("users")
      .insert({
        email: validatedData.email,
        password_hash: hashedPassword,
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
        coach_code: validatedData.coach_code,
        availability: validatedData.availability,
        compensation: validatedData.compensation,
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

export async function updateTeacher(id: string, data: Partial<TeacherFormData>) {
  const supabase = createServerComponentClient({ cookies });
  
  try {
    // Update teacher record
    const { error: teacherError } = await supabase
      .from("teachers")
      .update({
        coach_code: data.coach_code,
        availability: data.availability,
        compensation: data.compensation,
      })
      .eq("id", id);
    
    if (teacherError) {
      return { error: teacherError.message };
    }
    
    // If user data needs updating
    if (data.email || data.full_name || data.password) {
      const { data: teacher } = await supabase
        .from("teachers")
        .select("user_id")
        .eq("id", id)
        .single();
      
      if (teacher) {
        const userUpdate: any = {};
        
        if (data.email) userUpdate.email = data.email;
        if (data.full_name) userUpdate.full_name = data.full_name;
        if (data.password) {
          userUpdate.password_hash = await bcrypt.hash(data.password, 10);
        }
        
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