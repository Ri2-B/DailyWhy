// Generate Community Trends (Node.js / Next.js compatible)
// Can be triggered via: /api/cron/generate-trends or /api/trends
// Schedule: 0 2 * * * (Every day at 2 AM)

import { createClient } from '@supabase/supabase-js';

interface Decision {
  id: string;
  category: string;
  confidence_score: number | null;
  is_completed: boolean;
  created_at: string;
}

interface CategoryMetrics {
  totalDecisions: number;
  completedDecisions: number;
  avgConfidence: number;
  popularTimeSlots: Record<string, number>;
}

export async function generateCommunityTrends() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get decisions from the past 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: decisions, error: decisionsError } = await supabase
      .from('decisions')
      .select('id, category, confidence_score, is_completed, created_at')
      .gte('created_at', sevenDaysAgo.toISOString());

    if (decisionsError) {
      throw new Error(`Failed to fetch decisions: ${decisionsError.message}`);
    }

    if (!decisions || decisions.length === 0) {
      return {
        success: true,
        message: 'No decisions to analyze',
        trendsGenerated: 0,
        totalDecisionsAnalyzed: 0,
      };
    }

    // Aggregate by category
    const categoryMetrics: Record<string, CategoryMetrics> = {};

    for (const decision of decisions) {
      const category = decision.category || 'general';
      
      if (!categoryMetrics[category]) {
        categoryMetrics[category] = {
          totalDecisions: 0,
          completedDecisions: 0,
          avgConfidence: 0,
          popularTimeSlots: {},
        };
      }

      categoryMetrics[category].totalDecisions++;
      if (decision.is_completed) categoryMetrics[category].completedDecisions++;
      if (decision.confidence_score) {
        categoryMetrics[category].avgConfidence += decision.confidence_score;
      }

      // Track time slots
      const hour = new Date(decision.created_at).getHours();
      let slot: string;
      if (hour >= 6 && hour < 12) slot = 'morning';
      else if (hour >= 12 && hour < 17) slot = 'afternoon';
      else if (hour >= 17 && hour < 21) slot = 'evening';
      else slot = 'night';
      
      categoryMetrics[category].popularTimeSlots[slot] = 
        (categoryMetrics[category].popularTimeSlots[slot] || 0) + 1;
    }

    // Calculate averages and create trends
    const trends = [];

    for (const [category, metrics] of Object.entries(categoryMetrics)) {
      if (metrics.totalDecisions < 5) continue; // Minimum sample size

      const avgConfidence = metrics.avgConfidence / metrics.totalDecisions;
      const completionRate = metrics.completedDecisions / metrics.totalDecisions;
      const mostPopularSlot = Object.entries(metrics.popularTimeSlots)
        .sort((a, b) => b[1] - a[1])[0]?.[0] || 'afternoon';

      trends.push({
        trend_title: `${category.charAt(0).toUpperCase() + category.slice(1)} Decision Trends`,
        trend_description: `Weekly trends for ${category} decisions`,
        category,
        metrics: {
          totalDecisions: metrics.totalDecisions,
          completionRate: completionRate,
          avgConfidence: avgConfidence,
          mostPopularTime: mostPopularSlot,
        },
        sample_size: metrics.totalDecisions,
        time_period: 'weekly',
        trend_data: [
          { label: 'Completion Rate', value: (completionRate * 100).toFixed(1) },
          { label: 'Avg Confidence', value: (avgConfidence * 100).toFixed(1) },
          { label: 'Peak Time', value: mostPopularSlot },
        ],
        is_active: true,
      });
    }

    // Deactivate old trends
    await supabase
      .from('community_trends')
      .update({ is_active: false })
      .eq('time_period', 'weekly');

    // Insert new trends
    if (trends.length > 0) {
      const { error: insertError } = await supabase
        .from('community_trends')
        .insert(trends);

      if (insertError) {
        throw new Error(`Failed to insert trends: ${insertError.message}`);
      }
    }

    return {
      success: true,
      trendsGenerated: trends.length,
      totalDecisionsAnalyzed: decisions.length,
    };
  } catch (error) {
    console.error('Generate trends error:', error);
    throw error;
  }
}

// Export type for reuse
export type { CategoryMetrics };
