'use client';

import { logger } from '@/lib/services';

// ========================================
// Popup Manager Component
// Main component that handles A/B testing, trigger evaluation, and popup display
// ========================================

import React, { useState, useEffect, useCallback } from 'react';
import { PopupRenderer } from './PopupRenderer';
import { ConsentBanner } from './ConsentBanner';
import { popupMarketingService } from '@/lib/services/popup-marketing-service';
import { PopupTriggerEngine, createVisitorSession } from '@/lib/services/popup-trigger-engine';
import type {
  PopupCampaign,
  PopupVariation,
  TrackDisplayRequest,
  TrackInteractionRequest,
  SubmitLeadRequest,
  GrantConsentRequest,
  VisitorConsent,
  DeviceInfo,
  GeoInfo
} from '@/types/popup-marketing';

interface PopupManagerProps {
  // Optional props to control behavior
  disabled?: boolean;
  testMode?: boolean;
  allowedCampaigns?: string[];
  blockedCampaigns?: string[];
}

interface ActivePopup {
  campaign: PopupCampaign;
  variation: PopupVariation;
  displayId: string;
  triggerEngine: PopupTriggerEngine;
}

export function PopupManager({
  disabled = false,
  testMode = false,
  allowedCampaigns = [],
  blockedCampaigns = []
}: PopupManagerProps) {
  const [visitorId, setVisitorId] = useState<string>('');
  const [sessionId, setSessionId] = useState<string>('');
  const [activePopup, setActivePopup] = useState<ActivePopup | null>(null);
  const [showConsentBanner, setShowConsentBanner] = useState<boolean>(false);
  const [visitorConsents, setVisitorConsents] = useState<VisitorConsent[]>([]);
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo | null>(null);
  const [geoInfo, setGeoInfo] = useState<GeoInfo | null>(null);
  const [isInitialized, setIsInitialized] = useState<boolean>(false);

  // Initialize popup manager
  useEffect(() => {
    if (disabled) return;

    initializePopupManager();
  }, [disabled]);

  const initializePopupManager = async () => {
    try {
      // Generate or retrieve visitor/session IDs
      const storedVisitorId = localStorage.getItem('popup_visitor_id');
      const newVisitorId = storedVisitorId || popupMarketingService.generateVisitorId();
      const newSessionId = popupMarketingService.generateSessionId();

      if (!storedVisitorId) {
        localStorage.setItem('popup_visitor_id', newVisitorId);
      }

      setVisitorId(newVisitorId);
      setSessionId(newSessionId);

      // Detect device info
      const deviceInfo: DeviceInfo = {
        type: getDeviceType(),
        os: getOperatingSystem(),
        browser: getBrowserName(),
        screenWidth: window.screen.width,
        screenHeight: window.screen.height,
        userAgent: navigator.userAgent
      };
      setDeviceInfo(deviceInfo);

      // Get geo info (you might want to use a geo IP service)
      try {
        const geoResponse = await fetch('https://ipapi.co/json/');
        if (geoResponse.ok) {
          const geoData = await geoResponse.json();
          const geoInfo: GeoInfo = {
            country: geoData.country_name,
            region: geoData.region,
            city: geoData.city,
            timezone: geoData.timezone,
            latitude: geoData.latitude,
            longitude: geoData.longitude
          };
          setGeoInfo(geoInfo);
        }
      } catch (error) {
        logger.warn('Could not fetch geo information:', error);
      }

      // Check visitor consent
      const consents = await popupMarketingService.getVisitorConsent(newVisitorId);
      setVisitorConsents(consents);

      // Show consent banner if needed (GDPR compliance)
      const hasMarketingConsent = consents.some(c => 
        c.consent_type === 'marketing' && c.consent_granted
      );
      
      if (!hasMarketingConsent && shouldShowConsentBanner()) {
        setShowConsentBanner(true);
      }

      setIsInitialized(true);

      // Start popup evaluation after initialization
      if (hasMarketingConsent || !shouldRequireConsent()) {
        evaluatePopups(newVisitorId, newSessionId, deviceInfo, geoInfo);
      }

    } catch (error) {
      logger.error('Error initializing popup manager:', error);
    }
  };

  const evaluatePopups = async (
    visitorId: string,
    sessionId: string,
    deviceInfo: DeviceInfo,
    geoInfo: GeoInfo | null
  ) => {
    try {
      // Get active campaigns
      const campaigns = await popupMarketingService.getActiveCampaigns();
      
      // Filter campaigns based on props
      const filteredCampaigns = campaigns.filter(campaign => {
        // Check allowed/blocked lists
        if (allowedCampaigns.length > 0 && !allowedCampaigns.includes(campaign.id)) {
          return false;
        }
        if (blockedCampaigns.includes(campaign.id)) {
          return false;
        }

        // Check device targeting
        if (campaign.device_targeting !== 'all' && campaign.device_targeting !== deviceInfo.type) {
          return false;
        }

        // Check geo targeting
        if (geoInfo && campaign.geo_targeting.countries?.length) {
          if (!campaign.geo_targeting.countries.includes(geoInfo.country || '')) {
            return false;
          }
        }

        // Check if already shown to this visitor
        return popupMarketingService.shouldShowPopup(
          visitorId,
          sessionId,
          campaign.id,
          window.location.href
        );
      });

      // Prioritize campaigns (you can implement more sophisticated logic)
      const prioritizedCampaign = filteredCampaigns[0];
      
      if (prioritizedCampaign) {
        await setupCampaignDisplay(prioritizedCampaign, visitorId, sessionId, deviceInfo, geoInfo);
      }

    } catch (error) {
      logger.error('Error evaluating popups:', error);
    }
  };

  const setupCampaignDisplay = async (
    campaign: PopupCampaign,
    visitorId: string,
    sessionId: string,
    deviceInfo: DeviceInfo,
    geoInfo: GeoInfo | null
  ) => {
    try {
      // Get campaign variations
      const variations = await popupMarketingService.getCampaignVariations(campaign.id);
      
      if (variations.length === 0) return;

      // Select variation (A/B testing)
      const selectedVariation = popupMarketingService.selectVariation(variations);
      
      if (!selectedVariation) return;

      // Create visitor session for trigger engine
      const visitorSession = createVisitorSession(sessionId, visitorId);
      if (geoInfo) {
        visitorSession.geoInfo = geoInfo;
      }

      // Initialize trigger engine
      const triggerEngine = new PopupTriggerEngine(visitorSession);

      // Check if triggers are met for immediate display
      const shouldShow = triggerEngine.shouldShowVariation(selectedVariation);
      
      if (shouldShow) {
        // Track display
        const displayRequest: TrackDisplayRequest = {
          session_id: sessionId,
          visitor_id: visitorId,
          campaign_id: campaign.id,
          variation_id: selectedVariation.id,
          page_url: window.location.href,
          referrer_url: document.referrer,
          device_info: deviceInfo,
          geo_info: geoInfo || undefined,
          trigger_type: 'time_delay', // Default, will be updated by trigger engine
          trigger_value: {}
        };

        const displayId = await popupMarketingService.trackDisplay(displayRequest);

        setActivePopup({
          campaign,
          variation: selectedVariation,
          displayId,
          triggerEngine
        });

      } else {
        // Register triggers for later evaluation
        selectedVariation.trigger_rules.forEach((rule, index) => {
          triggerEngine.registerTrigger(
            `${selectedVariation.id}_${index}`,
            [rule],
            async (triggerData) => {
              // Track display when triggered
              const displayRequest: TrackDisplayRequest = {
                session_id: sessionId,
                visitor_id: visitorId,
                campaign_id: campaign.id,
                variation_id: selectedVariation.id,
                page_url: window.location.href,
                referrer_url: document.referrer,
                device_info: deviceInfo,
                geo_info: geoInfo || undefined,
                trigger_type: rule.type,
                trigger_value: triggerData
              };

              const displayId = await popupMarketingService.trackDisplay(displayRequest);

              setActivePopup({
                campaign,
                variation: selectedVariation,
                displayId,
                triggerEngine
              });
            }
          );
        });
      }

    } catch (error) {
      logger.error('Error setting up campaign display:', error);
    }
  };

  const handleDisplay = (data: TrackDisplayRequest) => {
    // Display tracking is already handled in setupCampaignDisplay
    logger.info('Popup displayed:', data);
  };

  const handleInteraction = async (data: TrackInteractionRequest) => {
    if (!activePopup) return;

    try {
      await popupMarketingService.trackInteraction({
        ...data,
        display_id: activePopup.displayId
      });
    } catch (error) {
      logger.error('Error tracking interaction:', error);
    }
  };

  const handleSubmit = async (leadData: Omit<SubmitLeadRequest, 'display_id' | 'campaign_id' | 'variation_id'>) => {
    if (!activePopup) return;

    try {
      const submitRequest: SubmitLeadRequest = {
        ...leadData,
        display_id: activePopup.displayId,
        campaign_id: activePopup.campaign.id,
        variation_id: activePopup.variation.id
      };

      await popupMarketingService.submitLead(submitRequest);
      
      // Hide popup after successful submission
      setActivePopup(null);
      
      // Track conversion
      await handleInteraction({
        display_id: activePopup.displayId,
        interaction_type: 'converted'
      });

    } catch (error) {
      logger.error('Error submitting lead:', error);
    }
  };

  const handleClose = () => {
    if (activePopup) {
      activePopup.triggerEngine.cleanup();
    }
    setActivePopup(null);
  };

  const handleConsent = async (data: Omit<GrantConsentRequest, 'visitor_id' | 'session_id'>) => {
    if (!visitorId || !sessionId) return;

    try {
      const consentRequest: GrantConsentRequest = {
        ...data,
        visitor_id: visitorId,
        session_id: sessionId
      };

      const consent = await popupMarketingService.grantConsent(consentRequest);
      setVisitorConsents(prev => [...prev, consent]);
      setShowConsentBanner(false);

      // Start popup evaluation if marketing consent was granted
      if (data.consent_type === 'marketing' && data.consent_granted && deviceInfo) {
        evaluatePopups(visitorId, sessionId, deviceInfo, geoInfo);
      }

    } catch (error) {
      logger.error('Error granting consent:', error);
    }
  };

  const handleConsentDecline = () => {
    setShowConsentBanner(false);
    // Don't show popups if consent is declined
  };

  // Utility functions
  const shouldShowConsentBanner = (): boolean => {
    // Check if in EU (simplified check - you might want more sophisticated geo detection)
    const euCountries = ['AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE'];
    return geoInfo ? euCountries.includes(geoInfo.country?.substring(0, 2) || '') : true; // Default to showing consent
  };

  const shouldRequireConsent = (): boolean => {
    return shouldShowConsentBanner(); // Same logic for now
  };

  const getDeviceType = (): 'desktop' | 'mobile' | 'tablet' => {
    const userAgent = navigator.userAgent;
    if (/tablet|ipad|playbook|silk/i.test(userAgent)) return 'tablet';
    if (/mobile|iphone|ipod|android|blackberry|opera|mini|windows\sce|palm|smartphone|iemobile/i.test(userAgent)) return 'mobile';
    return 'desktop';
  };

  const getOperatingSystem = (): string => {
    const userAgent = navigator.userAgent;
    if (userAgent.indexOf('Win') !== -1) return 'Windows';
    if (userAgent.indexOf('Mac') !== -1) return 'macOS';
    if (userAgent.indexOf('Linux') !== -1) return 'Linux';
    if (userAgent.indexOf('Android') !== -1) return 'Android';
    if (userAgent.indexOf('iOS') !== -1) return 'iOS';
    return 'Unknown';
  };

  const getBrowserName = (): string => {
    const userAgent = navigator.userAgent;
    if (userAgent.indexOf('Chrome') !== -1) return 'Chrome';
    if (userAgent.indexOf('Firefox') !== -1) return 'Firefox';
    if (userAgent.indexOf('Safari') !== -1) return 'Safari';
    if (userAgent.indexOf('Edge') !== -1) return 'Edge';
    if (userAgent.indexOf('Opera') !== -1) return 'Opera';
    return 'Unknown';
  };

  // Handle page navigation (for SPAs)
  useEffect(() => {
    const handleRouteChange = () => {
      if (activePopup) {
        activePopup.triggerEngine.updatePageView();
      }
    };

    // Listen for route changes (Next.js specific)
    window.addEventListener('popstate', handleRouteChange);
    
    return () => {
      window.removeEventListener('popstate', handleRouteChange);
    };
  }, [activePopup]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (activePopup) {
        activePopup.triggerEngine.cleanup();
      }
    };
  }, []);

  if (disabled || !isInitialized) {
    return null;
  }

  return (
    <>
      {/* Consent Banner */}
      {showConsentBanner && (
        <ConsentBanner
          onConsent={handleConsent}
          onDecline={handleConsentDecline}
          privacyPolicyUrl="/privacy-policy"
          termsUrl="/terms-of-service"
        />
      )}

      {/* Active Popup */}
      {activePopup && (
        <PopupRenderer
          variation={activePopup.variation}
          onDisplay={handleDisplay}
          onInteraction={handleInteraction}
          onSubmit={handleSubmit}
          onClose={handleClose}
          isVisible={true}
        />
      )}
    </>
  );
}

export default PopupManager;