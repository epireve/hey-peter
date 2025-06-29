import { Metadata } from 'next';
import { SettingsClient } from '@/components/admin/settings/SettingsClient';

export const metadata: Metadata = {
  title: 'System Settings',
  description: 'Configure system settings and preferences',
};

export default function SettingsPage() {
  return <SettingsClient />;
}