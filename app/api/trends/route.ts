import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// GET /api/trends - Get community trends (public, anonymous data)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const time_period = searchParams.get('period');

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    let query = supabase
      .from('community_trends')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (category) {
      query = query.eq('category', category);
    }

    if (time_period) {
      query = query.eq('time_period', time_period);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ trends: data });
  } catch (error) {
    console.error('GET /api/trends error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
