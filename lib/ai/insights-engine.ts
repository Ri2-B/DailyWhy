import { createServerClient } from '../supabase';

// Type definitions for database rows
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
  user_id: string;
  outcome_type: string;
  outcome_score: number | null;
}

interface Insight {
  user_id: string;
  insight_type: string;
  insight_title: string;
  insight_text: string;
  metrics?: Record<string, unknown>;
  category?: string | null;
  period_start?: string | null;
  period_end?: string | null;
  action_items?: string[];
  is_read?: boolean;
  is_dismissed?: boolean;
  priority?: number;
}

export interface UserMetrics {
  successRate: number;
  fatigueScore: number;
  productivityScore: number;
  biasAnalysis: Record<string, number>;
  categoryPerformance: Record<string, { total: number; positive: number }>;
  timePatterns: Record<string, number>;
  streakData: {
    currentStreak: number;
    longestStreak: number;
    streakType: string;
  };
}

export interface WeeklyInsightData {
  userId: string;
  periodStart: Date;
  periodEnd: Date;
  decisions: Decision[];
  outcomes: Outcome[];
}

// Calculate success rate from outcomes
export function calculateSuccessRate(outcomes: Outcome[]): number {
  if (outcomes.length === 0) return 0;
  
  const positiveOutcomes = outcomes.filter(
    (o) => o.outcome_type === 'positive' || (o.outcome_score && o.outcome_score >= 7)
  ).length;
  
  return positiveOutcomes / outcomes.length;
}

// Calculate decision fatigue score (0-10)
export function calculateFatigueScore(decisions: Decision[]): number {
  if (decisions.length === 0) return 0;
  
  // Factors that increase fatigue:
  // 1. High number of decisions per day
  // 2. Many high-urgency decisions
  // 3. Long time to decide
  // 4. Many incomplete decisions
  
  const dailyDecisionCounts: Record<string, number> = {};
  let highUrgencyCount = 0;
  let totalTimeToDecide = 0;
  let decisionsWithTime = 0;
  let incompleteCount = 0;
  
  decisions.forEach((d) => {
    const day = new Date(d.created_at).toISOString().split('T')[0];
    dailyDecisionCounts[day] = (dailyDecisionCounts[day] || 0) + 1;
    
    if (d.urgency === 'high' || d.urgency === 'critical') {
      highUrgencyCount++;
    }
    
    if (d.time_to_decide) {
      totalTimeToDecide += d.time_to_decide;
      decisionsWithTime++;
    }
    
    if (!d.is_completed) {
      incompleteCount++;
    }
  });
  
  const avgDailyDecisions = Object.values(dailyDecisionCounts).reduce((a, b) => a + b, 0) / 
    Object.keys(dailyDecisionCounts).length;
  const urgencyRatio = highUrgencyCount / decisions.length;
  const avgTimeToDecide = decisionsWithTime > 0 ? totalTimeToDecide / decisionsWithTime : 0;
  const incompleteRatio = incompleteCount / decisions.length;
  
  // Calculate fatigue score (weighted)
  let fatigue = 0;
  fatigue += Math.min(avgDailyDecisions / 5, 2.5); // Max 2.5 from daily decisions
  fatigue += urgencyRatio * 2.5; // Max 2.5 from urgency
  fatigue += Math.min(avgTimeToDecide / 300, 2.5); // Max 2.5 from time (5 min = high)
  fatigue += incompleteRatio * 2.5; // Max 2.5 from incomplete
  
  return Math.min(fatigue, 10);
}

// Analyze category performance
export function analyzeCategoryPerformance(
  decisions: Decision[],
  outcomes: Outcome[]
): Record<string, { total: number; positive: number; avgConfidence: number }> {
  const categoryStats: Record<string, { total: number; positive: number; confidenceSum: number }> = {};
  
  // Map outcomes to decisions
  const outcomesByDecision = new Map<string, Outcome>();
  outcomes.forEach((o) => outcomesByDecision.set(o.decision_id, o));
  
  decisions.forEach((d) => {
    const category = d.category || 'general';
    if (!categoryStats[category]) {
      categoryStats[category] = { total: 0, positive: 0, confidenceSum: 0 };
    }
    
    categoryStats[category].total++;
    categoryStats[category].confidenceSum += d.confidence_score || 0;
    
    const outcome = outcomesByDecision.get(d.id);
    if (outcome && (outcome.outcome_type === 'positive' || (outcome.outcome_score && outcome.outcome_score >= 7))) {
      categoryStats[category].positive++;
    }
  });
  
  // Convert to final format
  const result: Record<string, { total: number; positive: number; avgConfidence: number }> = {};
  Object.entries(categoryStats).forEach(([category, stats]) => {
    result[category] = {
      total: stats.total,
      positive: stats.positive,
      avgConfidence: stats.total > 0 ? stats.confidenceSum / stats.total : 0,
    };
  });
  
  return result;
}

// Analyze time patterns
export function analyzeTimePatterns(decisions: Decision[]): Record<string, number> {
  const hourCounts: Record<string, number> = {
    'morning (6-12)': 0,
    'afternoon (12-17)': 0,
    'evening (17-21)': 0,
    'night (21-6)': 0,
  };
  
  decisions.forEach((d) => {
    const hour = new Date(d.created_at).getHours();
    if (hour >= 6 && hour < 12) hourCounts['morning (6-12)']++;
    else if (hour >= 12 && hour < 17) hourCounts['afternoon (12-17)']++;
    else if (hour >= 17 && hour < 21) hourCounts['evening (17-21)']++;
    else hourCounts['night (21-6)']++;
  });
  
  return hourCounts;
}

// Analyze option-choice biases
export function analyzeBiases(decisions: Decision[]): Record<string, number> {
  const biases: Record<string, number> = {
    'first_option_bias': 0,
    'last_option_bias': 0,
    'status_quo_bias': 0,
    'overconfidence_bias': 0,
    'analysis_paralysis': 0,
  };
  
  let firstOptionCount = 0;
  let lastOptionCount = 0;
  let highConfidenceLowSuccess = 0;
  let longDecisionTime = 0;
  
  decisions.forEach((d) => {
    const options = d.options as Array<{ id: string; text: string }>;
    const chosen = d.chosen_option as { id: string } | null;
    
    if (options && options.length > 0 && chosen) {
      if (options[0]?.id === chosen.id) firstOptionCount++;
      if (options[options.length - 1]?.id === chosen.id) lastOptionCount++;
    }
    
    if (d.confidence_score && d.confidence_score > 0.8) {
      highConfidenceLowSuccess++;
    }
    
    if (d.time_to_decide && d.time_to_decide > 600) { // More than 10 minutes
      longDecisionTime++;
    }
  });
  
  const total = decisions.length || 1;
  biases['first_option_bias'] = firstOptionCount / total;
  biases['last_option_bias'] = lastOptionCount / total;
  biases['overconfidence_bias'] = highConfidenceLowSuccess / total;
  biases['analysis_paralysis'] = longDecisionTime / total;
  
  return biases;
}

// Generate insights from metrics
export function generateInsightsFromMetrics(
  userId: string,
  metrics: UserMetrics,
  periodStart: Date,
  periodEnd: Date
): Insight[] {
  const insights: Insight[] = [];
  
  // Success rate insight
  if (metrics.successRate >= 0.7) {
    insights.push({
      user_id: userId,
      insight_type: 'weekly',
      insight_title: 'Strong Decision Performance',
      insight_text: `Your success rate of ${(metrics.successRate * 100).toFixed(1)}% shows excellent decision-making skills this period.`,
      metrics: { successRate: metrics.successRate },
      period_start: periodStart.toISOString(),
      period_end: periodEnd.toISOString(),
      priority: 5,
    });
  } else if (metrics.successRate < 0.5) {
    insights.push({
      user_id: userId,
      insight_type: 'weekly',
      insight_title: 'Decision Quality Alert',
      insight_text: `Your success rate of ${(metrics.successRate * 100).toFixed(1)}% suggests room for improvement. Consider taking more time for important decisions.`,
      metrics: { successRate: metrics.successRate },
      action_items: ['Review recent decisions that didn\'t work out', 'Consider seeking input before major choices'],
      period_start: periodStart.toISOString(),
      period_end: periodEnd.toISOString(),
      priority: 8,
    });
  }
  
  // Fatigue insight
  if (metrics.fatigueScore >= 7) {
    insights.push({
      user_id: userId,
      insight_type: 'pattern',
      insight_title: 'High Decision Fatigue Detected',
      insight_text: `Your fatigue score of ${metrics.fatigueScore.toFixed(1)}/10 indicates you might be overwhelmed. Consider batching smaller decisions.`,
      metrics: { fatigueScore: metrics.fatigueScore },
      action_items: ['Batch similar decisions together', 'Delegate minor decisions when possible', 'Set decision-making time limits'],
      period_start: periodStart.toISOString(),
      period_end: periodEnd.toISOString(),
      priority: 9,
    });
  }
  
  // Bias insights
  Object.entries(metrics.biasAnalysis).forEach(([bias, score]) => {
    if (score > 0.4) {
      const biasDescriptions: Record<string, string> = {
        'first_option_bias': 'You tend to choose the first option presented. Consider evaluating all options equally.',
        'last_option_bias': 'You tend to favor the last option you consider. The earlier options might be better.',
        'overconfidence_bias': 'Your high confidence doesn\'t always match outcomes. Consider seeking second opinions.',
        'analysis_paralysis': 'You spend significant time on decisions. Try setting time limits for choices.',
      };
      
      if (biasDescriptions[bias]) {
        insights.push({
          user_id: userId,
          insight_type: 'pattern',
          insight_title: `${bias.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} Detected`,
          insight_text: biasDescriptions[bias],
          metrics: { [bias]: score },
          period_start: periodStart.toISOString(),
          period_end: periodEnd.toISOString(),
          priority: 7,
        });
      }
    }
  });
  
  // Category performance insights
  const categories = Object.entries(metrics.categoryPerformance);
  const bestCategory = categories.reduce((best, [cat, stats]) => {
    const rate = stats.total > 0 ? stats.positive / stats.total : 0;
    const bestRate = best[1].total > 0 ? best[1].positive / best[1].total : 0;
    return rate > bestRate ? [cat, stats] : best;
  }, ['none', { total: 0, positive: 0 }] as [string, { total: number; positive: number }]);
  
  if (bestCategory[0] !== 'none' && bestCategory[1].total >= 3) {
    insights.push({
      user_id: userId,
      insight_type: 'category',
      insight_title: `Strong in ${bestCategory[0].charAt(0).toUpperCase() + bestCategory[0].slice(1)} Decisions`,
      insight_text: `You excel at ${bestCategory[0]} decisions with a ${((bestCategory[1].positive / bestCategory[1].total) * 100).toFixed(0)}% success rate.`,
      category: bestCategory[0],
      metrics: metrics.categoryPerformance,
      period_start: periodStart.toISOString(),
      period_end: periodEnd.toISOString(),
      priority: 4,
    });
  }
  
  return insights;
}

// Main function to generate weekly insights for a user
export async function generateWeeklyInsightsForUser(userId: string): Promise<Insight[]> {
  const supabase = createServerClient();
  
  const periodEnd = new Date();
  const periodStart = new Date();
  periodStart.setDate(periodStart.getDate() - 7);
  
  // Fetch decisions from the past week
  const { data: decisions, error: decisionsError } = await supabase
    .from('decisions')
    .select('*')
    .eq('user_id', userId)
    .gte('created_at', periodStart.toISOString())
    .lte('created_at', periodEnd.toISOString());
  
  if (decisionsError) {
    throw new Error(`Failed to fetch decisions: ${decisionsError.message}`);
  }
  
  if (!decisions || decisions.length === 0) {
    return [];
  }
  
  // Fetch outcomes for these decisions
  const decisionIds = decisions.map((d: Decision) => d.id);
  const { data: outcomes, error: outcomesError } = await supabase
    .from('outcomes')
    .select('*')
    .in('decision_id', decisionIds);
  
  if (outcomesError) {
    throw new Error(`Failed to fetch outcomes: ${outcomesError.message}`);
  }
  
  // Calculate metrics
  const metrics: UserMetrics = {
    successRate: calculateSuccessRate(outcomes || []),
    fatigueScore: calculateFatigueScore(decisions as Decision[]),
    productivityScore: decisions.filter((d: Decision) => d.is_completed).length / decisions.length * 100,
    biasAnalysis: analyzeBiases(decisions),
    categoryPerformance: analyzeCategoryPerformance(decisions, outcomes || []),
    timePatterns: analyzeTimePatterns(decisions),
    streakData: {
      currentStreak: 0,
      longestStreak: 0,
      streakType: 'daily_decision',
    },
  };
  
  // Generate insights
  const insights = generateInsightsFromMetrics(userId, metrics, periodStart, periodEnd);
  
  // Save insights to database
  if (insights.length > 0) {
    const { error: insertError } = await supabase
      .from('insights')
      .insert(insights);
    
    if (insertError) {
      console.error('Failed to insert insights:', insertError);
    }
  }
  
  return insights;
}

// Generate monthly insights
export async function generateMonthlyInsightsForUser(userId: string): Promise<Insight[]> {
  const supabase = createServerClient();
  
  const periodEnd = new Date();
  const periodStart = new Date();
  periodStart.setMonth(periodStart.getMonth() - 1);
  
  // Fetch decisions from the past month
  const { data: decisions, error: decisionsError } = await supabase
    .from('decisions')
    .select('*')
    .eq('user_id', userId)
    .gte('created_at', periodStart.toISOString())
    .lte('created_at', periodEnd.toISOString());
  
  if (decisionsError || !decisions || decisions.length === 0) {
    return [];
  }
  
  // Fetch outcomes
  const decisionIds = decisions.map((d: Decision) => d.id);
  const { data: outcomes } = await supabase
    .from('outcomes')
    .select('*')
    .in('decision_id', decisionIds);
  
  // Calculate metrics
  const metrics: UserMetrics = {
    successRate: calculateSuccessRate(outcomes || []),
    fatigueScore: calculateFatigueScore(decisions as Decision[]),
    productivityScore: decisions.filter((d: Decision) => d.is_completed).length / decisions.length * 100,
    biasAnalysis: analyzeBiases(decisions),
    categoryPerformance: analyzeCategoryPerformance(decisions, outcomes || []),
    timePatterns: analyzeTimePatterns(decisions),
    streakData: {
      currentStreak: 0,
      longestStreak: 0,
      streakType: 'daily_decision',
    },
  };
  
  // Generate monthly-specific insights
  const insights: Insight[] = [
    {
      user_id: userId,
      insight_type: 'monthly',
      insight_title: 'Monthly Decision Summary',
      insight_text: `This month you made ${decisions.length} decisions with a ${(metrics.successRate * 100).toFixed(1)}% success rate and productivity score of ${metrics.productivityScore.toFixed(0)}%.`,
      metrics: {
        totalDecisions: decisions.length,
        successRate: metrics.successRate,
        productivityScore: metrics.productivityScore,
        fatigueScore: metrics.fatigueScore,
      },
      period_start: periodStart.toISOString(),
      period_end: periodEnd.toISOString(),
      priority: 6,
    },
  ];
  
  // Save to database
  const { error: insertError } = await supabase
    .from('insights')
    .insert(insights);
  
  if (insertError) {
    console.error('Failed to insert monthly insights:', insertError);
  }
  
  return insights;
}
