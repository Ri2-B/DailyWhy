-- ============================================
-- AI Decision-Making App - Database Schema
-- ============================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- USERS TABLE (extends Supabase auth.users)
-- ============================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE,
    full_name TEXT,
    avatar_url TEXT,
    timezone TEXT DEFAULT 'UTC',
    preferences JSONB DEFAULT '{}',
    streak_count INTEGER DEFAULT 0,
    total_decisions INTEGER DEFAULT 0,
    last_decision_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- DECISIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.decisions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    category TEXT DEFAULT 'general', -- work, personal, health, finance, relationships, etc.
    urgency TEXT DEFAULT 'medium', -- low, medium, high, critical
    options JSONB NOT NULL DEFAULT '[]', -- Array of {id, text, pros, cons}
    chosen_option JSONB, -- The option user selected {id, text}
    ai_rankings JSONB, -- Array of {option_id, rank, score, predicted_outcome}
    ai_reasoning TEXT,
    ai_summary TEXT,
    confidence_score DECIMAL(3,2), -- 0.00 to 1.00
    decision_type TEXT DEFAULT 'standard', -- standard, micro, recurring
    is_micro BOOLEAN DEFAULT FALSE,
    mood_before TEXT, -- happy, neutral, stressed, anxious, confident
    mood_after TEXT,
    time_to_decide INTEGER, -- seconds taken to make decision
    is_completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- OUTCOMES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.outcomes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    decision_id UUID NOT NULL REFERENCES public.decisions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    outcome_type TEXT NOT NULL, -- positive, negative, neutral, mixed
    outcome_score INTEGER CHECK (outcome_score >= 1 AND outcome_score <= 10), -- 1-10 scale
    notes TEXT,
    learned_lessons TEXT,
    would_decide_same BOOLEAN,
    actual_vs_predicted TEXT, -- better, worse, as_expected
    follow_up_actions JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INSIGHTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.insights (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    insight_type TEXT NOT NULL, -- weekly, monthly, category, pattern, suggestion
    insight_title TEXT NOT NULL,
    insight_text TEXT NOT NULL,
    metrics JSONB DEFAULT '{}', -- {success_rate, fatigue_score, bias_analysis, etc.}
    category TEXT, -- which category this insight relates to
    period_start TIMESTAMPTZ,
    period_end TIMESTAMPTZ,
    action_items JSONB DEFAULT '[]', -- Suggested actions
    is_read BOOLEAN DEFAULT FALSE,
    is_dismissed BOOLEAN DEFAULT FALSE,
    priority INTEGER DEFAULT 5, -- 1-10
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- COMMUNITY TRENDS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.community_trends (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trend_title TEXT NOT NULL,
    trend_description TEXT,
    category TEXT NOT NULL,
    metrics JSONB DEFAULT '{}', -- {total_decisions, avg_confidence, popular_options, etc.}
    sample_size INTEGER DEFAULT 0,
    time_period TEXT, -- daily, weekly, monthly
    trend_data JSONB DEFAULT '[]', -- Time series data
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- STREAKS & HABITS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.streaks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    streak_type TEXT NOT NULL, -- daily_decision, weekly_review, outcome_tracking
    current_count INTEGER DEFAULT 0,
    longest_count INTEGER DEFAULT 0,
    last_activity_at TIMESTAMPTZ,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    broken_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- MICRO-DECISIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.micro_decisions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    options JSONB NOT NULL DEFAULT '[]', -- Simple array of options
    chosen_option TEXT,
    ai_suggestion TEXT,
    category TEXT DEFAULT 'quick',
    response_time_ms INTEGER, -- How fast user decided
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- LIFE HACKS & SUGGESTIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.life_hacks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL,
    tags JSONB DEFAULT '[]',
    effectiveness_score DECIMAL(3,2), -- Based on user feedback
    usage_count INTEGER DEFAULT 0,
    upvotes INTEGER DEFAULT 0,
    downvotes INTEGER DEFAULT 0,
    is_ai_generated BOOLEAN DEFAULT FALSE,
    source TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- USER LIFE HACK INTERACTIONS
-- ============================================
CREATE TABLE IF NOT EXISTS public.user_life_hacks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    life_hack_id UUID NOT NULL REFERENCES public.life_hacks(id) ON DELETE CASCADE,
    is_saved BOOLEAN DEFAULT FALSE,
    is_tried BOOLEAN DEFAULT FALSE,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, life_hack_id)
);

-- ============================================
-- MOOD BOOSTERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.mood_boosters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE, -- NULL for global boosters
    booster_type TEXT NOT NULL, -- quote, activity, breathing, gratitude, music
    content JSONB NOT NULL, -- {text, url, duration, instructions, etc.}
    category TEXT DEFAULT 'general',
    effectiveness_score DECIMAL(3,2) DEFAULT 0.5,
    times_shown INTEGER DEFAULT 0,
    times_helpful INTEGER DEFAULT 0,
    is_global BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- DECISION TEMPLATES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.decision_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE, -- NULL for global templates
    title TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL,
    default_options JSONB DEFAULT '[]',
    prompts JSONB DEFAULT '[]', -- Guiding questions
    is_public BOOLEAN DEFAULT FALSE,
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_decisions_user_id ON public.decisions(user_id);
CREATE INDEX IF NOT EXISTS idx_decisions_created_at ON public.decisions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_decisions_category ON public.decisions(category);
CREATE INDEX IF NOT EXISTS idx_decisions_user_created ON public.decisions(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_outcomes_decision_id ON public.outcomes(decision_id);
CREATE INDEX IF NOT EXISTS idx_outcomes_user_id ON public.outcomes(user_id);
CREATE INDEX IF NOT EXISTS idx_outcomes_created_at ON public.outcomes(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_insights_user_id ON public.insights(user_id);
CREATE INDEX IF NOT EXISTS idx_insights_type ON public.insights(insight_type);
CREATE INDEX IF NOT EXISTS idx_insights_created_at ON public.insights(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_streaks_user_id ON public.streaks(user_id);
CREATE INDEX IF NOT EXISTS idx_micro_decisions_user_id ON public.micro_decisions(user_id);

CREATE INDEX IF NOT EXISTS idx_community_trends_category ON public.community_trends(category);
CREATE INDEX IF NOT EXISTS idx_community_trends_active ON public.community_trends(is_active);

-- Full-text search index for decisions
CREATE INDEX IF NOT EXISTS idx_decisions_title_search ON public.decisions USING gin(to_tsvector('english', title));

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to handle new user profile creation
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, avatar_url)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        NEW.raw_user_meta_data->>'avatar_url'
    );
    
    -- Create default streaks for new user
    INSERT INTO public.streaks (user_id, streak_type) VALUES
        (NEW.id, 'daily_decision'),
        (NEW.id, 'weekly_review'),
        (NEW.id, 'outcome_tracking');
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update user stats after decision
CREATE OR REPLACE FUNCTION update_user_decision_stats()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.profiles
    SET 
        total_decisions = total_decisions + 1,
        last_decision_at = NOW(),
        updated_at = NOW()
    WHERE id = NEW.user_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update streak on decision
CREATE OR REPLACE FUNCTION update_decision_streak()
RETURNS TRIGGER AS $$
DECLARE
    last_activity TIMESTAMPTZ;
    current_streak INTEGER;
BEGIN
    -- Get current streak info
    SELECT last_activity_at, current_count INTO last_activity, current_streak
    FROM public.streaks
    WHERE user_id = NEW.user_id AND streak_type = 'daily_decision';
    
    -- Check if streak continues or breaks
    IF last_activity IS NULL OR DATE(last_activity) = DATE(NOW() - INTERVAL '1 day') THEN
        -- Streak continues
        UPDATE public.streaks
        SET 
            current_count = current_count + 1,
            longest_count = GREATEST(longest_count, current_count + 1),
            last_activity_at = NOW(),
            updated_at = NOW()
        WHERE user_id = NEW.user_id AND streak_type = 'daily_decision';
    ELSIF DATE(last_activity) < DATE(NOW() - INTERVAL '1 day') THEN
        -- Streak broken, reset
        UPDATE public.streaks
        SET 
            current_count = 1,
            last_activity_at = NOW(),
            broken_at = NOW(),
            updated_at = NOW()
        WHERE user_id = NEW.user_id AND streak_type = 'daily_decision';
    END IF;
    -- If same day, don't update streak count
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- TRIGGERS
-- ============================================

-- Auto-update updated_at
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_decisions_updated_at
    BEFORE UPDATE ON public.decisions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_outcomes_updated_at
    BEFORE UPDATE ON public.outcomes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_streaks_updated_at
    BEFORE UPDATE ON public.streaks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Auto-create profile for new users
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Update user stats on new decision
CREATE TRIGGER on_decision_created
    AFTER INSERT ON public.decisions
    FOR EACH ROW EXECUTE FUNCTION update_user_decision_stats();

-- Update streak on new decision
CREATE TRIGGER on_decision_streak_update
    AFTER INSERT ON public.decisions
    FOR EACH ROW EXECUTE FUNCTION update_decision_streak();
