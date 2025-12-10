// Weekly Insights Cron Job (Node.js / Next.js compatible)
// Can be triggered via: /api/cron/weekly-insights
// Schedule: 0 0 * * 0 (Every Sunday at midnight)

import { createClient } from '@supabase/supabase-js';

interface UserMetrics {
  successRate: number;
  fatigueScore: number;
  productivityScore: number;
  biasAnalysis: Record<string, number>;
}

interface Decision {
  id: string;
  user_id: string;
  title: string;
  category: string;
  urgency: string;
  options: unknown;
  chosen_option: unknown;
  confidence_score: number | null;
  time_to_decide: number | null;
  is_completed: boolean;
  created_at: string;
}

interface Outcome {
  id: string;
  decision_id: string;
  outcome_type: string;
  outcome_score: number | null;
}

function calculateSuccessRate(outcomes: Outcome[]): number {
  if (outcomes.length === 0) return 0;
  const positive = outcomes.filter(
    (o) => o.outcome_type === 'positive' || (o.outcome_score && o.outcome_score >= 7)
  ).length;
  return positive / outcomes.length;
}

function calculateFatigueScore(decisions: Decision[]): number {
  if (decisions.length === 0) return 0;
  
  const dailyCounts: Record<string, number> = {};
  let highUrgency = 0;
  let totalTime = 0;
  let timeCount = 0;
  let incomplete = 0;
  
  for (const d of decisions) {
    const day = new Date(d.created_at).toISOString().split('T')[0];
    dailyCounts[day] = (dailyCounts[day] || 0) + 1;
    if (d.urgency === 'high' || d.urgency === 'critical') highUrgency++;
    if (d.time_to_decide) { totalTime += d.time_to_decide; timeCount++; }
    if (!d.is_completed) incomplete++;
  }
  
  const avgDaily = Object.values(dailyCounts).reduce((a, b) => a + b, 0) / Object.keys(dailyCounts).length;
  const urgencyRatio = highUrgency / decisions.length;
  const avgTime = timeCount > 0 ? totalTime / timeCount : 0;
  const incompleteRatio = incomplete / decisions.length;
  
  let fatigue = 0;
  fatigue += Math.min(avgDaily / 5, 2.5);
  fatigue += urgencyRatio * 2.5;
  fatigue += Math.min(avgTime / 300, 2.5);
  fatigue += incompleteRatio * 2.5;
  
  return Math.min(fatigue, 10);
}

function analyzeBiases(decisions: Decision[]): Record<string, number> {
  const biases: Record<string, number> = {
    first_option_bias: 0,
    overconfidence_bias: 0,
    analysis_paralysis: 0,
  };
  
  let firstOption = 0;
  let highConfidence = 0;
  let longTime = 0;
  
  for (const d of decisions) {
    const options = d.options as Array<{ id: string }>;
    const chosen = d.chosen_option as { id: string } | null;
    
    if (options?.length > 0 && chosen && options[0]?.id === chosen.id) firstOption++;
    if (d.confidence_score && d.confidence_score > 0.8) highConfidence++;
    if (d.time_to_decide && d.time_to_decide > 600) longTime++;
  }
  
  const total = decisions.length || 1;
  biases.first_option_bias = firstOption / total;
  biases.overconfidence_bias = highConfidence / total;
  biases.analysis_paralysis = longTime / total;
  
  return biases;
}

function generateInsightsFromMetrics(
  userId: string,
  metrics: UserMetrics,
  totalDecisions: number,
  periodStart: string,
  periodEnd: string
): Array<{
  user_id: string;
  insight_type: string;
  insight_title: string;
  insight_text: string;
  metrics: Record<string, unknown>;
  period_start: string;
  period_end: string;
  priority: number;
  action_items?: string[];
}> {
  const insights: Array<{
    user_id: string;
    insight_type: string;
    insight_title: string;
    insight_text: string;
    metrics: Record<string, unknown>;
    period_start: string;
    period_end: string;
    priority: number;
    action_items?: string[];
  }> = [];

  // Weekly summary
  insights.push({
    user_id: userId,
    insight_type: 'weekly',
    insight_title: 'Weekly Decision Summary',
    insight_text: `This week you made ${totalDecisions} decisions with a ${(metrics.successRate * 100).toFixed(1)}% success rate.`,
    metrics: {
      totalDecisions,
      successRate: metrics.successRate,
      fatigueScore: metrics.fatigueScore,
      productivityScore: metrics.productivityScore,
    },
    period_start: periodStart,
    period_end: periodEnd,
    priority: 5,
  });

  // Fatigue alert
  if (metrics.fatigueScore >= 7) {
    insights.push({
      user_id: userId,
      insight_type: 'pattern',
      insight_title: 'High Decision Fatigue',
      insight_text: `Your fatigue score of ${metrics.fatigueScore.toFixed(1)}/10 suggests you may be overwhelmed. Consider batching decisions or delegating minor ones.`,
      metrics: { fatigueScore: metrics.fatigueScore },
      period_start: periodStart,
      period_end: periodEnd,
      priority: 9,
      action_items: ['Batch similar decisions', 'Set time limits for choices', 'Delegate minor decisions'],
    });
  }

  // Bias alerts
  for (const [bias, score] of Object.entries(metrics.biasAnalysis)) {
    if (score > 0.4) {
      const descriptions: Record<string, string> = {
        first_option_bias: 'You tend to choose the first option. Consider evaluating all options equally.',
        overconfidence_bias: 'High confidence doesn\'t always match outcomes. Consider seeking second opinions.',
        analysis_paralysis: 'You spend significant time on decisions. Try setting time limits.',
      };
      
      if (descriptions[bias]) {
        insights.push({
          user_id: userId,
          insight_type: 'pattern',
          insight_title: bias.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
          insight_text: descriptions[bias],
          metrics: { [bias]: score },
          period_start: periodStart,
          period_end: periodEnd,
          priority: 7,
        });
      }
    }
  }

  return insights;
}

// Export functions for use in Next.js API routes
export async function processWeeklyInsights() {
  // Initialize Supabase client with service role
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Calculate date range for the past week
  const periodEnd = new Date();
  const periodStart = new Date();
  periodStart.setDate(periodStart.getDate() - 7);

  // Get all users who made decisions in the past week
  const { data: activeUsers, error: usersError } = await supabase
    .from('decisions')
    .select('user_id')
    .gte('created_at', periodStart.toISOString())
    .lte('created_at', periodEnd.toISOString());

  if (usersError) {
    throw new Error(`Failed to fetch active users: ${usersError.message}`);
  }

  // Get unique user IDs
  const uniqueUserIds = [...new Set(activeUsers?.map(u => u.user_id) || [])];
  
  console.log(`Processing weekly insights for ${uniqueUserIds.length} users`);

  let totalInsightsGenerated = 0;

  for (const userId of uniqueUserIds) {
    try {
      // Fetch user's decisions from the past week
      const { data: decisions, error: decisionsError } = await supabase
        .from('decisions')
        .select('*')
        .eq('user_id', userId)
        .gte('created_at', periodStart.toISOString())
        .lte('created_at', periodEnd.toISOString());

      if (decisionsError || !decisions || decisions.length === 0) {
        continue;
      }

      // Fetch outcomes for these decisions
      const decisionIds = decisions.map(d => d.id);
      const { data: outcomes } = await supabase
        .from('outcomes')
        .select('*')
        .in('decision_id', decisionIds);

      // Calculate metrics
      const metrics: UserMetrics = {
        successRate: calculateSuccessRate(outcomes || []),
        fatigueScore: calculateFatigueScore(decisions),
        productivityScore: (decisions.filter(d => d.is_completed).length / decisions.length) * 100,
        biasAnalysis: analyzeBiases(decisions),
      };

      // Generate insights
      const insights = generateInsightsFromMetrics(
        userId,
        metrics,
        decisions.length,
        periodStart.toISOString(),
        periodEnd.toISOString()
      );

      // Save insights to database
      if (insights.length > 0) {
        const { error: insertError } = await supabase
          .from('insights')
          .insert(insights);

        if (insertError) {
          console.error(`Failed to insert insights for user ${userId}:`, insertError);
        } else {
          totalInsightsGenerated += insights.length;
        }
      }
    } catch (userError) {
      console.error(`Error processing user ${userId}:`, userError);
    }
  }

  return {
    success: true,
    usersProcessed: uniqueUserIds.length,
    insightsGenerated: totalInsightsGenerated,
  };
}

// Export helper functions for reuse
export {
  calculateSuccessRate,
  calculateFatigueScore,
  analyzeBiases,
  generateInsightsFromMetrics,
};
