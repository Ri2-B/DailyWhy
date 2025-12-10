import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { analyzeDecision, type DecisionContext } from '@/lib/ai/supabase-ai';

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

// GET /api/decisions - List user's decisions
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');
    const category = searchParams.get('category');
    const completed = searchParams.get('completed');

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    let query = supabase
      .from('decisions')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (category) {
      query = query.eq('category', category);
    }
    
    if (completed !== null) {
      query = query.eq('is_completed', completed === 'true');
    }

    const { data, error, count } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      decisions: data,
      total: count,
      limit,
      offset,
    });
  } catch (error) {
    console.error('GET /api/decisions error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/decisions - Create a new decision
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      title,
      description,
      category = 'general',
      urgency = 'medium',
      options,
      mood_before,
      decision_type = 'standard',
      analyze = true,
      ai_provider = 'openai', // 'openai' or 'claude'
    } = body;

    // Validate required fields
    if (!title || !options || !Array.isArray(options) || options.length < 2) {
      return NextResponse.json(
        { error: 'Title and at least 2 options are required' },
        { status: 400 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user history for AI context
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('total_decisions')
      .eq('id', user.id)
      .single();

    const { data: recentOutcomes } = await supabase
      .from('outcomes')
      .select('outcome_type')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);

    // Calculate success rate from recent outcomes
    const positiveOutcomes = recentOutcomes?.filter((o: { outcome_type: string }) => o.outcome_type === 'positive').length || 0;
    const successRate = recentOutcomes?.length ? positiveOutcomes / recentOutcomes.length : 0.5;

    // Get category preferences
    const { data: categoryData } = await supabase
      .from('decisions')
      .select('category')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    const categoryCounts: Record<string, number> = {};
    categoryData?.forEach((d: { category: string }) => {
      categoryCounts[d.category] = (categoryCounts[d.category] || 0) + 1;
    });
    const preferredCategories = Object.entries(categoryCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([cat]) => cat);

    // Prepare AI context
    const decisionContext: DecisionContext = {
      title,
      description,
      category,
      urgency,
      options,
      userHistory: {
        totalDecisions: userProfile?.total_decisions || 0,
        successRate,
        preferredCategories,
      },
    };

    // Analyze with Supabase AI (local, no external API needed)
    let aiAnalysis = null;
    if (analyze) {
      try {
        aiAnalysis = await analyzeDecision(decisionContext);
      } catch (aiError) {
        console.error('AI analysis error:', aiError);
        // Continue without AI analysis
      }
    }

    // Create the decision record
    const decisionData = {
      user_id: user.id,
      title,
      description,
      category,
      urgency,
      options,
      decision_type,
      mood_before,
      is_micro: decision_type === 'micro',
      ai_rankings: aiAnalysis?.rankings || null,
      ai_reasoning: aiAnalysis?.reasoning || null,
      ai_summary: aiAnalysis?.summary || null,
      confidence_score: aiAnalysis?.confidence_score || null,
    };

    const { data: decision, error } = await supabase
      .from('decisions')
      .insert(decisionData)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      decision,
      aiAnalysis: aiAnalysis ? {
        rankings: aiAnalysis.rankings,
        reasoning: aiAnalysis.reasoning,
        summary: aiAnalysis.summary,
        confidence_score: aiAnalysis.confidence_score,
        key_factors: aiAnalysis.key_factors,
        potential_biases: aiAnalysis.potential_biases,
        recommended_action: aiAnalysis.recommended_action,
      } : null,
    }, { status: 201 });
  } catch (error) {
    console.error('POST /api/decisions error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
