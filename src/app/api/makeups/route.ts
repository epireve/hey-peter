import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { autoPostponementService } from '@/lib/services/auto-postponement-service';

import { logger } from '@/lib/services';
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('student_id');
    const limit = parseInt(searchParams.get('limit') || '50');
    const status = searchParams.get('status');

    if (!studentId) {
      // Get pending make-up classes for admin
      const pendingMakeUps = await autoPostponementService.getPendingMakeUpClasses(limit);
      
      // Filter by status if provided
      const filteredMakeUps = status 
        ? pendingMakeUps.filter(m => m.status === status)
        : pendingMakeUps;

      return NextResponse.json({ 
        data: filteredMakeUps, 
        success: true 
      });
    }

    // Get student make-up classes
    const makeUpClasses = await autoPostponementService.getStudentMakeUpClasses(studentId);
    
    // Filter by status if provided
    const filteredMakeUps = status 
      ? makeUpClasses.filter(m => m.status === status)
      : makeUpClasses;

    return NextResponse.json({ 
      data: filteredMakeUps, 
      success: true 
    });
  } catch (error) {
    logger.error('Error fetching make-up classes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch make-up classes', success: false },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, action, ...data } = body;

    switch (action) {
      case 'update_status':
        const { data: updatedMakeUp, error } = await supabase
          .from('make_up_classes')
          .update({
            status: data.status,
            admin_notes: data.admin_notes,
            updated_at: new Date().toISOString(),
          })
          .eq('id', id)
          .select()
          .single();

        if (error) {
          throw error;
        }

        return NextResponse.json({ 
          data: updatedMakeUp, 
          success: true 
        });

      default:
        return NextResponse.json(
          { error: 'Invalid action', success: false },
          { status: 400 }
        );
    }
  } catch (error) {
    logger.error('Error updating make-up class:', error);
    return NextResponse.json(
      { error: 'Failed to update make-up class', success: false },
      { status: 500 }
    );
  }
}