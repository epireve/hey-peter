'use client';

// ========================================
// GDPR Consent Banner Component
// Handles visitor consent management for popup marketing
// ========================================

import React, { useState } from 'react';
import { Cookie, Shield, Info, Settings, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type {
  ConsentBannerProps,
  GrantConsentRequest,
  ConsentType
} from '@/types/popup-marketing';

interface ConsentDetail {
  type: ConsentType;
  label: string;
  description: string;
  required: boolean;
  enabled: boolean;
}

export function ConsentBanner({
  onConsent,
  onDecline,
  privacyPolicyUrl,
  termsUrl,
  customText
}: ConsentBannerProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [consents, setConsents] = useState<ConsentDetail[]>([
    {
      type: 'functional',
      label: 'Essential Cookies',
      description: 'These cookies are necessary for the website to function and cannot be switched off.',
      required: true,
      enabled: true
    },
    {
      type: 'analytics',
      label: 'Analytics Cookies',
      description: 'These cookies help us understand how visitors interact with our website.',
      required: false,
      enabled: false
    },
    {
      type: 'marketing',
      label: 'Marketing Cookies',
      description: 'These cookies are used to show you relevant advertisements and marketing content.',
      required: false,
      enabled: false
    }
  ]);

  const handleConsentChange = (type: ConsentType, enabled: boolean) => {
    setConsents(prev => prev.map(consent => 
      consent.type === type ? { ...consent, enabled } : consent
    ));
  };

  const handleAcceptAll = () => {
    // Grant all consents
    consents.forEach(consent => {
      onConsent({
        consent_type: consent.type,
        consent_granted: true,
        consent_method: 'banner'
      });
    });
  };

  const handleAcceptSelected = () => {
    // Grant only selected consents
    consents.forEach(consent => {
      onConsent({
        consent_type: consent.type,
        consent_granted: consent.enabled,
        consent_method: 'banner'
      });
    });
  };

  const handleRejectAll = () => {
    // Only grant essential/functional consent
    consents.forEach(consent => {
      onConsent({
        consent_type: consent.type,
        consent_granted: consent.required,
        consent_method: 'banner'
      });
    });
  };

  if (showDetails) {
    return (
      <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl max-h-[90vh] overflow-hidden">
          <CardContent className="p-0">
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Shield className="h-6 w-6" />
                  <h2 className="text-xl font-semibold">Privacy Settings</h2>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowDetails(false)}
                  className="text-white hover:bg-white/20"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-blue-100 mt-2">
                Manage your privacy preferences and control how we use your data
              </p>
            </div>

            <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
              <div className="space-y-4">
                {consents.map((consent) => (
                  <div key={consent.type} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <h3 className="font-medium">{consent.label}</h3>
                          {consent.required && (
                            <Badge variant="secondary" className="text-xs">
                              Required
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mb-3">
                          {consent.description}
                        </p>
                      </div>
                      <Checkbox
                        checked={consent.enabled}
                        onCheckedChange={(checked) => 
                          !consent.required && handleConsentChange(consent.type, checked as boolean)
                        }
                        disabled={consent.required}
                        className="ml-4"
                      />
                    </div>
                  </div>
                ))}
              </div>

              <Separator />

              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-start space-x-3">
                  <Info className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium mb-1">Your Rights</p>
                    <p className="text-gray-600">
                      You can change these settings at any time. For more information about how we use cookies and your rights, please see our{' '}
                      {privacyPolicyUrl && (
                        <a
                          href={privacyPolicyUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          Privacy Policy
                        </a>
                      )}
                      {privacyPolicyUrl && termsUrl && ' and '}
                      {termsUrl && (
                        <a
                          href={termsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          Terms of Service
                        </a>
                      )}
                      .
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 bg-gray-50 border-t">
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  onClick={handleAcceptSelected}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  Save Preferences
                </Button>
                <Button
                  onClick={handleAcceptAll}
                  variant="outline"
                  className="flex-1"
                >
                  Accept All
                </Button>
                <Button
                  onClick={handleRejectAll}
                  variant="ghost"
                  className="flex-1"
                >
                  Reject Optional
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-white border-t shadow-lg">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col lg:flex-row items-start lg:items-center gap-4">
          {/* Icon and Content */}
          <div className="flex items-start space-x-3 flex-1">
            <Cookie className="h-6 w-6 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">
                We value your privacy
              </h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                {customText || 
                  "We use cookies and similar technologies to improve your experience, analyze website traffic, and show personalized content. By clicking 'Accept All', you consent to our use of cookies."
                }
              </p>
              <div className="flex items-center space-x-4 mt-2">
                {privacyPolicyUrl && (
                  <a
                    href={privacyPolicyUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline"
                  >
                    Privacy Policy
                  </a>
                )}
                {termsUrl && (
                  <a
                    href={termsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline"
                  >
                    Terms of Service
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
            <Button
              onClick={() => setShowDetails(true)}
              variant="outline"
              size="sm"
              className="w-full sm:w-auto whitespace-nowrap"
            >
              <Settings className="h-4 w-4 mr-2" />
              Manage Preferences
            </Button>
            <Button
              onClick={handleRejectAll}
              variant="ghost"
              size="sm"
              className="w-full sm:w-auto whitespace-nowrap"
            >
              Reject Optional
            </Button>
            <Button
              onClick={handleAcceptAll}
              size="sm"
              className="w-full sm:w-auto whitespace-nowrap bg-blue-600 hover:bg-blue-700"
            >
              Accept All
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ConsentBanner;