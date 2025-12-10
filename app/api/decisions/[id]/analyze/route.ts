import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { analyzeDecision, type DecisionContext, type DecisionOption } from '@/lib/ai/supabase-ai';

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

// POST /api/decisions/[id]/analyze - Re-analyze an existing decision
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { ai_provider = 'openai' } = body;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the decision
    const { data: decision, error: fetchError } = await supabase
      .from('decisions')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !decision) {
      return NextResponse.json({ error: 'Decision not found' }, { status: 404 });
    }

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

    const positiveOutcomes = recentOutcomes?.filter((o: { outcome_type: string }) => o.outcome_type === 'positive').length || 0;
    const successRate = recentOutcomes?.length ? positiveOutcomes / recentOutcomes.length : 0.5;

    // Prepare AI context
    const decisionContext: DecisionContext = {
      title: decision.title,
      description: decision.description || undefined,
      category: decision.category,
      urgency: decision.urgency,
      options: decision.options as DecisionOption[],
      userHistory: {
        totalDecisions: userProfile?.total_decisions || 0,
        successRate,
        preferredCategories: [],
      },
    };

    // Run AI analysis using Supabase AI (local, no external API needed)
    let aiAnalysis;
    try {
      aiAnalysis = await analyzeDecision(decisionContext);
    } catch (aiError) {
      console.error('AI analysis error:', aiError);
      return NextResponse.json({ error: 'AI analysis failed' }, { status: 500 });
    }

    // Update the decision with new analysis
    const { data: updatedDecision, error: updateError } = await supabase
      .from('decisions')
      .update({
        ai_rankings: aiAnalysis.rankings,
        ai_reasoning: aiAnalysis.reasoning,
        ai_summary: aiAnalysis.summary,
        confidence_score: aiAnalysis.confidence_score,
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({
      decision: updatedDecision,
      aiAnalysis: {
        rankings: aiAnalysis.rankings,
        reasoning: aiAnalysis.reasoning,
        summary: aiAnalysis.summary,
        confidence_score: aiAnalysis.confidence_score,
        key_factors: aiAnalysis.key_factors,
        potential_biases: aiAnalysis.potential_biases,
        recommended_action: aiAnalysis.recommended_action,
      },
    });
  } catch (error) {
    console.error('POST /api/decisions/[id]/analyze error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
