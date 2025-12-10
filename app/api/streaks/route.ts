import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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

// GET /api/streaks - Get user's streaks
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const { data, error } = await supabase
      .from('streaks')
      .select('*')
      .eq('user_id', user.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Calculate overall habit score (average of all streak percentages)
    type StreakData = { current_count: number; longest_count: number };
    let habitScore = 0;
    if (data && data.length > 0) {
      const avgStreak = data.reduce((sum: number, s: StreakData) => sum + s.current_count, 0) / data.length;
      const avgLongest = data.reduce((sum: number, s: StreakData) => sum + s.longest_count, 0) / data.length;
      habitScore = avgLongest > 0 ? Math.min((avgStreak / avgLongest) * 100, 100) : 0;
    }

    return NextResponse.json({
      streaks: data,
      habitScore: Math.round(habitScore),
    });
  } catch (error) {
    console.error('GET /api/streaks error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/streaks - Manually record streak activity
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { streak_type } = body;

    if (!streak_type) {
      return NextResponse.json(
        { error: 'streak_type is required' },
        { status: 400 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get current streak
    const { data: currentStreak, error: fetchError } = await supabase
      .from('streaks')
      .select('*')
      .eq('user_id', user.id)
      .eq('streak_type', streak_type)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    const now = new Date();
    const today = now.toISOString().split('T')[0];

    if (currentStreak) {
      const lastActivity = currentStreak.last_activity_at 
        ? new Date(currentStreak.last_activity_at).toISOString().split('T')[0]
        : null;

      // If already recorded today, just return current streak
      if (lastActivity === today) {
        return NextResponse.json({ streak: currentStreak });
      }

      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      let newCount = currentStreak.current_count;
      let broken = false;

      if (lastActivity === yesterdayStr || !lastActivity) {
        // Streak continues
        newCount = currentStreak.current_count + 1;
      } else {
        // Streak broken, reset
        newCount = 1;
        broken = true;
      }

      const { data: updatedStreak, error: updateError } = await supabase
        .from('streaks')
        .update({
          current_count: newCount,
          longest_count: Math.max(currentStreak.longest_count, newCount),
          last_activity_at: now.toISOString(),
          broken_at: broken ? now.toISOString() : currentStreak.broken_at,
        })
        .eq('id', currentStreak.id)
        .select()
        .single();

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }

      return NextResponse.json({ streak: updatedStreak, broken });
    } else {
      // Create new streak
      const { data: newStreak, error: insertError } = await supabase
        .from('streaks')
        .insert({
          user_id: user.id,
          streak_type,
          current_count: 1,
          longest_count: 1,
          last_activity_at: now.toISOString(),
        })
        .select()
        .single();

      if (insertError) {
        return NextResponse.json({ error: insertError.message }, { status: 500 });
      }

      return NextResponse.json({ streak: newStreak });
    }
  } catch (error) {
    console.error('POST /api/streaks error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
