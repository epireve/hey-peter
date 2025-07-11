import { NextRequest, NextResponse } from 'next/server';
import { autoPostponementService } from '@/lib/services/auto-postponement-service';

import { logger } from '@/lib/services';
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('student_id');

    if (!studentId) {
      return NextResponse.json(
        { error: 'Student ID is required', success: false },
        { status: 400 }
      );
    }

    const preferences = await autoPostponementService.getStudentPreferences(studentId);

    return NextResponse.json({ 
      data: preferences, 
      success: true 
    });
  } catch (error) {
    logger.error('Error fetching student preferences:', error);
    return NextResponse.json(
      { error: 'Failed to fetch preferences', success: false },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { student_id, ...preferences } = body;

    if (!student_id) {
      return NextResponse.json(
        { error: 'Student ID is required', success: false },
        { status: 400 }
      );
    }

    const updatedPreferences = await autoPostponementService.updateStudentPreferences(
      student_id,
      preferences
    );

    return NextResponse.json({ 
      data: updatedPreferences, 
      success: true 
    });
  } catch (error) {
    logger.error('Error updating student preferences:', error);
    return NextResponse.json(
      { error: 'Failed to update preferences', success: false },
      { status: 500 }
    );
  }
}