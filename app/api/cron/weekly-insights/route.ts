import { NextRequest, NextResponse } from 'next/server';

// Vercel Cron Job: Weekly Insights Generator
// Configure in vercel.json: { "crons": [{ "path": "/api/cron/weekly-insights", "schedule": "0 0 * * 0" }] }

export const runtime = 'edge';
export const maxDuration = 60;

// Verify the request is from Vercel Cron
function verifyRequest(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return false;
  }
  
  return true;
}

export async function GET(request: NextRequest) {
  // Verify request
  if (!verifyRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  try {
    // Calculate date range
    const periodEnd = new Date();
    const periodStart = new Date();
    periodStart.setDate(periodStart.getDate() - 7);

    // Fetch active users from the past week
    const usersResponse = await fetch(
      `${supabaseUrl}/rest/v1/decisions?select=user_id&created_at=gte.${periodStart.toISOString()}&created_at=lte.${periodEnd.toISOString()}`,
      {
        headers: {
          apikey: supabaseServiceKey,
          Authorization: `Bearer ${supabaseServiceKey}`,
        },
      }
    );

    const activeUsers = await usersResponse.json();
    const uniqueUserIds = [...new Set((activeUsers || []).map((u: { user_id: string }) => u.user_id))];

    console.log(`Processing weekly insights for ${uniqueUserIds.length} users`);

    let totalInsightsGenerated = 0;
    const errors: string[] = [];

    for (const userId of uniqueUserIds) {
      try {
        // Fetch decisions
        const decisionsResponse = await fetch(
          `${supabaseUrl}/rest/v1/decisions?user_id=eq.${userId}&created_at=gte.${periodStart.toISOString()}&created_at=lte.${periodEnd.toISOString()}`,
          {
            headers: {
              apikey: supabaseServiceKey,
              Authorization: `Bearer ${supabaseServiceKey}`,
            },
          }
        );

        const decisions = await decisionsResponse.json();
        if (!decisions || decisions.length === 0) continue;

        // Fetch outcomes
        const decisionIds = decisions.map((d: { id: string }) => d.id);
        const outcomesResponse = await fetch(
          `${supabaseUrl}/rest/v1/outcomes?decision_id=in.(${decisionIds.join(',')})`,
          {
            headers: {
              apikey: supabaseServiceKey,
              Authorization: `Bearer ${supabaseServiceKey}`,
            },
          }
        );

        const outcomes = await outcomesResponse.json();

        // Calculate basic metrics
        const totalDecisions = decisions.length;
        const completedDecisions = decisions.filter((d: { is_completed: boolean }) => d.is_completed).length;
        const positiveOutcomes = (outcomes || []).filter(
          (o: { outcome_type: string; outcome_score?: number }) => 
            o.outcome_type === 'positive' || (o.outcome_score && o.outcome_score >= 7)
        ).length;
        const successRate = outcomes?.length ? positiveOutcomes / outcomes.length : 0;

        // Create weekly summary insight
        const insight = {
          user_id: userId,
          insight_type: 'weekly',
          insight_title: 'Weekly Decision Summary',
          insight_text: `This week you made ${totalDecisions} decisions with ${completedDecisions} completed and a ${(successRate * 100).toFixed(1)}% success rate.`,
          metrics: {
            totalDecisions,
            completedDecisions,
            successRate,
            completionRate: totalDecisions > 0 ? completedDecisions / totalDecisions : 0,
          },
          period_start: periodStart.toISOString(),
          period_end: periodEnd.toISOString(),
          priority: 5,
        };

        // Insert insight
        const insertResponse = await fetch(
          `${supabaseUrl}/rest/v1/insights`,
          {
            method: 'POST',
            headers: {
              apikey: supabaseServiceKey,
              Authorization: `Bearer ${supabaseServiceKey}`,
              'Content-Type': 'application/json',
              Prefer: 'return=minimal',
            },
            body: JSON.stringify(insight),
          }
        );

        if (insertResponse.ok) {
          totalInsightsGenerated++;
        } else {
          const error = await insertResponse.text();
          errors.push(`User ${userId}: ${error}`);
        }
      } catch (userError) {
        errors.push(`User ${userId}: ${userError}`);
      }
    }

    return NextResponse.json({
      success: true,
      usersProcessed: uniqueUserIds.length,
      insightsGenerated: totalInsightsGenerated,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('Weekly insights cron error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
