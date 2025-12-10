import OpenAI from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

// Types for AI analysis
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

// Main function to analyze a decision
export async function analyzeDecision(context: DecisionContext): Promise<AIAnalysisResult> {
  const systemPrompt = `You are an expert decision-making assistant. Your role is to analyze decisions objectively, identify potential biases, and provide ranked recommendations based on logical reasoning.

You must respond with valid JSON only, no additional text. Follow this exact structure:
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

Provide a thorough analysis with rankings, reasoning, and actionable recommendations.`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 2000,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from AI');
    }

    const result = JSON.parse(content) as AIAnalysisResult;
    
    // Validate the response structure
    if (!result.rankings || !Array.isArray(result.rankings)) {
      throw new Error('Invalid AI response structure');
    }

    return result;
  } catch (error) {
    console.error('AI Analysis Error:', error);
    throw new Error('Failed to analyze decision');
  }
}

// Function for quick micro-decision suggestions
export async function analyzeMicroDecision(
  question: string,
  options: string[]
): Promise<{ suggestion: string; reasoning: string }> {
  const response = await openai.chat.completions.create({
    model: 'gpt-4-turbo-preview',
    messages: [
      {
        role: 'system',
        content: `You are a quick decision helper. For simple daily choices, provide a brief suggestion and one-line reasoning. Respond in JSON format: {"suggestion": "option text", "reasoning": "brief reason"}`,
      },
      {
        role: 'user',
        content: `Quick decision: ${question}\nOptions: ${options.join(', ')}`,
      },
    ],
    temperature: 0.5,
    max_tokens: 200,
    response_format: { type: 'json_object' },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error('No response from AI');
  }

  return JSON.parse(content);
}

// Function to generate life hack suggestions based on user patterns
export async function generateLifeHackSuggestions(
  userPatterns: {
    commonCategories: string[];
    decisionFatigueScore: number;
    timeOfDayPatterns: Record<string, number>;
    successRateByCategory: Record<string, number>;
  }
): Promise<Array<{ title: string; description: string; category: string }>> {
  const response = await openai.chat.completions.create({
    model: 'gpt-4-turbo-preview',
    messages: [
      {
        role: 'system',
        content: `You are a productivity and life optimization expert. Based on user decision-making patterns, suggest personalized life hacks. Respond in JSON format: {"suggestions": [{"title": "string", "description": "string", "category": "string"}]}`,
      },
      {
        role: 'user',
        content: `Generate 3 personalized life hacks based on these patterns:
- Common decision categories: ${userPatterns.commonCategories.join(', ')}
- Decision fatigue score: ${userPatterns.decisionFatigueScore}/10
- Peak decision times: ${JSON.stringify(userPatterns.timeOfDayPatterns)}
- Success rates by category: ${JSON.stringify(userPatterns.successRateByCategory)}`,
      },
    ],
    temperature: 0.8,
    max_tokens: 500,
    response_format: { type: 'json_object' },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error('No response from AI');
  }

  const result = JSON.parse(content);
  return result.suggestions;
}

// Function to generate mood booster content
export async function generateMoodBooster(
  context: {
    currentMood: string;
    recentDecisionStress: number;
    timeOfDay: string;
  }
): Promise<{ type: string; content: string; duration?: string }> {
  const response = await openai.chat.completions.create({
    model: 'gpt-4-turbo-preview',
    messages: [
      {
        role: 'system',
        content: `You are a wellness assistant. Generate a brief, helpful mood booster appropriate for the context. Respond in JSON: {"type": "quote|activity|breathing|gratitude", "content": "string", "duration": "optional duration"}`,
      },
      {
        role: 'user',
        content: `User context:
- Current mood: ${context.currentMood}
- Recent decision stress level: ${context.recentDecisionStress}/10
- Time of day: ${context.timeOfDay}

Generate an appropriate mood booster.`,
      },
    ],
    temperature: 0.9,
    max_tokens: 200,
    response_format: { type: 'json_object' },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error('No response from AI');
  }

  return JSON.parse(content);
}
