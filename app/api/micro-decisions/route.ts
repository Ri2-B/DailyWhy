import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { analyzeMicroDecision } from '@/lib/ai/supabase-ai';

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

// GET /api/micro-decisions - List user's micro-decisions
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const { data, error, count } = await supabase
      .from('micro_decisions')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      microDecisions: data,
      total: count,
      limit,
      offset,
    });
  } catch (error) {
    console.error('GET /api/micro-decisions error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/micro-decisions - Create a micro-decision with AI suggestion
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      question,
      options,
      category = 'quick',
      ai_provider = 'openai',
    } = body;

    // Validate required fields
    if (!question || !options || !Array.isArray(options) || options.length < 2) {
      return NextResponse.json(
        { error: 'Question and at least 2 options are required' },
        { status: 400 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get AI suggestion using Supabase AI (local, no external API needed)
    let aiSuggestion = null;
    try {
      aiSuggestion = await analyzeMicroDecision(question, options);
    } catch (aiError) {
      console.error('AI micro-decision error:', aiError);
      // Continue without AI suggestion
    }

    // Create micro-decision record
    const microDecisionData = {
      user_id: user.id,
      question,
      options,
      category,
      ai_suggestion: aiSuggestion?.suggestion || null,
    };

    const { data: microDecision, error } = await supabase
      .from('micro_decisions')
      .insert(microDecisionData)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      microDecision,
      aiSuggestion: aiSuggestion ? {
        suggestion: aiSuggestion.suggestion,
        reasoning: aiSuggestion.reasoning,
      } : null,
    }, { status: 201 });
  } catch (error) {
    console.error('POST /api/micro-decisions error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/micro-decisions - Update a micro-decision (record choice)
export async function PATCH(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, chosen_option, response_time_ms } = body;

    if (!id || !chosen_option) {
      return NextResponse.json(
        { error: 'id and chosen_option are required' },
        { status: 400 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: microDecision, error } = await supabase
      .from('micro_decisions')
      .update({
        chosen_option,
        response_time_ms: response_time_ms || null,
      })
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ microDecision });
  } catch (error) {
    console.error('PATCH /api/micro-decisions error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
