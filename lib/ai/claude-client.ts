import Anthropic from '@anthropic-ai/sdk';

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

// Types (shared with OpenAI client)
export interface DecisionOption {
  id: string;
  text: string;
  pros?: string[];
  cons?: string[];
}

export interface AIRanking {
  option_id: string;
  rank: number;
  score: number;
  predicted_outcome: string;
  risk_level: 'low' | 'medium' | 'high';
  time_horizon: string;
}

export interface AIAnalysisResult {
  rankings: AIRanking[];
  reasoning: string;
  summary: string;
  confidence_score: number;
  key_factors: string[];
  potential_biases: string[];
  recommended_action: string;
}

export interface DecisionContext {
  title: string;
  description?: string;
  category: string;
  urgency: string;
  options: DecisionOption[];
  userHistory?: {
    totalDecisions: number;
    successRate: number;
    preferredCategories: string[];
  };
}

// Main function to analyze a decision using Claude
export async function analyzeDecisionWithClaude(context: DecisionContext): Promise<AIAnalysisResult> {
  const systemPrompt = `You are an expert decision-making assistant. Your role is to analyze decisions objectively, identify potential biases, and provide ranked recommendations based on logical reasoning.

You must respond with valid JSON only, no additional text or markdown. Follow this exact structure:
{
  "rankings": [
    {
      "option_id": "string",
      "rank": number (1 = best),
      "score": number (0-100),
      "predicted_outcome": "string describing likely outcome",
      "risk_level": "low" | "medium" | "high",
      "time_horizon": "string (e.g., 'short-term', 'long-term')"
    }
  ],
  "reasoning": "detailed explanation of the analysis process",
  "summary": "2-3 sentence executive summary",
  "confidence_score": number (0-1),
  "key_factors": ["array of key factors considered"],
  "potential_biases": ["array of potential biases to be aware of"],
  "recommended_action": "specific next step recommendation"
}`;

  const userPrompt = `Analyze this decision and rank the options:

**Decision:** ${context.title}
${context.description ? `**Context:** ${context.description}` : ''}
**Category:** ${context.category}
**Urgency:** ${context.urgency}

**Options:**
${context.options.map((opt, i) => `
${i + 1}. ${opt.text}
${opt.pros?.length ? `   Pros: ${opt.pros.join(', ')}` : ''}
${opt.cons?.length ? `   Cons: ${opt.cons.join(', ')}` : ''}
`).join('\n')}

${context.userHistory ? `
**User History:**
- Total decisions made: ${context.userHistory.totalDecisions}
- Historical success rate: ${(context.userHistory.successRate * 100).toFixed(1)}%
- Preferred categories: ${context.userHistory.preferredCategories.join(', ')}
` : ''}

Provide a thorough analysis with rankings, reasoning, and actionable recommendations. Respond with JSON only.`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 2000,
      messages: [
        {
          role: 'user',
          content: `${systemPrompt}\n\n${userPrompt}`,
        },
      ],
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Claude');
    }

    // Extract JSON from response (Claude might wrap it in markdown)
    let jsonContent = content.text;
    const jsonMatch = jsonContent.match(/```json\n?([\s\S]*?)\n?```/);
    if (jsonMatch) {
      jsonContent = jsonMatch[1];
    }

    const result = JSON.parse(jsonContent) as AIAnalysisResult;
    
    // Validate the response structure
    if (!result.rankings || !Array.isArray(result.rankings)) {
      throw new Error('Invalid AI response structure');
    }

    return result;
  } catch (error) {
    console.error('Claude Analysis Error:', error);
    throw new Error('Failed to analyze decision with Claude');
  }
}

// Function for quick micro-decision suggestions with Claude
export async function analyzeMicroDecisionWithClaude(
  question: string,
  options: string[]
): Promise<{ suggestion: string; reasoning: string }> {
  const response = await anthropic.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 200,
    messages: [
      {
        role: 'user',
        content: `You are a quick decision helper. For simple daily choices, provide a brief suggestion and one-line reasoning. Respond in JSON format only: {"suggestion": "option text", "reasoning": "brief reason"}

Quick decision: ${question}
Options: ${options.join(', ')}`,
      },
    ],
  });

  const content = response.content[0];
  if (content.type !== 'text') {
    throw new Error('Unexpected response type from Claude');
  }

  let jsonContent = content.text;
  const jsonMatch = jsonContent.match(/```json\n?([\s\S]*?)\n?```/);
  if (jsonMatch) {
    jsonContent = jsonMatch[1];
  }

  return JSON.parse(jsonContent);
}

// Generate weekly insights using Claude
export async function generateWeeklyInsightsWithClaude(
  weeklyData: {
    totalDecisions: number;
    completedDecisions: number;
    outcomeBreakdown: Record<string, number>;
    categoryBreakdown: Record<string, number>;
    avgConfidenceScore: number;
    avgTimeToDecide: number;
    moodPatterns: Record<string, number>;
    topBiases: string[];
  }
): Promise<{
  summary: string;
  insights: Array<{ title: string; description: string; priority: number }>;
  suggestions: string[];
  metrics: {
    successRate: number;
    fatigueScore: number;
    productivityScore: number;
  };
}> {
  const response = await anthropic.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 1500,
    messages: [
      {
        role: 'user',
        content: `You are a decision analytics expert. Analyze this user's weekly decision-making data and provide actionable insights. Respond in JSON only.

Weekly Data:
- Total decisions: ${weeklyData.totalDecisions}
- Completed decisions: ${weeklyData.completedDecisions}
- Outcome breakdown: ${JSON.stringify(weeklyData.outcomeBreakdown)}
- Category breakdown: ${JSON.stringify(weeklyData.categoryBreakdown)}
- Average confidence score: ${weeklyData.avgConfidenceScore}
- Average time to decide: ${weeklyData.avgTimeToDecide} seconds
- Mood patterns: ${JSON.stringify(weeklyData.moodPatterns)}
- Common biases identified: ${weeklyData.topBiases.join(', ')}

Respond with this JSON structure:
{
  "summary": "2-3 sentence overview of the week",
  "insights": [{"title": "string", "description": "string", "priority": 1-10}],
  "suggestions": ["actionable improvement suggestions"],
  "metrics": {
    "successRate": 0-100,
    "fatigueScore": 0-10,
    "productivityScore": 0-100
  }
}`,
      },
    ],
  });

  const content = response.content[0];
  if (content.type !== 'text') {
    throw new Error('Unexpected response type from Claude');
  }

  let jsonContent = content.text;
  const jsonMatch = jsonContent.match(/```json\n?([\s\S]*?)\n?```/);
  if (jsonMatch) {
    jsonContent = jsonMatch[1];
  }

  return JSON.parse(jsonContent);
}
