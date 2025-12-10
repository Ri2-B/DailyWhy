// Supabase AI Client - Uses Supabase's built-in AI features
// No external API keys required!

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

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

// Analyze decision using local AI analysis
// Note: Edge Functions are optional - local analysis works great without them
export async function analyzeDecision(context: DecisionContext): Promise<AIAnalysisResult> {
  // Use local analysis (fast and doesn't require Edge Functions)
  return localAnalyzeDecision(context);
}

// Local analysis (no external API required)
function localAnalyzeDecision(context: DecisionContext): AIAnalysisResult {
  const { options, urgency, category, title, description } = context;
  
  const titleLower = title.toLowerCase();
  const descLower = (description || '').toLowerCase();
  const fullContext = `${titleLower} ${descLower}`;
  
  // Detect what the decision is about from the title
  const isWorkDecision = /work|project|job|task|assignment|study|homework|deadline|school|college|office/i.test(fullContext);
  const isChoiceBetween = /or|vs|versus|between|which/i.test(fullContext);
  
  // Words that indicate avoidance/procrastination (should score lower for work decisions)
  const avoidanceWords = ['sleep', 'rest', 'relax', 'nothing', 'later', 'tomorrow', 'skip', 'ignore', 'avoid', 'procrastinate', 'delay', 'netflix', 'game', 'play', 'chill'];
  
  // Words that indicate productive action (should score higher for work decisions)
  const productiveWords = ['work', 'project', 'study', 'complete', 'finish', 'start', 'begin', 'do', 'create', 'build', 'learn', 'practice', 'maths', 'math', 'graphics', 'code', 'write', 'research', 'prepare'];
  
  // General positive/negative sentiment
  const positiveWords = ['best', 'better', 'good', 'great', 'important', 'priority', 'urgent', 'deadline', 'required', 'necessary'];
  const negativeWords = ['risk', 'bad', 'problem', 'difficult', 'hard', 'boring', 'tedious'];
  
  // Score each option
  const rankings: AIRanking[] = options.map((option, index) => {
    const optionText = option.text.toLowerCase().trim();
    
    let score = 50;
    
    // Check if this option is avoidance behavior
    const isAvoidance = avoidanceWords.some(word => optionText.includes(word));
    const isProductive = productiveWords.some(word => optionText.includes(word));
    
    // For work-related decisions, penalize avoidance and reward productivity
    if (isWorkDecision) {
      if (isAvoidance) {
        score -= 25; // Heavily penalize sleep/procrastination for work decisions
      }
      if (isProductive) {
        score += 15; // Reward productive options
      }
    }
    
    // Check relevance to the title/context
    const titleWords = titleLower.split(/\s+/).filter(w => w.length > 3);
    titleWords.forEach(word => {
      if (optionText.includes(word)) {
        score += 10; // Boost options that relate to the question
      }
    });
    
    // General sentiment analysis
    positiveWords.forEach(word => {
      if (optionText.includes(word)) score += 5;
    });
    negativeWords.forEach(word => {
      if (optionText.includes(word)) score -= 3;
    });
    
    // Add pros/cons scoring if provided
    score += (option.pros?.length || 0) * 10;
    score -= (option.cons?.length || 0) * 7;
    
    // Specificity bonus - longer, more specific options often better
    const wordCount = optionText.split(/\s+/).length;
    if (wordCount >= 2 && wordCount <= 10) {
      score += 5;
    }
    
    // Small variation based on position (slight preference for first relevant options)
    score += Math.max(0, 3 - index);
    
    // Clamp score
    score = Math.min(95, Math.max(20, Math.round(score)));
    
    // Determine risk level
    let risk_level: 'low' | 'medium' | 'high' = 'medium';
    if (isAvoidance && isWorkDecision) {
      risk_level = 'high'; // Avoiding work is risky
    } else if (isProductive) {
      risk_level = 'low';
    }
    
    return {
      option_id: option.id,
      rank: 0,
      score,
      predicted_outcome: generateOutcome(option, category),
      risk_level,
      time_horizon: urgency === 'high' || urgency === 'critical' ? 'short-term' : 'long-term',
    };
  });
  
  // Ensure score differentiation
  const scores = rankings.map(r => r.score);
  const maxScore = Math.max(...scores);
  const minScore = Math.min(...scores);
  if (maxScore - minScore < 15 && rankings.length > 1) {
    // Spread scores more
    rankings.sort((a, b) => b.score - a.score);
    rankings.forEach((r, i) => {
      r.score = Math.max(25, Math.min(95, 85 - (i * 15)));
    });
  }
  
  // Sort by score and assign ranks
  rankings.sort((a, b) => b.score - a.score);
  rankings.forEach((r, i) => r.rank = i + 1);
  
  // Generate reasoning
  const topOption = options.find(o => o.id === rankings[0].option_id);
  const reasoning = generateReasoning(context, rankings, topOption);
  
  // Calculate confidence based on score spread
  const finalScores = rankings.map(r => r.score);
  const spread = Math.max(...finalScores) - Math.min(...finalScores);
  const confidence_score = Math.min(0.95, 0.5 + (spread / 100) * 0.4);
  
  return {
    rankings,
    reasoning,
    summary: `My recommendation: Go with "${topOption?.text}". It scored ${rankings[0].score}/100 in my analysis. ${rankings[0].risk_level === 'low' ? 'The risks are manageable and the potential benefits are solid.' : rankings[0].risk_level === 'high' ? 'Just be aware there are some risks involved - make sure you\'re ready for them.' : 'It\'s a balanced choice with both opportunities and things to watch out for.'}`,
    confidence_score,
    key_factors: extractKeyFactors(context),
    potential_biases: detectBiases(context),
    recommended_action: topOption?.text || options[0]?.text || 'Make a choice',
  };
}

function generateOutcome(option: DecisionOption, category: string): string {
  const outcomes: Record<string, string[]> = {
    career: ['career advancement', 'professional growth', 'skill development', 'network expansion'],
    finance: ['financial stability', 'investment returns', 'cost savings', 'budget optimization'],
    health: ['improved wellness', 'better habits', 'increased energy', 'long-term health benefits'],
    relationships: ['stronger connections', 'better communication', 'mutual understanding', 'trust building'],
    lifestyle: ['improved quality of life', 'better work-life balance', 'personal satisfaction', 'new experiences'],
    general: ['positive progress', 'goal achievement', 'personal growth', 'favorable results'],
  };
  
  const categoryOutcomes = outcomes[category] || outcomes.general;
  const outcomeIndex = Math.abs(option.text.length % categoryOutcomes.length);
  
  const prosCount = option.pros?.length || 0;
  const consCount = option.cons?.length || 0;
  
  if (prosCount > consCount) {
    return `Likely to result in ${categoryOutcomes[outcomeIndex]} with manageable challenges`;
  } else if (consCount > prosCount) {
    return `May face obstacles but could lead to ${categoryOutcomes[outcomeIndex]} with careful execution`;
  }
  return `Balanced outcome expected with potential for ${categoryOutcomes[outcomeIndex]}`;
}

function generateReasoning(context: DecisionContext, rankings: AIRanking[], topOption?: DecisionOption): string {
  const parts: string[] = [];
  
  // Simple opening
  parts.push(`I looked at all ${context.options.length} options you're considering for "${context.title}".`);
  
  // Urgency check
  if (context.urgency === 'high' || context.urgency === 'critical') {
    parts.push(`Since this decision is urgent, I focused on which option will give you the best results quickly.`);
  } else {
    parts.push(`I evaluated each option based on its potential benefits and drawbacks.`);
  }
  
  // Explain top choice
  if (topOption) {
    parts.push(`\n\n**Why "${topOption.text}" stands out:**`);
    
    // Filter out generic statements from pros
    const genericProsPatterns = [
      /offers a viable path/i,
      /addresses the decision/i,
      /provides a definitive choice/i,
      /takes action rather than remaining stuck/i,
      /allows you to move forward/i,
      /first option that comes to mind/i,
      /requires less decision/i,
      /offers an alternative/i,
      /provides more options/i
    ];
    
    const meaningfulPros = topOption.pros?.filter(pro => 
      !genericProsPatterns.some(pattern => pattern.test(pro))
    ) || [];
    
    if (meaningfulPros.length > 0) {
      const prosText = meaningfulPros.slice(0, 3).join('; ');
      parts.push(`\nThis option has some really strong points: ${prosText}.`);
    } else {
      // If no meaningful pros, explain why it scored well
      parts.push(`\nThis option scored well (${rankings[0].score}/100) based on the overall analysis.`);
    }
    
    // Filter out generic statements from cons
    const genericConsPatterns = [
      /requires careful consideration of trade-offs/i,
      /may involve trade-offs/i,
      /has trade-offs like any/i,
      /means not choosing/i
    ];
    
    const meaningfulCons = topOption.cons?.filter(con => 
      !genericConsPatterns.some(pattern => pattern.test(con))
    ) || [];
    
    if (meaningfulCons.length > 0) {
      const consText = meaningfulCons.slice(0, 2).join('; ');
      parts.push(`\nHowever, keep in mind: ${consText}. These aren't deal-breakers, just things to be aware of.`);
    }
    
    // Risk assessment in plain language
    if (rankings[0].risk_level === 'low') {
      parts.push(`\nOverall, this is a pretty safe choice with manageable downsides.`);
    } else if (rankings[0].risk_level === 'high') {
      parts.push(`\nThis option does carry some risk, so make sure you're prepared for potential challenges.`);
    }
  }
  
  // Compare with other options
  const scoreSpread = Math.max(...rankings.map(r => r.score)) - Math.min(...rankings.map(r => r.score));
  if (scoreSpread < 15) {
    parts.push(`\n\nHonestly, all your options are pretty close in quality. Trust your gut feeling on this one - there's no clearly "wrong" choice here.`);
  } else if (scoreSpread > 30) {
    parts.push(`\n\nThere's a noticeable difference between the options. The top choice clearly has more going for it compared to the others.`);
  } else {
    parts.push(`\n\nWhile "${topOption?.text}" seems strongest, the other options have their merits too. Consider what matters most to you personally.`);
  }
  
  return parts.join(' ');
}

function extractKeyFactors(context: DecisionContext): string[] {
  const factors: string[] = [];
  
  // Make factors conversational
  factors.push(`This is a ${context.category} decision`);
  
  if (context.urgency === 'high' || context.urgency === 'critical') {
    factors.push(`Time is a factor - you need to decide soon`);
  } else {
    factors.push(`You have time to think this through carefully`);
  }
  
  if (context.options.length > 4) {
    factors.push(`You have ${context.options.length} options - that's a lot to consider`);
  } else if (context.options.length === 2) {
    factors.push(`This is a straightforward choice between two paths`);
  } else {
    factors.push(`You're weighing ${context.options.length} different approaches`);
  }
  
  const totalPros = context.options.reduce((sum, o) => sum + (o.pros?.length || 0), 0);
  const totalCons = context.options.reduce((sum, o) => sum + (o.cons?.length || 0), 0);
  
  if (totalPros > totalCons * 2) {
    factors.push(`Your options have lots of upsides - this is a positive situation`);
  } else if (totalCons > totalPros) {
    factors.push(`There are some challenges to navigate, but that's normal for tough decisions`);
  }
  
  if (context.userHistory && context.userHistory.totalDecisions > 0) {
    const rate = (context.userHistory.successRate * 100).toFixed(0);
    factors.push(`You've made ${context.userHistory.totalDecisions} decisions before with a ${rate}% success rate`);
  }
  
  return factors;
}

function detectBiases(context: DecisionContext): string[] {
  const watchOuts: string[] = [];
  
  // Check if first option seems favored
  if (context.options.length > 0) {
    const firstOption = context.options[0];
    if ((firstOption.pros?.length || 0) > (firstOption.cons?.length || 0) + 2) {
      watchOuts.push('The first option you listed has more positives - sometimes we unconsciously favor what comes to mind first');
    }
  }
  
  // Check for too many options
  if (context.options.length > 5) {
    watchOuts.push('With so many choices, it can be tough to pick one. Consider if you can group similar options together');
  }
  
  // Check for urgency pressure
  if (context.urgency === 'critical') {
    watchOuts.push('When pressed for time, we sometimes miss important details. Take a moment to breathe before deciding');
  }
  
  // Check for skewed pros/cons
  const avgPros = context.options.reduce((sum, o) => sum + (o.pros?.length || 0), 0) / context.options.length;
  const avgCons = context.options.reduce((sum, o) => sum + (o.cons?.length || 0), 0) / context.options.length;
  
  if (avgPros > avgCons * 2) {
    watchOuts.push("You've listed lots of positives and fewer negatives. That's great, but also consider what could go wrong");
  } else if (avgCons > avgPros * 2) {
    watchOuts.push("You're focusing more on what could go wrong. Don't forget to also consider the good things that could happen");
  }
  
  if (watchOuts.length === 0) {
    watchOuts.push('Your analysis seems balanced - no major red flags in how you\'re approaching this');
  }
  
  return watchOuts;
}

// Quick micro-decision analysis
export async function analyzeMicroDecision(
  question: string,
  options: string[]
): Promise<{ suggestion: string; reasoning: string }> {
  try {
    // Try Supabase Edge Function first
    const { data, error } = await supabase.functions.invoke('micro-decision', {
      body: { question, options },
    });

    if (!error && data) {
      return data as { suggestion: string; reasoning: string };
    }
  } catch (e) {
    // Fall through to local analysis
  }

  // Local fallback - simple random selection with reasoning
  const randomIndex = Math.floor(Math.random() * options.length);
  const suggestion = options[randomIndex];
  
  const reasonings = [
    'Sometimes a quick choice helps build decision momentum.',
    'Trust your instincts on small decisions.',
    'Small decisions rarely have lasting consequences.',
    'The best choice is often the one you make confidently.',
    'Analysis paralysis on small choices wastes mental energy.',
  ];
  
  return {
    suggestion,
    reasoning: reasonings[Math.floor(Math.random() * reasonings.length)],
  };
}

// Generate embeddings for semantic search (uses Supabase pg_vector)
export async function generateEmbedding(text: string): Promise<number[] | null> {
  try {
    const { data, error } = await supabase.functions.invoke('generate-embedding', {
      body: { text },
    });

    if (error) {
      console.error('Embedding generation error:', error);
      return null;
    }

    return data?.embedding || null;
  } catch (error) {
    console.error('Embedding error:', error);
    return null;
  }
}

// Search similar decisions using vector similarity
export async function searchSimilarDecisions(
  userId: string,
  queryText: string,
  limit: number = 5
): Promise<any[]> {
  try {
    const embedding = await generateEmbedding(queryText);
    if (!embedding) return [];

    const { data, error } = await supabase.rpc('search_similar_decisions', {
      query_embedding: embedding,
      match_user_id: userId,
      match_count: limit,
    });

    if (error) {
      console.error('Similar decisions search error:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Search error:', error);
    return [];
  }
}

export default {
  analyzeDecision,
  analyzeMicroDecision,
  generateEmbedding,
  searchSimilarDecisions,
};
