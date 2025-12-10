-- ============================================
-- AI Decision-Making App - RLS Policies
-- ============================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outcomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_trends ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.micro_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.life_hacks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_life_hacks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mood_boosters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.decision_templates ENABLE ROW LEVEL SECURITY;

-- ============================================
-- PROFILES POLICIES
-- ============================================

-- Users can view their own profile
CREATE POLICY "Users can view own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Users can insert their own profile (handled by trigger, but backup)
CREATE POLICY "Users can insert own profile"
    ON public.profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

-- ============================================
-- DECISIONS POLICIES
-- ============================================

-- Users can view their own decisions
CREATE POLICY "Users can view own decisions"
    ON public.decisions FOR SELECT
    USING (auth.uid() = user_id);

-- Users can create their own decisions
CREATE POLICY "Users can create own decisions"
    ON public.decisions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can update their own decisions
CREATE POLICY "Users can update own decisions"
    ON public.decisions FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Users can delete their own decisions
CREATE POLICY "Users can delete own decisions"
    ON public.decisions FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================
-- OUTCOMES POLICIES
-- ============================================

-- Users can view their own outcomes
CREATE POLICY "Users can view own outcomes"
    ON public.outcomes FOR SELECT
    USING (auth.uid() = user_id);

-- Users can create outcomes for their decisions
CREATE POLICY "Users can create own outcomes"
    ON public.outcomes FOR INSERT
    WITH CHECK (
        auth.uid() = user_id AND
        EXISTS (
            SELECT 1 FROM public.decisions
            WHERE id = decision_id AND user_id = auth.uid()
        )
    );

-- Users can update their own outcomes
CREATE POLICY "Users can update own outcomes"
    ON public.outcomes FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Users can delete their own outcomes
CREATE POLICY "Users can delete own outcomes"
    ON public.outcomes FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================
-- INSIGHTS POLICIES
-- ============================================

-- Users can view their own insights
CREATE POLICY "Users can view own insights"
    ON public.insights FOR SELECT
    USING (auth.uid() = user_id);

-- System can create insights (service role only for now)
-- Users can update their own insights (mark as read, dismissed)
CREATE POLICY "Users can update own insights"
    ON public.insights FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Allow service role to insert insights
CREATE POLICY "Service role can insert insights"
    ON public.insights FOR INSERT
    WITH CHECK (auth.uid() = user_id OR auth.role() = 'service_role');

-- ============================================
-- COMMUNITY TRENDS POLICIES
-- ============================================

-- Everyone can view active community trends (anonymous aggregated data)
CREATE POLICY "Anyone can view active community trends"
    ON public.community_trends FOR SELECT
    USING (is_active = true);

-- Only service role can modify community trends
CREATE POLICY "Service role can manage community trends"
    ON public.community_trends FOR ALL
    USING (auth.role() = 'service_role');

-- ============================================
-- STREAKS POLICIES
-- ============================================

-- Users can view their own streaks
CREATE POLICY "Users can view own streaks"
    ON public.streaks FOR SELECT
    USING (auth.uid() = user_id);

-- Users can update their own streaks
CREATE POLICY "Users can update own streaks"
    ON public.streaks FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Allow service role to insert/update streaks
CREATE POLICY "Service role can manage streaks"
    ON public.streaks FOR ALL
    USING (auth.uid() = user_id OR auth.role() = 'service_role');

-- ============================================
-- MICRO-DECISIONS POLICIES
-- ============================================

-- Users can view their own micro-decisions
CREATE POLICY "Users can view own micro decisions"
    ON public.micro_decisions FOR SELECT
    USING (auth.uid() = user_id);

-- Users can create their own micro-decisions
CREATE POLICY "Users can create own micro decisions"
    ON public.micro_decisions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can update their own micro-decisions
CREATE POLICY "Users can update own micro decisions"
    ON public.micro_decisions FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Users can delete their own micro-decisions
CREATE POLICY "Users can delete own micro decisions"
    ON public.micro_decisions FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================
-- LIFE HACKS POLICIES
-- ============================================

-- Anyone authenticated can view life hacks
CREATE POLICY "Authenticated users can view life hacks"
    ON public.life_hacks FOR SELECT
    USING (auth.role() = 'authenticated');

-- Service role can manage life hacks
CREATE POLICY "Service role can manage life hacks"
    ON public.life_hacks FOR ALL
    USING (auth.role() = 'service_role');

-- ============================================
-- USER LIFE HACKS POLICIES
-- ============================================

-- Users can view their own saved life hacks
CREATE POLICY "Users can view own life hack interactions"
    ON public.user_life_hacks FOR SELECT
    USING (auth.uid() = user_id);

-- Users can save/interact with life hacks
CREATE POLICY "Users can create life hack interactions"
    ON public.user_life_hacks FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can update their life hack interactions
CREATE POLICY "Users can update own life hack interactions"
    ON public.user_life_hacks FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Users can delete their life hack interactions
CREATE POLICY "Users can delete own life hack interactions"
    ON public.user_life_hacks FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================
-- MOOD BOOSTERS POLICIES
-- ============================================

-- Users can view global boosters and their own boosters
CREATE POLICY "Users can view mood boosters"
    ON public.mood_boosters FOR SELECT
    USING (is_global = true OR auth.uid() = user_id);

-- Users can create their own mood boosters
CREATE POLICY "Users can create own mood boosters"
    ON public.mood_boosters FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can update their own mood boosters
CREATE POLICY "Users can update own mood boosters"
    ON public.mood_boosters FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Service role can manage all mood boosters
CREATE POLICY "Service role can manage mood boosters"
    ON public.mood_boosters FOR ALL
    USING (auth.role() = 'service_role');

-- ============================================
-- DECISION TEMPLATES POLICIES
-- ============================================

-- Users can view public templates and their own templates
CREATE POLICY "Users can view decision templates"
    ON public.decision_templates FOR SELECT
    USING (is_public = true OR auth.uid() = user_id);

-- Users can create their own templates
CREATE POLICY "Users can create own templates"
    ON public.decision_templates FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can update their own templates
CREATE POLICY "Users can update own templates"
    ON public.decision_templates FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Users can delete their own templates
CREATE POLICY "Users can delete own templates"
    ON public.decision_templates FOR DELETE
    USING (auth.uid() = user_id);
