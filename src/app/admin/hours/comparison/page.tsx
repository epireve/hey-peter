import { Metadata } from 'next';
import { HourConsumptionComparison } from '@/components/admin/hours';

export const metadata: Metadata = {
  title: 'Hour Consumption Comparison | HeyPeter Academy',
  description: 'Compare hour consumption efficiency and utilization across different class types and time periods.',
};

export default function HourConsumptionComparisonPage() {
  return (
    <div className="container mx-auto px-4 py-6">
      <HourConsumptionComparison />
    </div>
  );
}