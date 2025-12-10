-- ============================================
-- HABIT TRACKING TABLES
-- ============================================

-- Habits table - User-defined habits to track
CREATE TABLE IF NOT EXISTS public.habits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT DEFAULT 'general', -- health, productivity, learning, social, etc.
    target_frequency TEXT NOT NULL, -- daily, weekly, custom
    target_count INTEGER DEFAULT 1, -- How many times per frequency period
    is_active BOOLEAN DEFAULT TRUE,
    color TEXT DEFAULT '#50C2B8', -- UI color for the habit
    icon TEXT, -- Icon identifier
    reminder_enabled BOOLEAN DEFAULT FALSE,
    reminder_time TIME,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habit entries - Individual logs of habit completion
CREATE TABLE IF NOT EXISTS public.habit_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    habit_id UUID NOT NULL REFERENCES public.habits(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    decision_id UUID REFERENCES public.decisions(id) ON DELETE SET NULL, -- Link to related decision
    completed_at TIMESTAMPTZ DEFAULT NOW(),
    notes TEXT,
    mood TEXT, -- How they felt during/after
    difficulty_rating INTEGER CHECK (difficulty_rating >= 1 AND difficulty_rating <= 5),
    success_factors TEXT[], -- What helped them succeed
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habit insights - Generated analysis of habit patterns
CREATE TABLE IF NOT EXISTS public.habit_insights (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    habit_id UUID REFERENCES public.habits(id) ON DELETE CASCADE, -- NULL for general insights
    insight_type TEXT NOT NULL, -- success_pattern, failure_pattern, streak_analysis, correlation
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    data JSONB DEFAULT '{}', -- Supporting data for the insight
    actionable_tips TEXT[], -- Specific recommendations
    confidence_score DECIMAL(3,2), -- How confident we are in this insight
    period_start TIMESTAMPTZ,
    period_end TIMESTAMPTZ,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Decision-Habit links - Track which decisions are habit-related
CREATE TABLE IF NOT EXISTS public.decision_habits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    decision_id UUID NOT NULL REFERENCES public.decisions(id) ON DELETE CASCADE,
    habit_id UUID REFERENCES public.habits(id) ON DELETE SET NULL,
    is_habit_forming BOOLEAN DEFAULT TRUE, -- Building the habit vs breaking it
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(decision_id, habit_id)
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_habits_user_id ON public.habits(user_id);
CREATE INDEX IF NOT EXISTS idx_habits_active ON public.habits(is_active);
CREATE INDEX IF NOT EXISTS idx_habit_entries_habit_id ON public.habit_entries(habit_id);
CREATE INDEX IF NOT EXISTS idx_habit_entries_user_id ON public.habit_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_habit_entries_completed_at ON public.habit_entries(completed_at DESC);
CREATE INDEX IF NOT EXISTS idx_habit_entries_decision_id ON public.habit_entries(decision_id);
CREATE INDEX IF NOT EXISTS idx_habit_insights_user_id ON public.habit_insights(user_id);
CREATE INDEX IF NOT EXISTS idx_habit_insights_habit_id ON public.habit_insights(habit_id);
CREATE INDEX IF NOT EXISTS idx_decision_habits_decision_id ON public.decision_habits(decision_id);

-- ============================================
-- RLS POLICIES
-- ============================================
ALTER TABLE public.habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.habit_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.habit_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.decision_habits ENABLE ROW LEVEL SECURITY;

-- Habits policies
CREATE POLICY "Users can view own habits" ON public.habits FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own habits" ON public.habits FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own habits" ON public.habits FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own habits" ON public.habits FOR DELETE USING (auth.uid() = user_id);

-- Habit entries policies
CREATE POLICY "Users can view own habit entries" ON public.habit_entries FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own habit entries" ON public.habit_entries FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own habit entries" ON public.habit_entries FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own habit entries" ON public.habit_entries FOR DELETE USING (auth.uid() = user_id);

-- Habit insights policies
CREATE POLICY "Users can view own habit insights" ON public.habit_insights FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own habit insights" ON public.habit_insights FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own habit insights" ON public.habit_insights FOR UPDATE USING (auth.uid() = user_id);

-- Decision habits policies
CREATE POLICY "Users can view own decision habits" ON public.decision_habits 
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.decisions 
            WHERE decisions.id = decision_habits.decision_id 
            AND decisions.user_id = auth.uid()
        )
    );
CREATE POLICY "Users can create decision habits" ON public.decision_habits 
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.decisions 
            WHERE decisions.id = decision_habits.decision_id 
            AND decisions.user_id = auth.uid()
        )
    );

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to update habit streak
CREATE OR REPLACE FUNCTION update_habit_streak()
RETURNS TRIGGER AS $$
DECLARE
    habit_streak_record RECORD;
    days_since_last INTEGER;
BEGIN
    -- Get or create streak record for this habit
    SELECT * INTO habit_streak_record
    FROM public.streaks
    WHERE user_id = NEW.user_id 
    AND streak_type = CONCAT('habit_', NEW.habit_id::TEXT)
    LIMIT 1;
    
    IF habit_streak_record IS NULL THEN
        -- Create new streak record
        INSERT INTO public.streaks (user_id, streak_type, current_count, longest_count, last_activity_at)
        VALUES (NEW.user_id, CONCAT('habit_', NEW.habit_id::TEXT), 1, 1, NEW.completed_at);
    ELSE
        -- Calculate days since last activity
        days_since_last := EXTRACT(DAY FROM (NEW.completed_at - habit_streak_record.last_activity_at));
        
        IF days_since_last <= 1 THEN
            -- Streak continues
            UPDATE public.streaks
            SET 
                current_count = current_count + 1,
                longest_count = GREATEST(longest_count, current_count + 1),
                last_activity_at = NEW.completed_at
            WHERE id = habit_streak_record.id;
        ELSE
            -- Streak broken, restart
            UPDATE public.streaks
            SET 
                current_count = 1,
                last_activity_at = NEW.completed_at,
                broken_at = NEW.completed_at
            WHERE id = habit_streak_record.id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update habit streaks
CREATE TRIGGER on_habit_entry_created
    AFTER INSERT ON public.habit_entries
    FOR EACH ROW EXECUTE FUNCTION update_habit_streak();

-- Function to generate habit insights
CREATE OR REPLACE FUNCTION generate_habit_insights(target_user_id UUID)
RETURNS VOID AS $$
DECLARE
    habit_record RECORD;
    success_rate DECIMAL;
    total_attempts INTEGER;
    successful_attempts INTEGER;
BEGIN
    -- Analyze each active habit
    FOR habit_record IN 
        SELECT * FROM public.habits 
        WHERE user_id = target_user_id AND is_active = TRUE
    LOOP
        -- Count entries for this habit in the last 30 days
        SELECT COUNT(*) INTO total_attempts
        FROM public.habit_entries
        WHERE habit_id = habit_record.id
        AND completed_at >= NOW() - INTERVAL '30 days';
        
        IF total_attempts > 0 THEN
            -- Analyze success patterns
            SELECT COUNT(*) INTO successful_attempts
            FROM public.habit_entries
            WHERE habit_id = habit_record.id
            AND completed_at >= NOW() - INTERVAL '30 days'
            AND difficulty_rating <= 3; -- Consider ratings 1-3 as successful
            
            success_rate := successful_attempts::DECIMAL / total_attempts;
            
            -- Generate insights based on patterns
            IF success_rate >= 0.8 THEN
                INSERT INTO public.habit_insights (
                    user_id, habit_id, insight_type, title, description, 
                    confidence_score, period_start, period_end, actionable_tips
                ) VALUES (
                    target_user_id,
                    habit_record.id,
                    'success_pattern',
                    'Strong Habit Established',
                    FORMAT('You''ve maintained a %s%% success rate with "%s" over the past 30 days. This habit is well-established!', 
                        ROUND(success_rate * 100), habit_record.name),
                    0.95,
                    NOW() - INTERVAL '30 days',
                    NOW(),
                    ARRAY['Keep up the excellent consistency', 'Consider increasing the challenge or frequency']
                );
            ELSIF success_rate < 0.5 THEN
                INSERT INTO public.habit_insights (
                    user_id, habit_id, insight_type, title, description,
                    confidence_score, period_start, period_end, actionable_tips
                ) VALUES (
                    target_user_id,
                    habit_record.id,
                    'failure_pattern',
                    'Habit Needs Attention',
                    FORMAT('Your success rate with "%s" is %s%%. Let''s identify what''s blocking your progress.',
                        habit_record.name, ROUND(success_rate * 100)),
                    0.90,
                    NOW() - INTERVAL '30 days',
                    NOW(),
                    ARRAY['Review what makes this habit difficult', 'Consider reducing the frequency or intensity', 'Link it to an existing routine']
                );
            END IF;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update habits table timestamp
CREATE TRIGGER update_habits_updated_at
    BEFORE UPDATE ON public.habits
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
