// Enhanced Student Management Types
// These types match the database schema and StudentInformationManager interface

export interface EmergencyContact {
  name: string;
  relationship: string;
  phone: string;
}

export interface Material {
  id: string;
  material_name: string;
  material_type: 'Book' | 'Workbook' | 'Audio CD' | 'Online Access' | 'Certificate' | 'Other';
  issued_date: string;
  return_date?: string;
  condition: 'New' | 'Good' | 'Fair' | 'Damaged' | 'Lost';
  cost: number;
  notes?: string;
}

export interface ProficiencyAssessment {
  id: string;
  assessment_type: 'Manual' | 'AI-based';
  proficiency_level: 'Beginner' | 'Elementary' | 'Intermediate' | 'Upper-Intermediate' | 'Advanced' | 'Proficient';
  score: number;
  assessment_date: string;
  assessor: string;
  notes?: string;
  is_active: boolean;
}

export interface StudentInfo {
  // Core student information
  id: string;
  user_id?: string;
  student_id: string; // Auto-generated HPA001 format
  internal_code: string; // Coach Code + Student Number
  
  // Personal information
  full_name: string;
  email: string;
  phone?: string;
  date_of_birth?: string;
  nationality?: string;
  address?: string;
  gender?: string;
  profile_photo?: string;
  emergency_contact?: EmergencyContact;
  
  // Course information
  test_level?: 'Basic' | 'Everyday A' | 'Everyday B' | 'Speak Up' | 'Business English' | '1-on-1';
  enrollment_date?: string;
  expected_graduation_date?: string;
  coach?: string;
  sales_representative?: string;
  
  // English proficiency
  proficiency_level?: 'Beginner' | 'Elementary' | 'Intermediate' | 'Upper-Intermediate' | 'Advanced' | 'Proficient';
  current_assessment_score?: number;
  initial_assessment_score?: number;
  last_assessment_date?: string;
  ai_assessment_enabled?: boolean;
  
  // Materials and tracking
  materials_issued?: Material[];
  total_hours_purchased?: number;
  hours_used?: number;
  hour_balance?: number;
  
  // Payment information
  payment_status?: 'Paid' | 'Pending' | 'Overdue' | 'Installment';
  total_amount_paid?: number;
  outstanding_amount?: number;
  payment_plan?: string;
  payment_date?: string;
  discount_amount?: number;
  
  // Lead and referral
  lead_source?: 'Website' | 'Social Media' | 'Referral' | 'Walk-in' | 'Advertisement' | 'Other';
  referrer_name?: string;
  referrer_type?: 'Student' | 'Teacher' | 'Partner' | 'Other';
  
  // Status and progress
  status: 'Active' | 'Inactive' | 'Graduated' | 'Withdrawn' | 'On Hold';
  progress_percentage?: number;
  attendance_rate?: number;
  
  // Timestamps
  created_at: string;
  updated_at: string;
  last_activity_date?: string;
}

export interface CreateStudentData {
  // Required fields
  full_name: string;
  email: string;
  internal_code?: string; // Will be auto-generated if not provided
  
  // Personal information
  phone?: string;
  date_of_birth?: string;
  nationality?: string;
  address?: string;
  gender?: string;
  emergency_contact?: EmergencyContact;
  
  // Course information
  test_level?: 'Basic' | 'Everyday A' | 'Everyday B' | 'Speak Up' | 'Business English' | '1-on-1';
  enrollment_date?: string;
  expected_graduation_date?: string;
  coach?: string;
  sales_representative?: string;
  
  // English proficiency
  proficiency_level?: 'Beginner' | 'Elementary' | 'Intermediate' | 'Upper-Intermediate' | 'Advanced' | 'Proficient';
  initial_assessment_score?: number;
  ai_assessment_enabled?: boolean;
  
  // Hours and materials
  total_hours_purchased?: number;
  
  // Payment information
  payment_status?: 'Paid' | 'Pending' | 'Overdue' | 'Installment';
  total_amount_paid?: number;
  outstanding_amount?: number;
  payment_plan?: string;
  payment_date?: string;
  discount_amount?: number;
  
  // Lead and referral
  lead_source?: 'Website' | 'Social Media' | 'Referral' | 'Walk-in' | 'Advertisement' | 'Other';
  referrer_name?: string;
  referrer_type?: 'Student' | 'Teacher' | 'Partner' | 'Other';
  
  // Status
  status?: 'Active' | 'Inactive' | 'Graduated' | 'Withdrawn' | 'On Hold';
}

export interface UpdateStudentData extends Partial<CreateStudentData> {
  progress_percentage?: number;
  attendance_rate?: number;
  hours_used?: number;
  hour_balance?: number;
  last_activity_date?: string;
}

export interface StudentStatistics {
  total_students: number;
  active_students: number;
  graduated_students: number;
  total_revenue: number;
  outstanding_amount: number;
  by_course_type: Record<string, number>;
  by_status: Record<string, number>;
  by_payment_status: Record<string, number>;
}

export interface StudentSearchParams {
  search_term?: string;
  status_filter?: string;
  course_type_filter?: string;
  limit?: number;
  offset?: number;
}

export interface StudentSearchResult {
  id: string;
  student_id: string;
  internal_code: string;
  full_name: string;
  email: string;
  test_level?: string;
  status: string;
  progress_percentage: number;
  payment_status: string;
  coach?: string;
  total_amount_paid: number;
  created_at: string;
}

export interface ExportStudentData {
  student_id: string;
  full_name: string;
  email: string;
  phone?: string;
  test_level?: string;
  status: string;
  enrollment_date?: string;
  progress_percentage: number;
  payment_status: string;
  total_amount_paid: number;
  coach?: string;
  created_at: string;
}

// Database response types
export interface DatabaseResponse<T> {
  data: T | null;
  error: Error | null;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

// Service interface
export interface StudentManagementService {
  // CRUD operations
  createStudent(data: CreateStudentData): Promise<DatabaseResponse<StudentInfo>>;
  updateStudent(id: string, data: UpdateStudentData): Promise<DatabaseResponse<StudentInfo>>;
  deleteStudent(id: string): Promise<DatabaseResponse<boolean>>;
  getStudent(id: string): Promise<DatabaseResponse<StudentInfo>>;
  
  // Search and filtering
  searchStudents(params: StudentSearchParams): Promise<DatabaseResponse<StudentSearchResult[]>>;
  getStudentStatistics(): Promise<DatabaseResponse<StudentStatistics>>;
  
  // Materials management
  addMaterialIssuance(studentId: string, material: Omit<Material, 'id'>): Promise<DatabaseResponse<Material>>;
  updateMaterialIssuance(id: string, updates: Partial<Material>): Promise<DatabaseResponse<Material>>;
  
  // Proficiency assessment
  addProficiencyAssessment(studentId: string, assessment: Omit<ProficiencyAssessment, 'id'>): Promise<DatabaseResponse<ProficiencyAssessment>>;
  getCurrentProficiency(studentId: string): Promise<DatabaseResponse<ProficiencyAssessment>>;
  
  // Import/Export
  exportStudents(format: 'csv' | 'excel' | 'pdf', filters?: StudentSearchParams): Promise<DatabaseResponse<ExportStudentData[]>>;
  importStudents(data: CreateStudentData[]): Promise<DatabaseResponse<{ successful: number; failed: number; errors: string[] }>>;
}