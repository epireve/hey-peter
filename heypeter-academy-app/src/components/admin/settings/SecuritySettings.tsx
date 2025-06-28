'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/hooks/use-toast';
import { 
  Save, 
  Shield, 
  Lock, 
  Key,
  AlertTriangle,
  UserX,
  Globe,
  Eye,
  EyeOff
} from 'lucide-react';

interface SecurityRule {
  id: string;
  name: string;
  type: 'password' | 'session' | 'access' | 'api';
  enabled: boolean;
  value?: string | number;
  description: string;
}

export function SecuritySettings() {
  const [showApiKey, setShowApiKey] = useState(false);
  const [securityRules, setSecurityRules] = useState<SecurityRule[]>([
    {
      id: '1',
      name: 'Minimum Password Length',
      type: 'password',
      enabled: true,
      value: 8,
      description: 'Minimum number of characters required for passwords',
    },
    {
      id: '2',
      name: 'Require Special Characters',
      type: 'password',
      enabled: true,
      description: 'Passwords must contain at least one special character',
    },
    {
      id: '3',
      name: 'Two-Factor Authentication',
      type: 'access',
      enabled: false,
      description: 'Require 2FA for all users',
    },
    {
      id: '4',
      name: 'Session Timeout',
      type: 'session',
      enabled: true,
      value: 60,
      description: 'Automatically log out users after inactivity (minutes)',
    },
    {
      id: '5',
      name: 'Failed Login Lockout',
      type: 'access',
      enabled: true,
      value: 5,
      description: 'Lock account after consecutive failed login attempts',
    },
    {
      id: '6',
      name: 'IP Whitelist',
      type: 'access',
      enabled: false,
      description: 'Restrict access to specific IP addresses',
    },
    {
      id: '7',
      name: 'API Rate Limiting',
      type: 'api',
      enabled: true,
      value: 1000,
      description: 'Maximum API requests per hour per user',
    },
  ]);

  const [corsSettings, setCorsSettings] = useState({
    allowed_origins: 'https://app.heypeter.com',
    allowed_methods: 'GET,POST,PUT,DELETE',
    allowed_headers: 'Content-Type,Authorization',
    max_age: '86400',
  });

  const [apiSettings, setApiSettings] = useState({
    api_key: 'sk_live_xxxxxxxxxxxxxxxxxxxxxxxxxxx',
    webhook_secret: 'whsec_xxxxxxxxxxxxxxxxxxxxxxxxx',
    api_version: 'v1',
  });

  const handleRuleToggle = (ruleId: string) => {
    setSecurityRules(prev => prev.map(rule => 
      rule.id === ruleId ? { ...rule, enabled: !rule.enabled } : rule
    ));
  };

  const handleRuleValueChange = (ruleId: string, value: string | number) => {
    setSecurityRules(prev => prev.map(rule => 
      rule.id === ruleId ? { ...rule, value } : rule
    ));
  };

  const handleRegenerateApiKey = () => {
    // In production, this would generate a new key on the server
    const newKey = `sk_live_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;
    setApiSettings({ ...apiSettings, api_key: newKey });
    toast({
      title: 'API Key Regenerated',
      description: 'Your new API key has been generated. Update your integrations.',
      variant: 'default',
    });
  };

  const handleSave = () => {
    toast({
      title: 'Settings saved',
      description: 'Security settings have been updated',
    });
  };

  const getRuleIcon = (type: SecurityRule['type']) => {
    switch (type) {
      case 'password': return Key;
      case 'session': return Lock;
      case 'access': return UserX;
      case 'api': return Globe;
    }
  };

  return (
    <div className="space-y-6">
      {/* Security Status Alert */}
      <Alert>
        <Shield className="h-4 w-4" />
        <AlertDescription>
          Security level: <strong>High</strong>. All recommended security features are enabled.
        </AlertDescription>
      </Alert>

      {/* Security Rules */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Security Rules</h3>
        
        {securityRules.map((rule) => {
          const Icon = getRuleIcon(rule.type);
          
          return (
            <Card key={rule.id} className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1">
                  <Icon className="h-5 w-5 text-muted-foreground" />
                  <div className="flex-1">
                    <h4 className="font-medium">{rule.name}</h4>
                    <p className="text-sm text-muted-foreground">{rule.description}</p>
                  </div>
                  {rule.value !== undefined && rule.enabled && (
                    <Input
                      type="number"
                      value={rule.value}
                      onChange={(e) => handleRuleValueChange(rule.id, parseInt(e.target.value) || 0)}
                      className="w-24"
                    />
                  )}
                </div>
                <Switch
                  checked={rule.enabled}
                  onCheckedChange={() => handleRuleToggle(rule.id)}
                />
              </div>
            </Card>
          );
        })}
      </div>

      <Separator />

      {/* API Security */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">API Security</h3>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-base">API Configuration</CardTitle>
            <CardDescription>Manage API keys and webhook settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="api-key">API Key</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    id="api-key"
                    type={showApiKey ? 'text' : 'password'}
                    value={apiSettings.api_key}
                    readOnly
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute right-2 top-1/2 -translate-y-1/2"
                    onClick={() => setShowApiKey(!showApiKey)}
                  >
                    {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                <Button variant="outline" onClick={handleRegenerateApiKey}>
                  Regenerate
                </Button>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="webhook-secret">Webhook Secret</Label>
              <Input
                id="webhook-secret"
                type="password"
                value={apiSettings.webhook_secret}
                readOnly
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="api-version">API Version</Label>
              <Select 
                value={apiSettings.api_version} 
                onValueChange={(value) => setApiSettings({ ...apiSettings, api_version: value })}
              >
                <SelectTrigger id="api-version">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="v1">v1 (Stable)</SelectItem>
                  <SelectItem value="v2-beta">v2 (Beta)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </div>

      <Separator />

      {/* CORS Settings */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">CORS Settings</h3>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Cross-Origin Resource Sharing</CardTitle>
            <CardDescription>Configure allowed origins and methods for API access</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="allowed-origins">Allowed Origins</Label>
              <Textarea
                id="allowed-origins"
                value={corsSettings.allowed_origins}
                onChange={(e) => setCorsSettings({ ...corsSettings, allowed_origins: e.target.value })}
                placeholder="https://example.com"
                rows={3}
              />
              <p className="text-xs text-muted-foreground">One origin per line, or * for all origins</p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="allowed-methods">Allowed Methods</Label>
              <Input
                id="allowed-methods"
                value={corsSettings.allowed_methods}
                onChange={(e) => setCorsSettings({ ...corsSettings, allowed_methods: e.target.value })}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="allowed-headers">Allowed Headers</Label>
              <Input
                id="allowed-headers"
                value={corsSettings.allowed_headers}
                onChange={(e) => setCorsSettings({ ...corsSettings, allowed_headers: e.target.value })}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="max-age">Max Age (seconds)</Label>
              <Input
                id="max-age"
                type="number"
                value={corsSettings.max_age}
                onChange={(e) => setCorsSettings({ ...corsSettings, max_age: e.target.value })}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Security Audit */}
      <Card className="border-orange-200 bg-orange-50 dark:bg-orange-950">
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-600" />
            <CardTitle className="text-base">Security Recommendations</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            <li className="flex items-center gap-2">
              <span className="text-orange-600">•</span>
              Enable Two-Factor Authentication for enhanced security
            </li>
            <li className="flex items-center gap-2">
              <span className="text-orange-600">•</span>
              Consider implementing IP whitelist for admin access
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-600">✓</span>
              Password policy is properly configured
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-600">✓</span>
              API rate limiting is active
            </li>
          </ul>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave}>
          <Save className="mr-2 h-4 w-4" />
          Save Changes
        </Button>
      </div>
    </div>
  );
}