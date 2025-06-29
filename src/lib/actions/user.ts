"use server";

import { supabase } from "@/lib/supabase";

export async function getUsers() {
  const { data, error } = await supabase.from("users").select("*");

  if (error) {
    return {
      error: {
        message: error.message,
      },
    };
  }

  return {
    data,
  };
}