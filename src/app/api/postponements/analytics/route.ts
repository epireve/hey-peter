import { NextRequest, NextResponse } from 'next/server';
import { autoPostponementService } from '@/lib/services/auto-postponement-service';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');

    const dateRange = startDate && endDate 
      ? { start: startDate, end: endDate }
      : undefined;

    const analytics = await autoPostponementService.getPostponementAnalytics(dateRange);

    return NextResponse.json({ 
      data: analytics, 
      success: true 
    });
  } catch (error) {
    console.error('Error fetching postponement analytics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics', success: false },
      { status: 500 }
    );
  }
}