// ========================================
// Popup Marketing System Types
// ========================================

export type CampaignStatus = 'draft' | 'active' | 'paused' | 'archived';
export type CampaignType = 'lead_capture' | 'course_promotion' | 'discount_offer' | 'newsletter_signup' | 'exit_intent' | 'welcome';
export type DeviceTargeting = 'all' | 'desktop' | 'mobile' | 'tablet';
export type TemplateType = 'modal' | 'banner' | 'slide_in' | 'corner' | 'fullscreen';
export type VariationStatus = 'active' | 'paused' | 'archived';
export type InteractionType = 'displayed' | 'clicked' | 'dismissed' | 'converted' | 'closed';
export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'converted' | 'lost';
export type ConsentType = 'marketing' | 'analytics' | 'functional' | 'all';
export type ConsentMethod = 'popup' | 'banner' | 'form' | 'api';
export type EmailProvider = 'mailchimp' | 'sendgrid' | 'hubspot' | 'custom';

export type TriggerType = 
  | 'time_delay'
  | 'scroll_percentage' 
  | 'exit_intent'
  | 'page_visit_count'
  | 'session_duration'
  | 'specific_page'
  | 'referrer_source'
  | 'device_type'
  | 'returning_visitor'
  | 'first_time_visitor'
  | 'geographic_location';

// ========================================
// Campaign Configuration Types
// ========================================

export interface TargetAudience {
  ageRange?: [number, number];
  interests?: string[];
  language?: string[];
  excludeExistingStudents?: boolean;
  includeReturningVisitors?: boolean;
  sessionCount?: {
    min?: number;
    max?: number;
  };
}

export interface GeoTargeting {
  countries?: string[];
  regions?: string[];
  cities?: string[];
  excludeCountries?: string[];
  timezone?: string;
}

export interface PopupCampaign {
  id: string;
  name: string;
  description?: string;
  status: CampaignStatus;
  campaign_type: CampaignType;
  
  // Targeting
  target_audience: TargetAudience;
  device_targeting: DeviceTargeting;
  geo_targeting: GeoTargeting;
  
  // Schedule
  start_date?: string;
  end_date?: string;
  timezone: string;
  
  // A/B Testing
  ab_testing_enabled: boolean;
  traffic_allocation: number;
  
  // Compliance
  gdpr_compliant: boolean;
  requires_consent: boolean;
  consent_text?: string;
  
  // Metadata
  created_at: string;
  updated_at: string;
  created_by?: string;
}

// ========================================
// Popup Variation Types
// ========================================

export interface DesignConfig {
  // Layout and positioning
  position?: 'center' | 'top' | 'bottom' | 'left' | 'right' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  size?: 'small' | 'medium' | 'large' | 'fullscreen';
  maxWidth?: number;
  maxHeight?: number;
  
  // Visual styling
  backgroundColor?: string;
  textColor?: string;
  borderRadius?: number;
  borderColor?: string;
  borderWidth?: number;
  boxShadow?: string;
  overlay?: {
    enabled: boolean;
    color?: string;
    opacity?: number;
  };
  
  // Animation
  animation?: {
    entrance?: 'fade' | 'slide' | 'scale' | 'bounce';
    exit?: 'fade' | 'slide' | 'scale';
    duration?: number;
  };
  
  // Mobile specific
  mobilePosition?: 'center' | 'bottom' | 'top';
  mobileSize?: 'small' | 'medium' | 'large' | 'fullscreen';
}

export interface ContentConfig {
  // Text content
  headline: string;
  subheadline?: string;
  description?: string;
  disclaimerText?: string;
  
  // Media
  image?: {
    url: string;
    alt: string;
    position?: 'top' | 'left' | 'right' | 'background';
  };
  video?: {
    url: string;
    autoplay?: boolean;
    muted?: boolean;
  };
  
  // Branding
  logo?: {
    url: string;
    alt: string;
    position?: 'top' | 'bottom';
  };
}

export interface FormField {
  id: string;
  type: 'text' | 'email' | 'tel' | 'select' | 'checkbox' | 'radio' | 'textarea';
  name: string;
  label: string;
  placeholder?: string;
  required: boolean;
  validation?: {
    pattern?: string;
    minLength?: number;
    maxLength?: number;
    custom?: string;
  };
  options?: Array<{
    value: string;
    label: string;
  }>;
  defaultValue?: string;
  description?: string;
}

export interface CTAConfig {
  primaryButton: {
    text: string;
    color?: string;
    backgroundColor?: string;
    borderColor?: string;
    hoverColor?: string;
    action: 'submit' | 'redirect' | 'close';
    redirectUrl?: string;
  };
  secondaryButton?: {
    text: string;
    color?: string;
    backgroundColor?: string;
    borderColor?: string;
    hoverColor?: string;
    action: 'close' | 'redirect' | 'minimize';
    redirectUrl?: string;
  };
  closeButton?: {
    enabled: boolean;
    position?: 'top-right' | 'top-left' | 'inside' | 'outside';
    style?: 'x' | 'text' | 'icon';
  };
}

export interface TriggerRule {
  type: TriggerType;
  config: Record<string, any>;
  conditions?: Array<{
    field: string;
    operator: 'equals' | 'contains' | 'greater_than' | 'less_than' | 'regex';
    value: any;
  }>;
}

export interface PopupVariation {
  id: string;
  campaign_id: string;
  variation_name: string;
  is_control: boolean;
  traffic_percentage: number;
  
  // Configuration
  template_type: TemplateType;
  design_config: DesignConfig;
  content_config: ContentConfig;
  form_fields: FormField[];
  cta_config: CTAConfig;
  trigger_rules: TriggerRule[];
  
  // Status
  status: VariationStatus;
  created_at: string;
  updated_at: string;
}

// ========================================
// Trigger Configuration Types
// ========================================

export interface TriggerConfig {
  // Time-based triggers
  delay?: number; // milliseconds
  
  // Scroll-based triggers
  percentage?: number; // 0-100
  
  // Exit intent triggers
  sensitivity?: 'low' | 'medium' | 'high';
  
  // Page visit triggers
  count?: number;
  
  // Session duration triggers
  duration?: number; // milliseconds
  
  // Page-specific triggers
  pageUrls?: string[];
  urlPattern?: string;
  
  // Referrer triggers
  referrerUrls?: string[];
  referrerDomains?: string[];
  
  // Device triggers
  deviceTypes?: string[];
  
  // Geographic triggers
  countries?: string[];
  regions?: string[];
  
  // Visitor type triggers
  excludeReturning?: boolean;
  excludeFirstTime?: boolean;
}

export interface PopupTrigger {
  id: string;
  name: string;
  description?: string;
  trigger_type: TriggerType;
  trigger_config: TriggerConfig;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ========================================
// Tracking and Analytics Types
// ========================================

export interface DeviceInfo {
  type: 'desktop' | 'mobile' | 'tablet';
  os: string;
  browser: string;
  screenWidth: number;
  screenHeight: number;
  userAgent: string;
}

export interface GeoInfo {
  country?: string;
  region?: string;
  city?: string;
  timezone?: string;
  latitude?: number;
  longitude?: number;
}

export interface PopupDisplay {
  id: string;
  session_id: string;
  visitor_id?: string;
  campaign_id: string;
  variation_id: string;
  
  // Context
  page_url: string;
  referrer_url?: string;
  user_agent?: string;
  device_info: DeviceInfo;
  geo_info: GeoInfo;
  
  // Timing
  displayed_at: string;
  trigger_type?: TriggerType;
  trigger_value: Record<string, any>;
  
  // Interaction
  interaction_type?: InteractionType;
  interaction_data: Record<string, any>;
  time_to_interaction?: number;
  
  // Conversion
  converted: boolean;
  conversion_value?: number;
  conversion_data: Record<string, any>;
  
  created_at: string;
}

export interface PopupLead {
  id: string;
  display_id: string;
  campaign_id: string;
  variation_id: string;
  
  // Lead info
  email: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  company?: string;
  lead_source: string;
  
  // Preferences
  interests: string[];
  course_preferences: string[];
  preferred_contact_method: string;
  
  // Consent
  marketing_consent: boolean;
  consent_timestamp?: string;
  consent_ip_address?: string;
  gdpr_compliant: boolean;
  
  // Qualification
  lead_score: number;
  lead_status: LeadStatus;
  qualification_notes?: string;
  
  // Follow-up
  follow_up_required: boolean;
  follow_up_date?: string;
  assigned_to?: string;
  
  created_at: string;
  updated_at: string;
}

export interface PopupAnalytics {
  id: string;
  campaign_id: string;
  variation_id?: string;
  
  // Time bucket
  analytics_date: string;
  hour_bucket?: number;
  
  // Raw metrics
  impressions: number;
  clicks: number;
  conversions: number;
  dismissals: number;
  unique_visitors: number;
  
  // Calculated metrics
  click_through_rate: number;
  conversion_rate: number;
  average_time_to_interaction: number;
  bounce_rate: number;
  
  // Revenue
  total_revenue: number;
  average_order_value: number;
  
  created_at: string;
  updated_at: string;
}

// ========================================
// GDPR and Consent Types
// ========================================

export interface VisitorConsent {
  id: string;
  visitor_id: string;
  session_id: string;
  
  // Consent details
  consent_type: ConsentType;
  consent_granted: boolean;
  consent_timestamp: string;
  
  // Technical details
  ip_address?: string;
  user_agent?: string;
  consent_method: ConsentMethod;
  
  // Legal compliance
  privacy_policy_version?: string;
  terms_version?: string;
  gdpr_applicable: boolean;
  
  // Expiry
  expires_at?: string;
  withdrawn_at?: string;
  withdrawal_reason?: string;
  
  created_at: string;
  updated_at: string;
}

// ========================================
// Email Integration Types
// ========================================

export interface EmailApiConfig {
  apiKey?: string;
  apiSecret?: string;
  serverPrefix?: string;
  webhookUrl?: string;
  customEndpoint?: string;
}

export interface FollowUpConfig {
  sequence: Array<{
    delay: number; // hours
    templateId: string;
    subject: string;
  }>;
  maxEmails: number;
  unsubscribeAfter: number; // days
}

export interface PopupEmailIntegration {
  id: string;
  campaign_id: string;
  
  // Service config
  email_provider: EmailProvider;
  api_config: EmailApiConfig;
  
  // Automation
  welcome_email_enabled: boolean;
  welcome_email_template_id?: string;
  follow_up_sequence_enabled: boolean;
  follow_up_config: FollowUpConfig;
  
  // List management
  mailing_list_id?: string;
  segment_tags: string[];
  
  // Status
  sync_enabled: boolean;
  last_sync_at?: string;
  sync_errors: Array<{
    timestamp: string;
    error: string;
    details?: any;
  }>;
  
  created_at: string;
  updated_at: string;
}

// ========================================
// API Request/Response Types
// ========================================

export interface CreateCampaignRequest {
  name: string;
  description?: string;
  campaign_type: CampaignType;
  target_audience?: TargetAudience;
  device_targeting?: DeviceTargeting;
  geo_targeting?: GeoTargeting;
  start_date?: string;
  end_date?: string;
  ab_testing_enabled?: boolean;
  gdpr_compliant?: boolean;
  requires_consent?: boolean;
  consent_text?: string;
}

export interface CreateVariationRequest {
  campaign_id: string;
  variation_name: string;
  is_control?: boolean;
  traffic_percentage: number;
  template_type: TemplateType;
  design_config: DesignConfig;
  content_config: ContentConfig;
  form_fields: FormField[];
  cta_config: CTAConfig;
  trigger_rules: TriggerRule[];
}

export interface TrackDisplayRequest {
  session_id: string;
  visitor_id?: string;
  campaign_id: string;
  variation_id: string;
  page_url: string;
  referrer_url?: string;
  device_info: DeviceInfo;
  geo_info?: GeoInfo;
  trigger_type: TriggerType;
  trigger_value?: Record<string, any>;
}

export interface TrackInteractionRequest {
  display_id: string;
  interaction_type: InteractionType;
  interaction_data?: Record<string, any>;
  time_to_interaction?: number;
  conversion_value?: number;
  conversion_data?: Record<string, any>;
}

export interface SubmitLeadRequest {
  display_id: string;
  campaign_id: string;
  variation_id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  company?: string;
  interests?: string[];
  course_preferences?: string[];
  preferred_contact_method?: string;
  marketing_consent: boolean;
  gdpr_compliant?: boolean;
}

export interface GrantConsentRequest {
  visitor_id: string;
  session_id: string;
  consent_type: ConsentType;
  consent_granted: boolean;
  consent_method: ConsentMethod;
  privacy_policy_version?: string;
  terms_version?: string;
}

// ========================================
// Reporting and Dashboard Types
// ========================================

export interface CampaignPerformance {
  id: string;
  name: string;
  status: CampaignStatus;
  campaign_type: CampaignType;
  total_impressions: number;
  total_clicks: number;
  total_conversions: number;
  total_dismissals: number;
  ctr_percentage: number;
  conversion_percentage: number;
  total_revenue: number;
  total_leads: number;
  created_at: string;
}

export interface ABTestResult {
  campaign_id: string;
  campaign_name: string;
  variation_id: string;
  variation_name: string;
  is_control: boolean;
  traffic_percentage: number;
  impressions: number;
  clicks: number;
  conversions: number;
  ctr_percentage: number;
  conversion_percentage: number;
  revenue: number;
  confidence_level?: number;
  statistical_significance?: boolean;
}

export interface LeadQualityMetrics {
  campaign_id: string;
  campaign_name: string;
  total_leads: number;
  qualified_leads: number;
  converted_leads: number;
  average_lead_score: number;
  consented_leads: number;
  qualification_rate: number;
  lead_conversion_rate: number;
}

export interface PopupSystemMetrics {
  totalCampaigns: number;
  activeCampaigns: number;
  totalImpressions: number;
  totalConversions: number;
  overallConversionRate: number;
  totalRevenue: number;
  totalLeads: number;
  averageLeadScore: number;
}

// ========================================
// Component Props Types
// ========================================

export interface PopupComponentProps {
  variation: PopupVariation;
  onDisplay: (data: TrackDisplayRequest) => void;
  onInteraction: (data: TrackInteractionRequest) => void;
  onSubmit: (data: SubmitLeadRequest) => void;
  onClose: () => void;
  isVisible: boolean;
}

export interface ConsentBannerProps {
  onConsent: (data: GrantConsentRequest) => void;
  onDecline: () => void;
  privacyPolicyUrl?: string;
  termsUrl?: string;
  customText?: string;
}