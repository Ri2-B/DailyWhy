import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  generateWeeklyInsightsForUser,
  generateMonthlyInsightsForUser,
  calculateSuccessRate,
  calculateFatigueScore,
  analyzeBiases,
  analyzeCategoryPerformance,
  analyzeTimePatterns,
} from '@/lib/ai/insights-engine';

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

// GET /api/insights - Get user's insights
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');
    const insight_type = searchParams.get('type');
    const unread_only = searchParams.get('unread') === 'true';

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    let query = supabase
      .from('insights')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)
      .eq('is_dismissed', false)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (insight_type) {
      query = query.eq('insight_type', insight_type);
    }

    if (unread_only) {
      query = query.eq('is_read', false);
    }

    const { data, error, count } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      insights: data,
      total: count,
      limit,
      offset,
    });
  } catch (error) {
    console.error('GET /api/insights error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/insights - Generate insights on demand
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { type = 'weekly' } = body;

    let insights;
    if (type === 'monthly') {
      insights = await generateMonthlyInsightsForUser(user.id);
    } else {
      insights = await generateWeeklyInsightsForUser(user.id);
    }

    return NextResponse.json({ insights }, { status: 201 });
  } catch (error) {
    console.error('POST /api/insights error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET /api/insights/dashboard - Get dashboard metrics
export async function PATCH(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get last 30 days of data
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Fetch decisions
    const { data: decisions } = await supabase
      .from('decisions')
      .select('*')
      .eq('user_id', user.id)
      .gte('created_at', thirtyDaysAgo.toISOString());

    // Fetch outcomes
    const decisionIds = decisions?.map((d: { id: string }) => d.id) || [];
    const { data: outcomes } = await supabase
      .from('outcomes')
      .select('*')
      .in('decision_id', decisionIds);

    // Fetch streaks
    const { data: streaks } = await supabase
      .from('streaks')
      .select('*')
      .eq('user_id', user.id);

    // Calculate metrics
    const metrics = {
      totalDecisions: decisions?.length || 0,
      completedDecisions: decisions?.filter((d: { is_completed: boolean }) => d.is_completed).length || 0,
      successRate: calculateSuccessRate(outcomes || []),
      fatigueScore: calculateFatigueScore(decisions || []),
      biasAnalysis: analyzeBiases(decisions || []),
      categoryPerformance: analyzeCategoryPerformance(decisions || [], outcomes || []),
      timePatterns: analyzeTimePatterns(decisions || []),
      streaks: streaks?.map((s: { streak_type: string; current_count: number; longest_count: number }) => ({
        type: s.streak_type,
        current: s.current_count,
        longest: s.longest_count,
      })) || [],
    };

    return NextResponse.json({ metrics });
  } catch (error) {
    console.error('PATCH /api/insights error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
