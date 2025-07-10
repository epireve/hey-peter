import { supabase } from '@/lib/supabase';
import type {
  StudentInfo,
  CreateStudentData,
  UpdateStudentData,
  StudentStatistics,
  StudentSearchParams,
  StudentSearchResult,
  ExportStudentData,
  Material,
  ProficiencyAssessment,
  DatabaseResponse,
  StudentManagementService,
  EmergencyContact,
} from '@/types/student-management';

class StudentManagementServiceImpl implements StudentManagementService {
  private async handleDatabaseOperation<T>(
    operation: () => Promise<{ data: T | null; error: any }>
  ): Promise<DatabaseResponse<T>> {
    try {
      const { data, error } = await operation();
      
      if (error) {
        console.error('Database operation failed:', error);
        return { data: null, error: new Error(error.message || 'Database operation failed') };
      }
      
      return { data, error: null };
    } catch (error) {
      console.error('Unexpected error in database operation:', error);
      return { 
        data: null, 
        error: error instanceof Error ? error : new Error('Unexpected error occurred') 
      };
    }
  }

  async createStudent(data: CreateStudentData): Promise<DatabaseResponse<StudentInfo>> {
    return this.handleDatabaseOperation(async () => {
      // Start a transaction-like operation
      // First create the user
      const { data: newUser, error: userError } = await supabase
        .from('users')
        .insert({
          email: data.email,
          full_name: data.full_name,
          role: 'student',
        })
        .select()
        .single();

      if (userError) {
        throw new Error(`Failed to create user: ${userError.message}`);
      }

      // Prepare student data
      const studentData: any = {
        user_id: newUser.id,
        full_name: data.full_name,
        email: data.email,
        phone: data.phone,
        date_of_birth: data.date_of_birth,
        nationality: data.nationality,
        address: data.address,
        test_level: data.test_level,
        enrollment_date: data.enrollment_date || new Date().toISOString().split('T')[0],
        expected_graduation_date: data.expected_graduation_date,
        coach: data.coach,
        sales_representative: data.sales_representative,
        proficiency_level: data.proficiency_level,
        total_hours_purchased: data.total_hours_purchased || 0,
        hours_used: 0,
        hour_balance: data.total_hours_purchased || 0,
        payment_status: data.payment_status || 'Pending',
        total_amount_paid: data.total_amount_paid || 0,
        outstanding_amount: data.outstanding_amount || 0,
        payment_plan: data.payment_plan,
        lead_source: data.lead_source,
        referrer_name: data.referrer_name,
        referrer_type: data.referrer_type,
        status: data.status || 'Active',
        progress_percentage: 0,
        attendance_rate: 100.0,
        profile_data: {
          gender: data.gender,
        },
        emergency_contact: data.emergency_contact || {},
      };

      // Generate internal code if not provided
      if (data.internal_code) {
        studentData.internal_code = data.internal_code;
      } else if (data.coach) {
        // Generate based on coach code
        const coachCode = data.coach.split(' ').map(name => name.charAt(0)).join('').toUpperCase().substring(0, 3);
        const { data: codeData } = await supabase.rpc('generate_internal_code', { coach_code: coachCode });
        studentData.internal_code = codeData;
      }

      // Create the student record
      const { data: newStudent, error: studentError } = await supabase
        .from('students')
        .insert(studentData)
        .select(`
          *,
          users!inner(email, full_name, role)
        `)
        .single();

      if (studentError) {
        // Rollback user creation
        await supabase.from('users').delete().eq('id', newUser.id);
        throw new Error(`Failed to create student: ${studentError.message}`);
      }

      // Add initial proficiency assessment if provided
      if (data.initial_assessment_score && data.proficiency_level) {
        await this.addProficiencyAssessment(newStudent.id, {
          assessment_type: 'Manual',
          proficiency_level: data.proficiency_level,
          score: data.initial_assessment_score,
          assessment_date: new Date().toISOString().split('T')[0],
          assessor: 'System - Initial Assessment',
          is_active: true,
        });
      }

      return { data: this.mapDatabaseStudentToStudentInfo(newStudent), error: null };
    });
  }

  async updateStudent(id: string, data: UpdateStudentData): Promise<DatabaseResponse<StudentInfo>> {
    return this.handleDatabaseOperation(async () => {
      const updates: any = {};
      const userUpdates: any = {};

      // Map update fields
      if (data.full_name) {
        updates.full_name = data.full_name;
        userUpdates.full_name = data.full_name;
      }
      if (data.email) {
        updates.email = data.email;
        userUpdates.email = data.email;
      }
      if (data.phone !== undefined) updates.phone = data.phone;
      if (data.date_of_birth !== undefined) updates.date_of_birth = data.date_of_birth;
      if (data.nationality !== undefined) updates.nationality = data.nationality;
      if (data.address !== undefined) updates.address = data.address;
      if (data.test_level !== undefined) updates.test_level = data.test_level;
      if (data.enrollment_date !== undefined) updates.enrollment_date = data.enrollment_date;
      if (data.expected_graduation_date !== undefined) updates.expected_graduation_date = data.expected_graduation_date;
      if (data.coach !== undefined) updates.coach = data.coach;
      if (data.sales_representative !== undefined) updates.sales_representative = data.sales_representative;
      if (data.proficiency_level !== undefined) updates.proficiency_level = data.proficiency_level;
      if (data.total_hours_purchased !== undefined) updates.total_hours_purchased = data.total_hours_purchased;
      if (data.hours_used !== undefined) updates.hours_used = data.hours_used;
      if (data.hour_balance !== undefined) updates.hour_balance = data.hour_balance;
      if (data.payment_status !== undefined) updates.payment_status = data.payment_status;
      if (data.total_amount_paid !== undefined) updates.total_amount_paid = data.total_amount_paid;
      if (data.outstanding_amount !== undefined) updates.outstanding_amount = data.outstanding_amount;
      if (data.payment_plan !== undefined) updates.payment_plan = data.payment_plan;
      if (data.lead_source !== undefined) updates.lead_source = data.lead_source;
      if (data.referrer_name !== undefined) updates.referrer_name = data.referrer_name;
      if (data.referrer_type !== undefined) updates.referrer_type = data.referrer_type;
      if (data.status !== undefined) updates.status = data.status;
      if (data.progress_percentage !== undefined) updates.progress_percentage = data.progress_percentage;
      if (data.attendance_rate !== undefined) updates.attendance_rate = data.attendance_rate;
      if (data.last_activity_date !== undefined) updates.last_activity_date = data.last_activity_date;

      // Handle emergency contact
      if (data.emergency_contact !== undefined) {
        updates.emergency_contact = data.emergency_contact;
      }

      // Update profile_data for gender
      if (data.gender !== undefined) {
        const { data: currentStudent } = await supabase
          .from('students')
          .select('profile_data')
          .eq('id', id)
          .single();

        const currentProfileData = currentStudent?.profile_data || {};
        updates.profile_data = { ...currentProfileData, gender: data.gender };
      }

      // Update student record
      const { data: updatedStudent, error: studentError } = await supabase
        .from('students')
        .update(updates)
        .eq('id', id)
        .select(`
          *,
          users!inner(email, full_name, role)
        `)
        .single();

      if (studentError) {
        throw new Error(`Failed to update student: ${studentError.message}`);
      }

      // Update user record if needed
      if (Object.keys(userUpdates).length > 0 && updatedStudent.user_id) {
        const { error: userError } = await supabase
          .from('users')
          .update(userUpdates)
          .eq('id', updatedStudent.user_id);

        if (userError) {
          console.warn('Failed to update user record:', userError);
        }
      }

      return { data: this.mapDatabaseStudentToStudentInfo(updatedStudent), error: null };
    });
  }

  async deleteStudent(id: string): Promise<DatabaseResponse<boolean>> {
    return this.handleDatabaseOperation(async () => {
      // Get student to find user_id
      const { data: student, error: getError } = await supabase
        .from('students')
        .select('user_id')
        .eq('id', id)
        .single();

      if (getError) {
        throw new Error(`Failed to find student: ${getError.message}`);
      }

      // Delete student (this will cascade to related records)
      const { error: deleteError } = await supabase
        .from('students')
        .delete()
        .eq('id', id);

      if (deleteError) {
        throw new Error(`Failed to delete student: ${deleteError.message}`);
      }

      // Delete associated user
      if (student.user_id) {
        await supabase
          .from('users')
          .delete()
          .eq('id', student.user_id);
      }

      return { data: true, error: null };
    });
  }

  async getStudent(id: string): Promise<DatabaseResponse<StudentInfo>> {
    return this.handleDatabaseOperation(async () => {
      const { data, error } = await supabase
        .from('student_comprehensive_view')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        throw new Error(`Failed to get student: ${error.message}`);
      }

      return { data: this.mapDatabaseStudentToStudentInfo(data), error: null };
    });
  }

  async searchStudents(params: StudentSearchParams): Promise<DatabaseResponse<StudentSearchResult[]>> {
    return this.handleDatabaseOperation(async () => {
      const { data, error } = await supabase.rpc('search_students', {
        search_term: params.search_term || '',
        status_filter: params.status_filter || '',
        course_type_filter: params.course_type_filter || '',
        limit_count: params.limit || 50,
        offset_count: params.offset || 0,
      });

      if (error) {
        throw new Error(`Failed to search students: ${error.message}`);
      }

      return { data: data || [], error: null };
    });
  }

  async getStudentStatistics(): Promise<DatabaseResponse<StudentStatistics>> {
    return this.handleDatabaseOperation(async () => {
      const { data, error } = await supabase.rpc('get_student_statistics');

      if (error) {
        throw new Error(`Failed to get statistics: ${error.message}`);
      }

      return { data: data || {}, error: null };
    });
  }

  async addMaterialIssuance(studentId: string, material: Omit<Material, 'id'>): Promise<DatabaseResponse<Material>> {
    return this.handleDatabaseOperation(async () => {
      const { data, error } = await supabase
        .from('student_material_issuance')
        .insert({
          student_id: studentId,
          material_name: material.material_name,
          material_type: material.material_type,
          issued_date: material.issued_date,
          return_date: material.return_date,
          condition: material.condition,
          cost: material.cost,
          notes: material.notes,
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to add material issuance: ${error.message}`);
      }

      return { data: this.mapDatabaseMaterialToMaterial(data), error: null };
    });
  }

  async updateMaterialIssuance(id: string, updates: Partial<Material>): Promise<DatabaseResponse<Material>> {
    return this.handleDatabaseOperation(async () => {
      const { data, error } = await supabase
        .from('student_material_issuance')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to update material issuance: ${error.message}`);
      }

      return { data: this.mapDatabaseMaterialToMaterial(data), error: null };
    });
  }

  async addProficiencyAssessment(studentId: string, assessment: Omit<ProficiencyAssessment, 'id'>): Promise<DatabaseResponse<ProficiencyAssessment>> {
    return this.handleDatabaseOperation(async () => {
      // Deactivate previous assessments
      await supabase
        .from('proficiency_assessments')
        .update({ is_active: false })
        .eq('student_id', studentId)
        .eq('is_active', true);

      // Add new assessment
      const { data, error } = await supabase
        .from('proficiency_assessments')
        .insert({
          student_id: studentId,
          ...assessment,
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to add proficiency assessment: ${error.message}`);
      }

      return { data, error: null };
    });
  }

  async getCurrentProficiency(studentId: string): Promise<DatabaseResponse<ProficiencyAssessment>> {
    return this.handleDatabaseOperation(async () => {
      const { data, error } = await supabase
        .from('proficiency_assessments')
        .select('*')
        .eq('student_id', studentId)
        .eq('is_active', true)
        .order('assessment_date', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        throw new Error(`Failed to get current proficiency: ${error.message}`);
      }

      return { data, error: null };
    });
  }

  async exportStudents(format: 'csv' | 'excel' | 'pdf', filters?: StudentSearchParams): Promise<DatabaseResponse<ExportStudentData[]>> {
    return this.handleDatabaseOperation(async () => {
      const searchParams = filters || {};
      const { data: students, error } = await this.searchStudents({
        ...searchParams,
        limit: 1000, // Large limit for export
      });

      if (error) {
        throw error;
      }

      const exportData: ExportStudentData[] = (students || []).map(student => ({
        student_id: student.student_id,
        full_name: student.full_name,
        email: student.email,
        test_level: student.test_level,
        status: student.status,
        progress_percentage: student.progress_percentage,
        payment_status: student.payment_status,
        total_amount_paid: student.total_amount_paid,
        coach: student.coach,
        created_at: student.created_at,
      }));

      return { data: exportData, error: null };
    });
  }

  async importStudents(data: CreateStudentData[]): Promise<DatabaseResponse<{ successful: number; failed: number; errors: string[] }>> {
    let successful = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const studentData of data) {
      try {
        const result = await this.createStudent(studentData);
        if (result.error) {
          failed++;
          errors.push(`${studentData.email}: ${result.error.message}`);
        } else {
          successful++;
        }
      } catch (error) {
        failed++;
        errors.push(`${studentData.email}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return {
      data: { successful, failed, errors },
      error: null,
    };
  }

  private mapDatabaseStudentToStudentInfo(dbStudent: any): StudentInfo {
    return {
      id: dbStudent.id,
      user_id: dbStudent.user_id,
      student_id: dbStudent.student_id,
      internal_code: dbStudent.internal_code,
      full_name: dbStudent.full_name || dbStudent.user_full_name,
      email: dbStudent.email || dbStudent.user_email,
      phone: dbStudent.phone,
      date_of_birth: dbStudent.date_of_birth,
      nationality: dbStudent.nationality,
      address: dbStudent.address,
      gender: dbStudent.profile_data?.gender,
      emergency_contact: dbStudent.emergency_contact as EmergencyContact,
      test_level: dbStudent.test_level,
      enrollment_date: dbStudent.enrollment_date,
      expected_graduation_date: dbStudent.expected_graduation_date,
      coach: dbStudent.coach,
      sales_representative: dbStudent.sales_representative,
      proficiency_level: dbStudent.proficiency_level || dbStudent.current_proficiency?.level,
      current_assessment_score: dbStudent.current_proficiency?.score,
      last_assessment_date: dbStudent.current_proficiency?.assessment_date,
      ai_assessment_enabled: dbStudent.current_proficiency?.assessment_type === 'AI-based',
      materials_issued: (dbStudent.materials_issued || []).map(this.mapDatabaseMaterialToMaterial),
      total_hours_purchased: dbStudent.total_hours_purchased,
      hours_used: dbStudent.hours_used,
      hour_balance: dbStudent.hour_balance,
      payment_status: dbStudent.payment_status,
      total_amount_paid: dbStudent.total_amount_paid,
      outstanding_amount: dbStudent.outstanding_amount,
      payment_plan: dbStudent.payment_plan,
      lead_source: dbStudent.lead_source,
      referrer_name: dbStudent.referrer_name,
      referrer_type: dbStudent.referrer_type,
      status: dbStudent.status,
      progress_percentage: dbStudent.progress_percentage,
      attendance_rate: dbStudent.attendance_rate,
      created_at: dbStudent.created_at,
      updated_at: dbStudent.updated_at,
      last_activity_date: dbStudent.last_activity_date,
    };
  }

  private mapDatabaseMaterialToMaterial(dbMaterial: any): Material {
    return {
      id: dbMaterial.id,
      material_name: dbMaterial.material_name,
      material_type: dbMaterial.material_type,
      issued_date: dbMaterial.issued_date,
      return_date: dbMaterial.return_date,
      condition: dbMaterial.condition,
      cost: dbMaterial.cost,
      notes: dbMaterial.notes,
    };
  }
}

// Export singleton instance
export const studentManagementService = new StudentManagementServiceImpl();