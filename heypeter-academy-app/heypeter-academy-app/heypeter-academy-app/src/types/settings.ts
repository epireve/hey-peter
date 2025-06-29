export interface SystemSettings {
  id: string;
  category: string;
  key: string;
  value: any;
  type: 'string' | 'number' | 'boolean' | 'json' | 'date';
  description?: string;
  is_public: boolean;
  updated_by: string;
  updated_at: string;
  created_at: string;
}

export interface FeatureFlag {
  id: string;
  name: string;
  key: string;
  enabled: boolean;
  description?: string;
  rollout_percentage?: number;
  user_groups?: string[];
  expires_at?: string;
  updated_by: string;
  updated_at: string;
  created_at: string;
}

export interface NotificationSetting {
  id: string;
  channel: 'email' | 'sms' | 'push' | 'in_app';
  event_type: string;
  enabled: boolean;
  template_id?: string;
  recipient_roles?: string[];
  config?: Record<string, any>;
  updated_at: string;
  created_at: string;
}

export interface MaintenanceWindow {
  id: string;
  name: string;
  type: 'backup' | 'maintenance' | 'update';
  schedule: string; // Cron expression
  duration_minutes: number;
  enabled: boolean;
  last_run?: string;
  next_run?: string;
  config?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface SettingsCategory {
  id: string;
  name: string;
  icon: string;
  description: string;
  order: number;
}