"use server";

import { supabase } from "@/lib/supabase";
import {
  resetPasswordSchema,
  resetPasswordUpdateSchema,
  updatePasswordSchema
} from "@/lib/validations";
import { z } from "zod";

export async function resetPassword(
  values: z.infer<typeof resetPasswordSchema>
) {
  const { email } = values;

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_BASE_URL}/password-update`,
  });

  if (error) {
    return {
      error: {
        message: error.message,
      },
    };
  }

  return {
    data: {
      message: "Password reset link sent. Please check your email.",
    },
  };
}

// For password reset flow (no current password needed)
export async function resetPasswordUpdate(
  values: z.infer<typeof resetPasswordUpdateSchema>
) {
  const { newPassword } = values;

  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (error) {
    return {
      error: {
        message: error.message,
      },
    };
  }

  return {
    data: {
      message: "Password updated successfully.",
    },
  };
}

// For authenticated users changing password (requires current password verification)
export async function updatePassword(
  values: z.infer<typeof updatePasswordSchema>
) {
  const { currentPassword, newPassword } = values;

  // First verify current password by attempting to sign in
  const { data: user } = await supabase.auth.getUser();
  
  if (!user.user?.email) {
    return {
      error: {
        message: "User not authenticated.",
      },
    };
  }

  // Verify current password
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: user.user.email,
    password: currentPassword,
  });

  if (signInError) {
    return {
      error: {
        message: "Current password is incorrect.",
      },
    };
  }

  // Update password
  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (error) {
    return {
      error: {
        message: error.message,
      },
    };
  }

  return {
    data: {
      message: "Password updated successfully.",
    },
  };
}