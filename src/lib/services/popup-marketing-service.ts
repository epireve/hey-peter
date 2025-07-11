// ========================================
// Popup Marketing Service
// ========================================

import { supabase } from '@/lib/supabase';
import type {
  PopupCampaign,
  PopupVariation,
  PopupDisplay,
  PopupLead,
  PopupAnalytics,
  VisitorConsent,
  PopupEmailIntegration,
  CampaignPerformance,
  ABTestResult,
  LeadQualityMetrics,
  PopupSystemMetrics,
  CreateCampaignRequest,
  CreateVariationRequest,
  TrackDisplayRequest,
  TrackInteractionRequest,
  SubmitLeadRequest,
  GrantConsentRequest,
  TriggerType,
  CampaignStatus,
  LeadStatus,
  InteractionType
} from '@/types/popup-marketing';

export class PopupMarketingService {
  // ========================================
  // Campaign Management
  // ========================================

  /**
   * Create a new popup campaign
   */
  async createCampaign(data: CreateCampaignRequest): Promise<PopupCampaign> {
    const { data: campaign, error } = await supabase
      .from('popup_campaigns')
      .insert([{
        name: data.name,
        description: data.description,
        campaign_type: data.campaign_type,
        target_audience: data.target_audience || {},
        device_targeting: data.device_targeting || 'all',
        geo_targeting: data.geo_targeting || {},
        start_date: data.start_date,
        end_date: data.end_date,
        ab_testing_enabled: data.ab_testing_enabled || false,
        gdpr_compliant: data.gdpr_compliant ?? true,
        requires_consent: data.requires_consent ?? true,
        consent_text: data.consent_text
      }])
      .select()
      .single();

    if (error) throw error;
    return campaign;
  }

  /**
   * Get all campaigns with optional filtering
   */
  async getCampaigns(filters?: {
    status?: CampaignStatus;
    campaign_type?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ campaigns: PopupCampaign[]; total: number }> {
    let query = supabase
      .from('popup_campaigns')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    if (filters?.campaign_type) {
      query = query.eq('campaign_type', filters.campaign_type);
    }

    if (filters?.limit) {
      query = query.limit(filters.limit);
    }

    if (filters?.offset) {
      query = query.range(filters.offset, (filters.offset + (filters.limit || 10)) - 1);
    }

    const { data: campaigns, error, count } = await query;

    if (error) throw error;
    return { campaigns: campaigns || [], total: count || 0 };
  }

  /**
   * Get campaign by ID
   */
  async getCampaign(id: string): Promise<PopupCampaign | null> {
    const { data: campaign, error } = await supabase
      .from('popup_campaigns')
      .select('*')
      .eq('id', id)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return campaign;
  }

  /**
   * Update campaign
   */
  async updateCampaign(id: string, updates: Partial<PopupCampaign>): Promise<PopupCampaign> {
    const { data: campaign, error } = await supabase
      .from('popup_campaigns')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return campaign;
  }

  /**
   * Delete campaign
   */
  async deleteCampaign(id: string): Promise<void> {
    const { error } = await supabase
      .from('popup_campaigns')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  /**
   * Get active campaigns for display
   */
  async getActiveCampaigns(): Promise<PopupCampaign[]> {
    const now = new Date().toISOString();
    
    const { data: campaigns, error } = await supabase
      .from('popup_campaigns')
      .select('*')
      .eq('status', 'active')
      .or(`start_date.is.null,start_date.lte.${now}`)
      .or(`end_date.is.null,end_date.gte.${now}`);

    if (error) throw error;
    return campaigns || [];
  }

  // ========================================
  // Variation Management
  // ========================================

  /**
   * Create popup variation for A/B testing
   */
  async createVariation(data: CreateVariationRequest): Promise<PopupVariation> {
    const { data: variation, error } = await supabase
      .from('popup_variations')
      .insert([{
        campaign_id: data.campaign_id,
        variation_name: data.variation_name,
        is_control: data.is_control || false,
        traffic_percentage: data.traffic_percentage,
        template_type: data.template_type,
        design_config: data.design_config,
        content_config: data.content_config,
        form_fields: data.form_fields,
        cta_config: data.cta_config,
        trigger_rules: data.trigger_rules
      }])
      .select()
      .single();

    if (error) throw error;
    return variation;
  }

  /**
   * Get variations for a campaign
   */
  async getCampaignVariations(campaignId: string): Promise<PopupVariation[]> {
    const { data: variations, error } = await supabase
      .from('popup_variations')
      .select('*')
      .eq('campaign_id', campaignId)
      .eq('status', 'active')
      .order('created_at', { ascending: true });

    if (error) throw error;
    return variations || [];
  }

  /**
   * Get variation by ID
   */
  async getVariation(id: string): Promise<PopupVariation | null> {
    const { data: variation, error } = await supabase
      .from('popup_variations')
      .select('*')
      .eq('id', id)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return variation;
  }

  /**
   * Update variation
   */
  async updateVariation(id: string, updates: Partial<PopupVariation>): Promise<PopupVariation> {
    const { data: variation, error } = await supabase
      .from('popup_variations')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return variation;
  }

  /**
   * Select variation for A/B testing
   */
  selectVariation(variations: PopupVariation[]): PopupVariation | null {
    if (variations.length === 0) return null;
    if (variations.length === 1) return variations[0];

    // Calculate cumulative probabilities
    const random = Math.random() * 100;
    let cumulative = 0;

    for (const variation of variations) {
      cumulative += variation.traffic_percentage;
      if (random <= cumulative) {
        return variation;
      }
    }

    // Fallback to first variation
    return variations[0];
  }

  // ========================================
  // Display Tracking
  // ========================================

  /**
   * Track popup display
   */
  async trackDisplay(data: TrackDisplayRequest): Promise<string> {
    const { data: display, error } = await supabase
      .from('popup_displays')
      .insert([{
        session_id: data.session_id,
        visitor_id: data.visitor_id,
        campaign_id: data.campaign_id,
        variation_id: data.variation_id,
        page_url: data.page_url,
        referrer_url: data.referrer_url,
        user_agent: data.device_info.userAgent,
        device_info: data.device_info,
        geo_info: data.geo_info || {},
        trigger_type: data.trigger_type,
        trigger_value: data.trigger_value || {},
        interaction_type: 'displayed'
      }])
      .select('id')
      .single();

    if (error) throw error;
    return display.id;
  }

  /**
   * Track popup interaction
   */
  async trackInteraction(data: TrackInteractionRequest): Promise<void> {
    const { error } = await supabase
      .from('popup_displays')
      .update({
        interaction_type: data.interaction_type,
        interaction_data: data.interaction_data || {},
        time_to_interaction: data.time_to_interaction,
        converted: data.interaction_type === 'converted',
        conversion_value: data.conversion_value,
        conversion_data: data.conversion_data || {}
      })
      .eq('id', data.display_id);

    if (error) throw error;
  }

  /**
   * Get display history for a visitor
   */
  async getVisitorDisplayHistory(
    visitorId: string, 
    sessionId: string
  ): Promise<PopupDisplay[]> {
    const { data: displays, error } = await supabase
      .from('popup_displays')
      .select('*')
      .or(`visitor_id.eq.${visitorId},session_id.eq.${sessionId}`)
      .order('displayed_at', { ascending: false });

    if (error) throw error;
    return displays || [];
  }

  // ========================================
  // Lead Management
  // ========================================

  /**
   * Submit lead from popup
   */
  async submitLead(data: SubmitLeadRequest): Promise<PopupLead> {
    const { data: lead, error } = await supabase
      .from('popup_leads')
      .insert([{
        display_id: data.display_id,
        campaign_id: data.campaign_id,
        variation_id: data.variation_id,
        email: data.email,
        first_name: data.first_name,
        last_name: data.last_name,
        phone: data.phone,
        company: data.company,
        interests: data.interests || [],
        course_preferences: data.course_preferences || [],
        preferred_contact_method: data.preferred_contact_method || 'email',
        marketing_consent: data.marketing_consent,
        consent_timestamp: data.marketing_consent ? new Date().toISOString() : null,
        gdpr_compliant: data.gdpr_compliant ?? true,
        lead_score: this.calculateLeadScore({
          email: data.email,
          first_name: data.first_name,
          last_name: data.last_name,
          phone: data.phone,
          company: data.company,
          interests: data.interests || [],
          course_preferences: data.course_preferences || [],
          marketing_consent: data.marketing_consent
        })
      }])
      .select()
      .single();

    if (error) throw error;

    // Update display record as converted
    await this.trackInteraction({
      display_id: data.display_id,
      interaction_type: 'converted',
      conversion_data: { lead_id: lead.id }
    });

    return lead;
  }

  /**
   * Calculate lead score based on provided information
   */
  private calculateLeadScore(leadData: {
    email: string;
    first_name?: string;
    last_name?: string;
    phone?: string;
    company?: string;
    interests: string[];
    course_preferences: string[];
    marketing_consent: boolean;
  }): number {
    let score = 0;

    // Base score for email
    score += 20;

    // Name information
    if (leadData.first_name) score += 15;
    if (leadData.last_name) score += 10;

    // Contact information
    if (leadData.phone) score += 20;
    if (leadData.company) score += 15;

    // Engagement indicators
    score += leadData.interests.length * 5;
    score += leadData.course_preferences.length * 10;

    // Marketing consent
    if (leadData.marketing_consent) score += 20;

    return Math.min(score, 100);
  }

  /**
   * Get leads with filtering
   */
  async getLeads(filters?: {
    campaign_id?: string;
    lead_status?: LeadStatus;
    assigned_to?: string;
    date_from?: string;
    date_to?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ leads: PopupLead[]; total: number }> {
    let query = supabase
      .from('popup_leads')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    if (filters?.campaign_id) {
      query = query.eq('campaign_id', filters.campaign_id);
    }

    if (filters?.lead_status) {
      query = query.eq('lead_status', filters.lead_status);
    }

    if (filters?.assigned_to) {
      query = query.eq('assigned_to', filters.assigned_to);
    }

    if (filters?.date_from) {
      query = query.gte('created_at', filters.date_from);
    }

    if (filters?.date_to) {
      query = query.lte('created_at', filters.date_to);
    }

    if (filters?.limit) {
      query = query.limit(filters.limit);
    }

    if (filters?.offset) {
      query = query.range(filters.offset, (filters.offset + (filters.limit || 10)) - 1);
    }

    const { data: leads, error, count } = await query;

    if (error) throw error;
    return { leads: leads || [], total: count || 0 };
  }

  /**
   * Update lead status
   */
  async updateLead(id: string, updates: Partial<PopupLead>): Promise<PopupLead> {
    const { data: lead, error } = await supabase
      .from('popup_leads')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return lead;
  }

  // ========================================
  // GDPR and Consent Management
  // ========================================

  /**
   * Grant visitor consent
   */
  async grantConsent(data: GrantConsentRequest): Promise<VisitorConsent> {
    const { data: consent, error } = await supabase
      .from('visitor_consent')
      .upsert([{
        visitor_id: data.visitor_id,
        session_id: data.session_id,
        consent_type: data.consent_type,
        consent_granted: data.consent_granted,
        consent_method: data.consent_method,
        privacy_policy_version: data.privacy_policy_version,
        terms_version: data.terms_version,
        gdpr_applicable: true
      }], {
        onConflict: 'visitor_id,consent_type'
      })
      .select()
      .single();

    if (error) throw error;
    return consent;
  }

  /**
   * Check visitor consent status
   */
  async getVisitorConsent(visitorId: string): Promise<VisitorConsent[]> {
    const { data: consents, error } = await supabase
      .from('visitor_consent')
      .select('*')
      .eq('visitor_id', visitorId)
      .eq('consent_granted', true)
      .is('withdrawn_at', null);

    if (error) throw error;
    return consents || [];
  }

  /**
   * Withdraw consent
   */
  async withdrawConsent(
    visitorId: string, 
    consentType: string, 
    reason?: string
  ): Promise<void> {
    const { error } = await supabase
      .from('visitor_consent')
      .update({
        withdrawn_at: new Date().toISOString(),
        withdrawal_reason: reason
      })
      .eq('visitor_id', visitorId)
      .eq('consent_type', consentType);

    if (error) throw error;
  }

  // ========================================
  // Analytics and Reporting
  // ========================================

  /**
   * Get campaign performance metrics
   */
  async getCampaignPerformance(
    campaignId?: string,
    dateFrom?: string,
    dateTo?: string
  ): Promise<CampaignPerformance[]> {
    let query = supabase
      .from('campaign_performance')
      .select('*')
      .order('total_impressions', { ascending: false });

    if (campaignId) {
      query = query.eq('id', campaignId);
    }

    if (dateFrom) {
      query = query.gte('created_at', dateFrom);
    }

    if (dateTo) {
      query = query.lte('created_at', dateTo);
    }

    const { data: performance, error } = await query;

    if (error) throw error;
    return performance || [];
  }

  /**
   * Get A/B test results
   */
  async getABTestResults(campaignId: string): Promise<ABTestResult[]> {
    const { data: results, error } = await supabase
      .from('ab_test_results')
      .select('*')
      .eq('campaign_id', campaignId)
      .order('traffic_percentage', { ascending: false });

    if (error) throw error;
    return results || [];
  }

  /**
   * Get lead quality metrics
   */
  async getLeadQualityMetrics(
    campaignId?: string,
    dateFrom?: string,
    dateTo?: string
  ): Promise<LeadQualityMetrics[]> {
    let query = supabase
      .from('lead_quality_metrics')
      .select('*')
      .order('total_leads', { ascending: false });

    if (campaignId) {
      query = query.eq('campaign_id', campaignId);
    }

    const { data: metrics, error } = await query;

    if (error) throw error;
    return metrics || [];
  }

  /**
   * Get system-wide popup metrics
   */
  async getSystemMetrics(): Promise<PopupSystemMetrics> {
    const [campaignsResult, analyticsResult, leadsResult] = await Promise.all([
      supabase.from('popup_campaigns').select('id, status'),
      supabase.from('popup_analytics').select('impressions, conversions, total_revenue'),
      supabase.from('popup_leads').select('id, lead_score')
    ]);

    const campaigns = campaignsResult.data || [];
    const analytics = analyticsResult.data || [];
    const leads = leadsResult.data || [];

    const totalImpressions = analytics.reduce((sum, a) => sum + (a.impressions || 0), 0);
    const totalConversions = analytics.reduce((sum, a) => sum + (a.conversions || 0), 0);
    const totalRevenue = analytics.reduce((sum, a) => sum + (a.total_revenue || 0), 0);
    const averageLeadScore = leads.length > 0 
      ? leads.reduce((sum, l) => sum + (l.lead_score || 0), 0) / leads.length 
      : 0;

    return {
      totalCampaigns: campaigns.length,
      activeCampaigns: campaigns.filter(c => c.status === 'active').length,
      totalImpressions,
      totalConversions,
      overallConversionRate: totalImpressions > 0 ? (totalConversions / totalImpressions) * 100 : 0,
      totalRevenue,
      totalLeads: leads.length,
      averageLeadScore
    };
  }

  /**
   * Get analytics data for date range
   */
  async getAnalytics(
    campaignId?: string,
    variationId?: string,
    dateFrom?: string,
    dateTo?: string,
    groupBy: 'day' | 'hour' = 'day'
  ): Promise<PopupAnalytics[]> {
    let query = supabase
      .from('popup_analytics')
      .select('*')
      .order('analytics_date', { ascending: true });

    if (campaignId) {
      query = query.eq('campaign_id', campaignId);
    }

    if (variationId) {
      query = query.eq('variation_id', variationId);
    }

    if (dateFrom) {
      query = query.gte('analytics_date', dateFrom);
    }

    if (dateTo) {
      query = query.lte('analytics_date', dateTo);
    }

    if (groupBy === 'hour') {
      query = query.not('hour_bucket', 'is', null);
    } else {
      query = query.is('hour_bucket', null);
    }

    const { data: analytics, error } = await query;

    if (error) throw error;
    return analytics || [];
  }

  // ========================================
  // Email Integration
  // ========================================

  /**
   * Setup email integration for campaign
   */
  async setupEmailIntegration(
    campaignId: string,
    config: Omit<PopupEmailIntegration, 'id' | 'campaign_id' | 'created_at' | 'updated_at'>
  ): Promise<PopupEmailIntegration> {
    const { data: integration, error } = await supabase
      .from('popup_email_integration')
      .upsert([{
        campaign_id: campaignId,
        ...config
      }], {
        onConflict: 'campaign_id,email_provider'
      })
      .select()
      .single();

    if (error) throw error;
    return integration;
  }

  /**
   * Get email integration for campaign
   */
  async getEmailIntegration(campaignId: string): Promise<PopupEmailIntegration[]> {
    const { data: integrations, error } = await supabase
      .from('popup_email_integration')
      .select('*')
      .eq('campaign_id', campaignId)
      .eq('sync_enabled', true);

    if (error) throw error;
    return integrations || [];
  }

  // ========================================
  // Utility Methods
  // ========================================

  /**
   * Check if visitor should see popup based on display history and rules
   */
  async shouldShowPopup(
    visitorId: string,
    sessionId: string,
    campaignId: string,
    pageUrl: string
  ): Promise<boolean> {
    // Get visitor's display history
    const history = await this.getVisitorDisplayHistory(visitorId, sessionId);
    
    // Check if already shown today
    const today = new Date().toDateString();
    const shownToday = history.some(display => 
      display.campaign_id === campaignId &&
      new Date(display.displayed_at).toDateString() === today
    );

    if (shownToday) return false;

    // Check if visitor dismissed recently
    const recentlyDismissed = history.some(display =>
      display.campaign_id === campaignId &&
      display.interaction_type === 'dismissed' &&
      Date.now() - new Date(display.displayed_at).getTime() < 24 * 60 * 60 * 1000 // 24 hours
    );

    if (recentlyDismissed) return false;

    // Check if already converted
    const hasConverted = history.some(display =>
      display.campaign_id === campaignId &&
      display.converted
    );

    if (hasConverted) return false;

    return true;
  }

  /**
   * Generate visitor ID for anonymous tracking
   */
  generateVisitorId(): string {
    return 'visitor_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
  }

  /**
   * Generate session ID
   */
  generateSessionId(): string {
    return 'session_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
  }
}

// Export singleton instance
export const popupMarketingService = new PopupMarketingService();