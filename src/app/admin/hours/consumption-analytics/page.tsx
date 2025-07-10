import { Metadata } from 'next';
import { HourConsumptionDashboard } from '@/components/admin/hours';

export const metadata: Metadata = {
  title: 'Hour Consumption Analytics | HeyPeter Academy',
  description: 'Comprehensive analytics for hour consumption patterns, class type efficiency, and predictive insights for hour planning.',
};

export default function HourConsumptionAnalyticsPage() {
  return (
    <div className="container mx-auto px-4 py-6">
      <HourConsumptionDashboard />
    </div>
  );
}