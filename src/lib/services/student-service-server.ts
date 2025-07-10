import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { StudentService } from './student-service';

// Server-side student service that uses authenticated Supabase client
export function createServerStudentService() {
  const supabaseClient = createServerComponentClient({ cookies });
  
  return new StudentService({
    supabaseClient
  });
}