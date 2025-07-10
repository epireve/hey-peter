/**
 * Hour Management System Types
 * 
 * This file contains TypeScript interfaces and types for the hour management system
 * including packages, purchases, transactions, and alerts.
 */

// =====================================================================================
// ENUMS
// =====================================================================================

export type HourPackageType = 
  | 'standard_10'
  | 'standard_20' 
  | 'standard_50'
  | 'premium_10'
  | 'premium_20'
  | 'premium_50'
  | 'corporate_100'
  | 'corporate_200'
  | 'corporate_500'
  | 'trial_2'
  | 'custom';

export type HourTransactionType =
  | 'purchase'
  | 'deduction'
  | 'refund'
  | 'transfer'
  | 'adjustment'
  | 'expiry'
  | 'bonus';

export type PaymentStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'refunded'
  | 'cancelled';

export type PaymentMethod =
  | 'credit_card'
  | 'debit_card'
  | 'bank_transfer'
  | 'paypal'
  | 'stripe'
  | 'cash'
  | 'corporate_invoice'
  | 'other';

export type HourAlertType =
  | 'low_balance'
  | 'expiring_soon'
  | 'expired'
  | 'no_hours';

export type ApprovalStatus =
  | 'pending'
  | 'approved'
  | 'rejected';

export type LeaveRequestType =
  | 'sick'
  | 'emergency'
  | 'personal'
  | 'work'
  | 'family'
  | 'travel'
  | 'other';

export type LeaveRequestStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'cancelled';

export type LeaveRuleType =
  | 'monthly_limit'
  | 'blackout_dates'
  | 'advance_notice'
  | 'consecutive_days'
  | 'minimum_hours'
  | 'approval_required'
  | 'cancellation_policy';

export type LeaveRuleFrequency =
  | 'daily'
  | 'weekly'
  | 'monthly'
  | 'quarterly'
  | 'annually'
  | 'per_course';

// =====================================================================================
// INTERFACES
// =====================================================================================

/**
 * Hour package definition
 */
export interface HourPackage {
  id: string;
  packageType: HourPackageType;
  name: string;
  description?: string;
  hoursIncluded: number;
  validityDays: number;
  price: number;
  currency: string;
  
  // Discount and pricing
  discountPercentage?: number;
  originalPrice?: number;
  
  // Class type restrictions
  classTypesAllowed: string[];
  courseTypesAllowed: string[];
  
  // Features and benefits
  features: string[];
  
  // Status and visibility
  isActive: boolean;
  isFeatured: boolean;
  displayOrder: number;
  
  // Limits and restrictions
  maxPurchasesPerStudent?: number;
  minPurchaseHours?: number;
  
  // Corporate package settings
  isCorporate: boolean;
  requiresApproval: boolean;
  
  // Metadata
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
}

/**
 * Hour purchase record
 */
export interface HourPurchase {
  id: string;
  studentId: string;
  packageId: string;
  
  // Purchase details
  hoursPurchased: number;
  pricePaid: number;
  currency: string;
  
  // Payment information
  paymentStatus: PaymentStatus;
  paymentMethod?: PaymentMethod;
  paymentReference?: string;
  paymentGatewayResponse?: Record<string, any>;
  paidAt?: string;
  
  // Validity period
  validFrom: string;
  validUntil: string;
  
  // Usage tracking
  hoursUsed: number;
  hoursRemaining: number;
  
  // Transfer settings
  isTransferable: boolean;
  transferLimit?: number;
  transfersMade: number;
  
  // Corporate/bulk purchase
  isCorporatePurchase: boolean;
  corporateAccountId?: string;
  invoiceNumber?: string;
  
  // Status
  isActive: boolean;
  isExpired: boolean;
  
  // Metadata
  notes?: string;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

/**
 * Hour transaction record
 */
export interface HourTransaction {
  id: string;
  studentId: string;
  purchaseId?: string;
  
  // Transaction details
  transactionType: HourTransactionType;
  hoursAmount: number; // Positive for additions, negative for deductions
  balanceBefore: number;
  balanceAfter: number;
  
  // Related entities
  classId?: string;
  bookingId?: string;
  transferToStudentId?: string;
  transferFromStudentId?: string;
  
  // Class type and deduction rates
  classType?: string;
  deductionRate?: number;
  
  // Description and reason
  description: string;
  reason?: string;
  
  // Approval for manual transactions
  requiresApproval: boolean;
  approvedBy?: string;
  approvedAt?: string;
  
  // Reversal tracking
  isReversed: boolean;
  reversedBy?: string;
  reversedAt?: string;
  reversalReason?: string;
  originalTransactionId?: string;
  
  // Metadata
  metadata?: Record<string, any>;
  createdAt: string;
  createdBy?: string;
}

/**
 * Hour adjustment record
 */
export interface HourAdjustment {
  id: string;
  studentId: string;
  transactionId: string;
  
  // Adjustment details
  adjustmentType: string;
  hoursAdjusted: number;
  reason: string;
  
  // Supporting documentation
  supportingDocuments?: Array<{
    name: string;
    url: string;
    type: string;
  }>;
  
  // Approval workflow
  requestedBy: string;
  requestedAt: string;
  approvedBy?: string;
  approvedAt?: string;
  approvalStatus: ApprovalStatus;
  approvalNotes?: string;
  
  // Impact tracking
  affectedClasses?: string[];
  affectedBookings?: string[];
  
  // Metadata
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

/**
 * Hour alert record
 */
export interface HourAlert {
  id: string;
  studentId: string;
  alertType: HourAlertType;
  
  // Alert details
  hoursRemaining?: number;
  expiryDate?: string;
  thresholdValue?: number;
  
  // Alert status
  isActive: boolean;
  isAcknowledged: boolean;
  acknowledgedAt?: string;
  acknowledgedBy?: string;
  
  // Notification tracking
  notificationsSent: number;
  lastNotificationAt?: string;
  nextNotificationAt?: string;
  
  // Actions taken
  actionTaken?: string;
  actionTakenAt?: string;
  actionTakenBy?: string;
  
  // Metadata
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

/**
 * Hour transfer log
 */
export interface HourTransferLog {
  id: string;
  fromStudentId: string;
  toStudentId: string;
  fromPurchaseId: string;
  
  // Transfer details
  hoursTransferred: number;
  transferReason: string;
  
  // Family account verification
  isFamilyTransfer: boolean;
  familyRelationship?: string;
  
  // Approval
  requiresApproval: boolean;
  approvedBy?: string;
  approvedAt?: string;
  approvalStatus: string;
  
  // Transaction references
  fromTransactionId?: string;
  toTransactionId?: string;
  
  // Metadata
  notes?: string;
  metadata?: Record<string, any>;
  createdAt: string;
  createdBy?: string;
}

/**
 * Leave request record
 */
export interface LeaveRequest {
  id: string;
  studentId: string;
  classId: string;
  bookingId?: string;
  
  // Request details
  classDate: string;
  classTime: string;
  classType: string;
  teacherId?: string;
  teacherName?: string;
  
  // Leave details
  reason: string;
  leaveType: LeaveRequestType;
  
  // Medical certificate (for sick leave)
  medicalCertificateUrl?: string;
  
  // Submission validation
  submittedAt: string;
  hoursBeforeClass: number;
  meets48HourRule: boolean;
  
  // Status and approval
  status: LeaveRequestStatus;
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNotes?: string;
  
  // Hour refund tracking
  hoursToRefund: number;
  refundPercentage: number;
  refundProcessed: boolean;
  refundTransactionId?: string;
  
  // Automatic approval
  autoApproved: boolean;
  
  // Metadata
  additionalNotes?: string;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

/**
 * Leave rule configuration
 */
export interface LeaveRule {
  id: string;
  name: string;
  description?: string;
  ruleType: LeaveRuleType;
  
  // Rule parameters
  value: number | string | boolean;
  frequency?: LeaveRuleFrequency;
  
  // Scope and applicability
  appliesToCourseTypes?: string[];
  appliesToStudentTypes?: string[];
  appliesToRegions?: string[];
  
  // Date-based rules
  blackoutDates?: Array<{
    startDate: string;
    endDate: string;
    reason: string;
  }>;
  
  // Conditional rules
  conditions?: Array<{
    field: string;
    operator: 'eq' | 'ne' | 'gt' | 'lt' | 'gte' | 'lte' | 'in' | 'nin';
    value: any;
  }>;
  
  // Exceptions
  exceptions?: Array<{
    condition: string;
    description: string;
  }>;
  
  // Status and visibility
  isActive: boolean;
  priority: number;
  
  // Metadata
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
}

/**
 * Leave request record
 */
export interface LeaveRequest {
  id: string;
  studentId: string;
  
  // Leave details
  startDate: string;
  endDate: string;
  reason: string;
  leaveType: 'medical' | 'vacation' | 'emergency' | 'other';
  
  // Affected classes
  affectedClasses: Array<{
    classId: string;
    className: string;
    classDate: string;
    hoursToRefund: number;
  }>;
  
  // Approval workflow
  approvalStatus: ApprovalStatus;
  approvedBy?: string;
  approvedAt?: string;
  approvalNotes?: string;
  
  // Rule validation
  ruleValidationResults?: Array<{
    ruleId: string;
    ruleName: string;
    isValid: boolean;
    message: string;
  }>;
  
  // Supporting documents
  supportingDocuments?: Array<{
    name: string;
    url: string;
    type: string;
  }>;
  
  // Hour processing
  totalHoursRequested: number;
  totalHoursApproved?: number;
  hoursProcessed: boolean;
  processedAt?: string;
  
  // Metadata
  notes?: string;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

/**
 * Leave request validation result
 */
export interface LeaveRequestValidation {
  isValid: boolean;
  errors: Array<{
    ruleId: string;
    ruleName: string;
    message: string;
    severity: 'error' | 'warning';
  }>;
  warnings: Array<{
    ruleId: string;
    ruleName: string;
    message: string;
  }>;
  summary: {
    totalRulesChecked: number;
    rulesViolated: number;
    canProceed: boolean;
    requiresApproval: boolean;
  };
}

// =====================================================================================
// UTILITY TYPES
// =====================================================================================

/**
 * Hour balance summary for a student
 */
export interface StudentHourBalance {
  studentId: string;
  totalHours: number;
  activePackages: Array<{
    purchaseId: string;
    packageName: string;
    hoursRemaining: number;
    validUntil: string;
    daysRemaining: number;
  }>;
  expiringPackages: Array<{
    purchaseId: string;
    packageName: string;
    hoursRemaining: number;
    validUntil: string;
    daysRemaining: number;
  }>;
  recentTransactions: HourTransaction[];
  alerts: HourAlert[];
}

/**
 * Hour usage statistics
 */
export interface HourUsageStats {
  periodStart: string;
  periodEnd: string;
  totalHoursUsed: number;
  totalHoursPurchased: number;
  totalHoursExpired: number;
  totalHoursTransferred: number;
  averageUsagePerWeek: number;
  mostActiveDay: string;
  preferredClassType: string;
  usageByClassType: Record<string, number>;
  usageByMonth: Array<{
    month: string;
    hoursUsed: number;
  }>;
}

/**
 * Hour package statistics for admin
 */
export interface HourPackageStats {
  packageId: string;
  packageName: string;
  totalSold: number;
  totalRevenue: number;
  activeSubscriptions: number;
  averageUtilization: number;
  popularityRank: number;
  customerSatisfaction: number;
}

/**
 * Hour management dashboard data
 */
export interface HourManagementDashboard {
  totalActiveHours: number;
  totalStudentsWithHours: number;
  lowBalanceAlerts: number;
  expiringAlerts: number;
  recentPurchases: Array<HourPurchase & {
    studentName: string;
    packageName: string;
  }>;
  recentAdjustments: Array<HourAdjustment & {
    studentName: string;
    requestedByName: string;
  }>;
  packageStats: HourPackageStats[];
  revenueByMonth: Array<{
    month: string;
    revenue: number;
    purchases: number;
  }>;
}

/**
 * Hour purchase request
 */
export interface HourPurchaseRequest {
  studentId: string;
  packageId: string;
  paymentMethod: PaymentMethod;
  paymentDetails?: Record<string, any>;
  notes?: string;
  isCorporatePurchase?: boolean;
  corporateAccountId?: string;
  invoiceNumber?: string;
}

/**
 * Hour transfer request
 */
export interface HourTransferRequest {
  fromStudentId: string;
  toStudentId: string;
  hoursToTransfer: number;
  reason: string;
  isFamilyTransfer: boolean;
  familyRelationship?: string;
  notes?: string;
}

/**
 * Hour adjustment request
 */
export interface HourAdjustmentRequest {
  studentId: string;
  adjustmentType: 'add' | 'subtract' | 'correction';
  hoursToAdjust: number;
  reason: string;
  supportingDocuments?: Array<{
    name: string;
    url: string;
    type: string;
  }>;
  affectedClasses?: string[];
  affectedBookings?: string[];
  notes?: string;
}

/**
 * Leave request submission
 */
export interface LeaveRequestSubmission {
  studentId: string;
  classId: string;
  bookingId?: string;
  classDate: string;
  classTime: string;
  classType: string;
  teacherId?: string;
  teacherName?: string;
  reason: string;
  leaveType: LeaveRequestType;
  medicalCertificateUrl?: string;
  additionalNotes?: string;
}

/**
 * Leave request validation result
 */
export interface LeaveRequestValidation {
  isValid: boolean;
  hoursBeforeClass: number;
  meets48HourRule: boolean;
  expectedRefundPercentage: number;
  expectedHoursRefund: number;
  autoApproval: boolean;
  warnings: string[];
  errors: string[];
}

/**
 * Leave rule creation/update request
 */
export interface LeaveRuleRequest {
  name: string;
  description?: string;
  ruleType: LeaveRuleType;
  value: number | string | boolean;
  frequency?: LeaveRuleFrequency;
  appliesToCourseTypes?: string[];
  appliesToStudentTypes?: string[];
  appliesToRegions?: string[];
  blackoutDates?: Array<{
    startDate: string;
    endDate: string;
    reason: string;
  }>;
  conditions?: Array<{
    field: string;
    operator: 'eq' | 'ne' | 'gt' | 'lt' | 'gte' | 'lte' | 'in' | 'nin';
    value: any;
  }>;
  exceptions?: Array<{
    condition: string;
    description: string;
  }>;
  isActive: boolean;
  priority: number;
  metadata?: Record<string, any>;
}

/**
 * Leave request creation/update request
 */
export interface LeaveRequestRequest {
  studentId: string;
  startDate: string;
  endDate: string;
  reason: string;
  leaveType: 'medical' | 'vacation' | 'emergency' | 'other';
  affectedClasses: Array<{
    classId: string;
    className: string;
    classDate: string;
    hoursToRefund: number;
  }>;
  supportingDocuments?: Array<{
    name: string;
    url: string;
    type: string;
  }>;
  notes?: string;
}

/**
 * Hour alert preferences
 */
export interface HourAlertPreferences {
  studentId: string;
  lowBalanceThreshold: number;
  expiryWarningDays: number;
  notificationChannels: Array<'email' | 'sms' | 'push' | 'in_app'>;
  alertFrequency: 'immediate' | 'daily' | 'weekly';
  quietHours?: {
    start: string; // HH:MM
    end: string;   // HH:MM
  };
}

// =====================================================================================
// API RESPONSE TYPES
// =====================================================================================

export interface HourApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, any>;
  };
  metadata?: {
    timestamp: string;
    requestId: string;
  };
}

export interface HourPaginatedResponse<T = any> {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
}

// =====================================================================================
// CONSTANTS
// =====================================================================================

export const HOUR_PACKAGE_LABELS: Record<HourPackageType, string> = {
  'trial_2': 'Trial Package (2 hours)',
  'standard_10': 'Starter Package (10 hours)',
  'standard_20': 'Regular Package (20 hours)',
  'standard_50': 'Intensive Package (50 hours)',
  'premium_10': 'Premium Small (10 hours)',
  'premium_20': 'Premium Small (20 hours)',
  'premium_50': 'Premium Large (50 hours)',
  'corporate_100': 'Corporate Basic (100 hours)',
  'corporate_200': 'Corporate Standard (200 hours)',
  'corporate_500': 'Corporate Enterprise (500 hours)',
  'custom': 'Custom Package'
};

export const TRANSACTION_TYPE_LABELS: Record<HourTransactionType, string> = {
  'purchase': 'Purchase',
  'deduction': 'Class Deduction',
  'refund': 'Refund',
  'transfer': 'Transfer',
  'adjustment': 'Manual Adjustment',
  'expiry': 'Expired',
  'bonus': 'Bonus Hours'
};

export const ALERT_TYPE_LABELS: Record<HourAlertType, string> = {
  'low_balance': 'Low Balance',
  'expiring_soon': 'Expiring Soon',
  'expired': 'Hours Expired',
  'no_hours': 'No Hours Remaining'
};

export const LEAVE_REQUEST_TYPE_LABELS: Record<LeaveRequestType, string> = {
  'sick': 'Sick Leave',
  'emergency': 'Emergency',
  'personal': 'Personal',
  'work': 'Work Commitment',
  'family': 'Family Matter',
  'travel': 'Travel',
  'other': 'Other'
};

export const LEAVE_REQUEST_STATUS_LABELS: Record<LeaveRequestStatus, string> = {
  'pending': 'Pending Review',
  'approved': 'Approved',
  'rejected': 'Rejected',
  'cancelled': 'Cancelled'
};

export const LEAVE_RULE_TYPE_LABELS: Record<LeaveRuleType, string> = {
  'monthly_limit': 'Monthly Leave Limit',
  'blackout_dates': 'Blackout Dates',
  'advance_notice': 'Advance Notice Required',
  'consecutive_days': 'Consecutive Days Limit',
  'minimum_hours': 'Minimum Hours Requirement',
  'approval_required': 'Approval Required',
  'cancellation_policy': 'Cancellation Policy'
};

export const LEAVE_RULE_FREQUENCY_LABELS: Record<LeaveRuleFrequency, string> = {
  'daily': 'Daily',
  'weekly': 'Weekly',
  'monthly': 'Monthly',
  'quarterly': 'Quarterly',
  'annually': 'Annually',
  'per_course': 'Per Course'
};

export const PAYMENT_STATUS_COLORS: Record<PaymentStatus, string> = {
  'pending': 'bg-yellow-100 text-yellow-800',
  'processing': 'bg-blue-100 text-blue-800',
  'completed': 'bg-green-100 text-green-800',
  'failed': 'bg-red-100 text-red-800',
  'refunded': 'bg-purple-100 text-purple-800',
  'cancelled': 'bg-gray-100 text-gray-800'
};

export const LEAVE_REQUEST_STATUS_COLORS: Record<LeaveRequestStatus, string> = {
  'pending': 'bg-yellow-100 text-yellow-800',
  'approved': 'bg-green-100 text-green-800',
  'rejected': 'bg-red-100 text-red-800',
  'cancelled': 'bg-gray-100 text-gray-800'
};

export const DEFAULT_LOW_BALANCE_THRESHOLD = 5;
export const DEFAULT_EXPIRY_WARNING_DAYS = 30;

// Leave request constants
export const LEAVE_REQUEST_48_HOUR_RULE = 48; // hours
export const LEAVE_REQUEST_FULL_REFUND_THRESHOLD = 48; // hours
export const LEAVE_REQUEST_PARTIAL_REFUND_THRESHOLD = 24; // hours
export const LEAVE_REQUEST_MINIMUM_REFUND_THRESHOLD = 2; // hours

export const LEAVE_REQUEST_REFUND_PERCENTAGES = {
  FULL: 100,
  PARTIAL: 50,
  LIMITED: 25,
  MEDICAL_EMERGENCY: 75,
  NONE: 0
} as const;

// =====================================================================================
// EXTENDED ANALYTICS TYPES
// =====================================================================================

/**
 * Comprehensive usage analytics for a student
 */
export interface HourUsageAnalytics {
  studentId: string;
  analysisDate: string;
  
  // Balance analytics
  currentBalance: number;
  balanceHistory: Array<{
    date: string;
    balance: number;
    change: number;
    changeReason: string;
  }>;
  
  // Usage patterns
  dailyUsagePattern: Array<{
    dayOfWeek: string;
    averageHours: number;
    peakHours: number;
    sessionCount: number;
  }>;
  
  hourlyUsagePattern: Array<{
    hour: number;
    averageHours: number;
    sessionCount: number;
  }>;
  
  // Consumption analysis
  consumptionRate: {
    daily: number;
    weekly: number;
    monthly: number;
    trend: 'increasing' | 'decreasing' | 'stable';
  };
  
  // Class type preferences
  classTypeUsage: Array<{
    classType: string;
    totalHours: number;
    percentage: number;
    averageSessionLength: number;
    frequency: number;
  }>;
  
  // Efficiency metrics
  efficiencyMetrics: {
    hoursPerClass: number;
    utilizationRate: number;
    wastageRate: number;
    renewalPattern: string;
  };
  
  // Predictions
  predictions: {
    runOutDate: string | null;
    recommendedTopUpDate: string | null;
    recommendedPackageSize: number;
    confidenceScore: number;
  };
}

/**
 * Balance trend analysis
 */
export interface BalanceTrend {
  studentId: string;
  periodStart: string;
  periodEnd: string;
  
  // Trend analysis
  trend: 'increasing' | 'decreasing' | 'stable' | 'volatile';
  trendStrength: number; // 0-1 scale
  
  // Balance points
  startingBalance: number;
  endingBalance: number;
  peakBalance: number;
  lowBalance: number;
  
  // Usage statistics
  totalHoursUsed: number;
  totalHoursPurchased: number;
  netChange: number;
  
  // Patterns
  averageDailyUsage: number;
  usageVariability: number;
  purchaseFrequency: number;
  
  // Alerts
  lowBalanceEvents: number;
  nearExpiryEvents: number;
  
  // Recommendations
  recommendations: Array<{
    type: 'purchase' | 'usage_optimization' | 'schedule_adjustment';
    message: string;
    priority: 'low' | 'medium' | 'high';
    actionRequired: boolean;
  }>;
}

/**
 * Hour consumption pattern analysis
 */
export interface ConsumptionPattern {
  patternId: string;
  studentId: string;
  classType: string;
  
  // Pattern characteristics
  frequency: 'daily' | 'weekly' | 'bi-weekly' | 'monthly' | 'irregular';
  consistency: number; // 0-1 scale
  predictability: number; // 0-1 scale
  
  // Time patterns
  preferredDays: string[];
  preferredHours: number[];
  averageSessionLength: number;
  
  // Usage metrics
  totalSessions: number;
  totalHours: number;
  averageHoursPerSession: number;
  
  // Efficiency
  completionRate: number;
  cancellationRate: number;
  reschedulingRate: number;
  
  // Trends
  usageTrend: 'increasing' | 'decreasing' | 'stable';
  seasonalPattern: boolean;
  
  // Comparison
  benchmarkComparison: {
    vsAverage: number; // percentage above/below average
    percentile: number;
    efficiency: 'high' | 'medium' | 'low';
  };
}

/**
 * Enhanced low balance alert with predictions
 */
export interface LowBalanceAlert {
  id: string;
  studentId: string;
  alertType: HourAlertType;
  
  // Alert details
  currentBalance: number;
  threshold: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  
  // Predictions
  estimatedRunOutDate: string | null;
  daysRemaining: number;
  
  // Context
  recentUsageRate: number;
  upcomingClasses: number;
  
  // Recommendations
  recommendedAction: string;
  recommendedPackageSize: number;
  urgencyLevel: number; // 1-10 scale
  
  // Automation
  autoNotificationSent: boolean;
  lastNotificationDate: string | null;
  nextNotificationDate: string | null;
  
  // Metadata
  createdAt: string;
  updatedAt: string;
  acknowledgedAt: string | null;
}

/**
 * Comprehensive usage report
 */
export interface HourUsageReport {
  reportId: string;
  generatedAt: string;
  reportType: 'student' | 'class' | 'overall' | 'predictive';
  
  // Period
  periodStart: string;
  periodEnd: string;
  
  // Summary statistics
  summary: {
    totalStudents: number;
    totalHoursUsed: number;
    totalHoursPurchased: number;
    averageUsagePerStudent: number;
    utilizationRate: number;
  };
  
  // Class type breakdown
  classTypeBreakdown: Array<{
    classType: string;
    totalHours: number;
    studentCount: number;
    averageHoursPerStudent: number;
    popularityRank: number;
  }>;
  
  // Usage patterns
  peakUsageTimes: Array<{
    timeSlot: string;
    hoursUsed: number;
    sessionCount: number;
  }>;
  
  // Student segments
  studentSegments: Array<{
    segment: string;
    count: number;
    totalHours: number;
    averageHours: number;
    characteristics: string[];
  }>;
  
  // Insights
  insights: Array<{
    category: string;
    insight: string;
    impact: 'high' | 'medium' | 'low';
    actionable: boolean;
  }>;
  
  // Recommendations
  recommendations: Array<{
    target: 'operations' | 'marketing' | 'curriculum' | 'pricing';
    recommendation: string;
    expectedImpact: string;
    priority: 'high' | 'medium' | 'low';
  }>;
}

/**
 * Predictive insights for hour usage
 */
export interface HourPredictiveInsights {
  studentId: string;
  forecastPeriod: string;
  generatedAt: string;
  
  // Run-out prediction
  runOutPrediction: {
    date: string | null;
    confidence: number;
    factors: Array<{
      factor: string;
      impact: 'high' | 'medium' | 'low';
      description: string;
    }>;
  };
  
  // Recommended actions
  recommendedTopUp: {
    date: string;
    packageSize: number;
    reasoning: string;
  };
  
  // Usage optimization
  usageOptimization: Array<{
    suggestion: string;
    impact: string;
    implementationDifficulty: 'easy' | 'medium' | 'hard';
  }>;
  
  // Risk factors
  riskFactors: Array<{
    risk: string;
    probability: number;
    severity: 'low' | 'medium' | 'high';
    mitigation: string;
  }>;
}

/**
 * Analytics dashboard data
 */
export interface HourAnalyticsDashboard {
  generatedAt: string;
  
  // Overview metrics
  overview: {
    totalActiveStudents: number;
    totalHoursInCirculation: number;
    averageBalancePerStudent: number;
    utilizationRate: number;
    monthlyGrowthRate: number;
  };
  
  // Alert summary
  alertSummary: {
    criticalAlerts: number;
    highPriorityAlerts: number;
    mediumPriorityAlerts: number;
    lowPriorityAlerts: number;
  };
  
  // Usage trends
  usageTrends: {
    dailyUsage: Array<{
      date: string;
      hoursUsed: number;
      sessionsCompleted: number;
    }>;
    weeklyUsage: Array<{
      week: string;
      hoursUsed: number;
      activeStudents: number;
    }>;
    monthlyUsage: Array<{
      month: string;
      hoursUsed: number;
      hoursPurchased: number;
      netChange: number;
    }>;
  };
  
  // Performance metrics
  performanceMetrics: {
    topPerformingClassTypes: Array<{
      classType: string;
      totalHours: number;
      averageRating: number;
      completionRate: number;
    }>;
    studentSegmentPerformance: Array<{
      segment: string;
      utilizationRate: number;
      satisfactionScore: number;
      renewalRate: number;
    }>;
  };
  
  // Predictions
  predictions: {
    nextMonthUsage: number;
    expectedLowBalanceAlerts: number;
    recommendedPackageAdjustments: Array<{
      packageId: string;
      recommendation: string;
      impact: string;
    }>;
  };
  
  // Insights
  keyInsights: Array<{
    category: 'usage' | 'efficiency' | 'revenue' | 'satisfaction';
    insight: string;
    trend: 'positive' | 'negative' | 'neutral';
    actionRequired: boolean;
  }>;
}

/**
 * Student analytics comparison
 */
export interface StudentAnalyticsComparison {
  studentId: string;
  comparisonType: 'peer_group' | 'class_type' | 'time_period';
  
  // Comparison metrics
  metrics: {
    hoursUsed: {
      student: number;
      comparison: number;
      percentile: number;
      trend: 'above' | 'below' | 'average';
    };
    
    efficiency: {
      student: number;
      comparison: number;
      percentile: number;
      trend: 'above' | 'below' | 'average';
    };
    
    consistency: {
      student: number;
      comparison: number;
      percentile: number;
      trend: 'above' | 'below' | 'average';
    };
  };
  
  // Strengths and areas for improvement
  strengths: string[];
  improvements: string[];
  
  // Recommendations
  recommendations: Array<{
    category: 'usage' | 'scheduling' | 'efficiency';
    recommendation: string;
    expectedBenefit: string;
  }>;
}

/**
 * Hour usage forecasting
 */
export interface HourUsageForecast {
  studentId: string;
  forecastPeriod: {
    start: string;
    end: string;
    days: number;
  };
  
  // Forecasted usage
  forecastedUsage: Array<{
    date: string;
    expectedHours: number;
    confidence: number;
    factors: string[];
  }>;
  
  // Seasonal adjustments
  seasonalAdjustments: Array<{
    period: string;
    adjustment: number;
    reason: string;
  }>;
  
  // Accuracy metrics
  accuracy: {
    historicalAccuracy: number;
    confidenceInterval: number;
    modelVersion: string;
  };
  
  // Recommendations
  recommendations: Array<{
    type: 'purchase' | 'scheduling' | 'usage_optimization';
    recommendation: string;
    timing: string;
    priority: 'high' | 'medium' | 'low';
  }>;
}