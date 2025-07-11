// ========================================
// Marketing Components Export Index
// ========================================

// Popup Components
export { PopupManager } from './popups/PopupManager';
export { PopupRenderer } from './popups/PopupRenderer';
export { ConsentBanner } from './popups/ConsentBanner';

// Analytics Components
export { PopupAnalyticsDashboard } from './analytics/PopupAnalyticsDashboard';

// Admin Components
export { PopupCampaignManager } from './admin/PopupCampaignManager';

// Re-export types
export type {
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
  PopupComponentProps,
  ConsentBannerProps
} from '@/types/popup-marketing';