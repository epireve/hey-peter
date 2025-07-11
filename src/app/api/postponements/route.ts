import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { autoPostponementService } from '@/lib/services/auto-postponement-service';
import { makeUpClassSuggestionService } from '@/lib/services/makeup-class-suggestion-service';

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
      // Get postponement summary (admin endpoint)
      const summary = await autoPostponementService.getPostponementSummary(limit);
      return NextResponse.json({ data: summary, success: true });
    }

    // Get student postponements
    const postponements = await autoPostponementService.getStudentPostponements(studentId);
    
    // Filter by status if provided
    const filteredPostponements = status 
      ? postponements.filter(p => p.status === status)
      : postponements;

    return NextResponse.json({ 
      data: filteredPostponements, 
      success: true 
    });
  } catch (error) {
    logger.error('Error fetching postponements:', error);
    return NextResponse.json(
      { error: 'Failed to fetch postponements', success: false },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, ...data } = body;

    switch (action) {
      case 'generate_suggestions':
        const suggestions = await makeUpClassSuggestionService.generateSuggestions({
          student_id: data.student_id,
          postponement_id: data.postponement_id,
          original_class_id: data.original_class_id,
          max_suggestions: data.max_suggestions || 10,
        });
        return NextResponse.json({ data: suggestions, success: true });

      case 'select_makeup':
        const success = await autoPostponementService.selectMakeUpClass({
          make_up_class_id: data.make_up_class_id,
          student_id: data.student_id,
          selected_suggestion_id: data.selected_suggestion_id,
        });
        return NextResponse.json({ data: { success }, success: true });

      case 'approve_makeup':
        const approved = await autoPostponementService.approveMakeUpClass({
          make_up_class_id: data.make_up_class_id,
          admin_user_id: data.admin_user_id,
        });
        return NextResponse.json({ data: { approved }, success: true });

      default:
        return NextResponse.json(
          { error: 'Invalid action', success: false },
          { status: 400 }
        );
    }
  } catch (error) {
    logger.error('Error processing postponement action:', error);
    return NextResponse.json(
      { error: 'Failed to process action', success: false },
      { status: 500 }
    );
  }
}