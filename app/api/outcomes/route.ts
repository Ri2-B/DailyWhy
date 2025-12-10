import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Helper to get user from authorization header
async function getUserFromRequest(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.replace('Bearer ', '');
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) {
    return null;
  }
  
  return user;
}

// GET /api/outcomes - List user's outcomes
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');
    const outcome_type = searchParams.get('outcome_type');

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    let query = supabase
      .from('outcomes')
      .select(`
        *,
        decisions (
          id,
          title,
          category,
          ai_rankings,
          confidence_score
        )
      `, { count: 'exact' })
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (outcome_type) {
      query = query.eq('outcome_type', outcome_type);
    }

    const { data, error, count } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      outcomes: data,
      total: count,
      limit,
      offset,
    });
  } catch (error) {
    console.error('GET /api/outcomes error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/outcomes - Record an outcome for a decision
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      decision_id,
      outcome_type,
      outcome_score,
      notes,
      learned_lessons,
      would_decide_same,
      actual_vs_predicted,
      follow_up_actions,
    } = body;

    // Validate required fields
    if (!decision_id || !outcome_type) {
      return NextResponse.json(
        { error: 'decision_id and outcome_type are required' },
        { status: 400 }
      );
    }

    // Validate outcome_type
    const validOutcomeTypes = ['positive', 'negative', 'neutral', 'mixed'];
    if (!validOutcomeTypes.includes(outcome_type)) {
      return NextResponse.json(
        { error: 'outcome_type must be one of: positive, negative, neutral, mixed' },
        { status: 400 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify the decision belongs to the user
    const { data: decision, error: decisionError } = await supabase
      .from('decisions')
      .select('id')
      .eq('id', decision_id)
      .eq('user_id', user.id)
      .single();

    if (decisionError || !decision) {
      return NextResponse.json({ error: 'Decision not found' }, { status: 404 });
    }

    // Check if outcome already exists
    const { data: existingOutcome } = await supabase
      .from('outcomes')
      .select('id')
      .eq('decision_id', decision_id)
      .single();

    if (existingOutcome) {
      return NextResponse.json(
        { error: 'Outcome already recorded for this decision' },
        { status: 409 }
      );
    }

    // Create outcome
    const outcomeData = {
      decision_id,
      user_id: user.id,
      outcome_type,
      outcome_score: outcome_score || null,
      notes: notes || null,
      learned_lessons: learned_lessons || null,
      would_decide_same: would_decide_same ?? null,
      actual_vs_predicted: actual_vs_predicted || null,
      follow_up_actions: follow_up_actions || [],
    };

    const { data: outcome, error } = await supabase
      .from('outcomes')
      .insert(outcomeData)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Update decision as completed if not already
    await supabase
      .from('decisions')
      .update({ is_completed: true, completed_at: new Date().toISOString() })
      .eq('id', decision_id);

    return NextResponse.json({ outcome }, { status: 201 });
  } catch (error) {
    console.error('POST /api/outcomes error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
