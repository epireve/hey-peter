"use server";

import { logger } from '@/lib/services';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

import { createClient } from '@supabase/supabase-js';

export async function getUsers() {
  // Use service role key to bypass RLS for admin operations
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  
  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
  
  // Query from public.users table and map to expected format
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .order("created_at", { ascending: false });

  logger.info("getUsers result:", { data, error });

  if (error) {
    return {
      error: {
        message: error.message,
      },
    };
  }

  // Map the data to match what UserManagementClient expects
  const mappedUsers = data?.map(user => ({
    id: user.id,
    email: user.email,
    full_name: user.full_name,
    created_at: user.created_at,
    updated_at: user.updated_at,
    user_metadata: {
      full_name: user.full_name,
      role: user.role
    },
    role: user.role,
    banned: false,
    email_confirmed_at: user.created_at, // Use created_at as a proxy
    last_sign_in_at: null,
  })) || [];

  logger.info("Mapped users count:", mappedUsers.length);

  return {
    data: mappedUsers,
  };
}

export async function getUser(id: string) {
  const supabase = createServerComponentClient({ cookies });
  
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", id)
    .single();
  
  if (error) {
    return { error: { message: error.message } };
  }
  
  return { data };
}

export async function updateUser(id: string, data: { email: string; full_name: string; role: string }) {
  const supabase = createServerComponentClient({ cookies });
  
  try {
    const { error } = await supabase
      .from("users")
      .update({
        email: data.email,
        full_name: data.full_name,
        role: data.role,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);
    
    if (error) {
      return { error: error.message };
    }
    
    return { data: { success: true } };
  } catch (error) {
    return { error: "An unexpected error occurred" };
  }
}