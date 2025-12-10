export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string | null
          full_name: string | null
          avatar_url: string | null
          timezone: string
          preferences: Json
          streak_count: number
          total_decisions: number
          last_decision_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email?: string | null
          full_name?: string | null
          avatar_url?: string | null
          timezone?: string
          preferences?: Json
          streak_count?: number
          total_decisions?: number
          last_decision_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string | null
          full_name?: string | null
          avatar_url?: string | null
          timezone?: string
          preferences?: Json
          streak_count?: number
          total_decisions?: number
          last_decision_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      decisions: {
        Row: {
          id: string
          user_id: string
          title: string
          description: string | null
          category: string
          urgency: string
          options: Json
          chosen_option: Json | null
          ai_rankings: Json | null
          ai_reasoning: string | null
          ai_summary: string | null
          confidence_score: number | null
          decision_type: string
          is_micro: boolean
          mood_before: string | null
          mood_after: string | null
          time_to_decide: number | null
          is_completed: boolean
          completed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          description?: string | null
          category?: string
          urgency?: string
          options?: Json
          chosen_option?: Json | null
          ai_rankings?: Json | null
          ai_reasoning?: string | null
          ai_summary?: string | null
          confidence_score?: number | null
          decision_type?: string
          is_micro?: boolean
          mood_before?: string | null
          mood_after?: string | null
          time_to_decide?: number | null
          is_completed?: boolean
          completed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          description?: string | null
          category?: string
          urgency?: string
          options?: Json
          chosen_option?: Json | null
          ai_rankings?: Json | null
          ai_reasoning?: string | null
          ai_summary?: string | null
          confidence_score?: number | null
          decision_type?: string
          is_micro?: boolean
          mood_before?: string | null
          mood_after?: string | null
          time_to_decide?: number | null
          is_completed?: boolean
          completed_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      outcomes: {
        Row: {
          id: string
          decision_id: string
          user_id: string
          outcome_type: string
          outcome_score: number | null
          notes: string | null
          learned_lessons: string | null
          would_decide_same: boolean | null
          actual_vs_predicted: string | null
          follow_up_actions: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          decision_id: string
          user_id: string
          outcome_type: string
          outcome_score?: number | null
          notes?: string | null
          learned_lessons?: string | null
          would_decide_same?: boolean | null
          actual_vs_predicted?: string | null
          follow_up_actions?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          decision_id?: string
          user_id?: string
          outcome_type?: string
          outcome_score?: number | null
          notes?: string | null
          learned_lessons?: string | null
          would_decide_same?: boolean | null
          actual_vs_predicted?: string | null
          follow_up_actions?: Json
          created_at?: string
          updated_at?: string
        }
      }
      insights: {
        Row: {
          id: string
          user_id: string
          insight_type: string
          insight_title: string
          insight_text: string
          metrics: Json
          category: string | null
          period_start: string | null
          period_end: string | null
          action_items: Json
          is_read: boolean
          is_dismissed: boolean
          priority: number
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          insight_type: string
          insight_title: string
          insight_text: string
          metrics?: Json
          category?: string | null
          period_start?: string | null
          period_end?: string | null
          action_items?: Json
          is_read?: boolean
          is_dismissed?: boolean
          priority?: number
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          insight_type?: string
          insight_title?: string
          insight_text?: string
          metrics?: Json
          category?: string | null
          period_start?: string | null
          period_end?: string | null
          action_items?: Json
          is_read?: boolean
          is_dismissed?: boolean
          priority?: number
          created_at?: string
        }
      }
      community_trends: {
        Row: {
          id: string
          trend_title: string
          trend_description: string | null
          category: string
          metrics: Json
          sample_size: number
          time_period: string | null
          trend_data: Json
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          trend_title: string
          trend_description?: string | null
          category: string
          metrics?: Json
          sample_size?: number
          time_period?: string | null
          trend_data?: Json
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          trend_title?: string
          trend_description?: string | null
          category?: string
          metrics?: Json
          sample_size?: number
          time_period?: string | null
          trend_data?: Json
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      streaks: {
        Row: {
          id: string
          user_id: string
          streak_type: string
          current_count: number
          longest_count: number
          last_activity_at: string | null
          started_at: string
          broken_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          streak_type: string
          current_count?: number
          longest_count?: number
          last_activity_at?: string | null
          started_at?: string
          broken_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          streak_type?: string
          current_count?: number
          longest_count?: number
          last_activity_at?: string | null
          started_at?: string
          broken_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      micro_decisions: {
        Row: {
          id: string
          user_id: string
          question: string
          options: Json
          chosen_option: string | null
          ai_suggestion: string | null
          category: string
          response_time_ms: number | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          question: string
          options?: Json
          chosen_option?: string | null
          ai_suggestion?: string | null
          category?: string
          response_time_ms?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          question?: string
          options?: Json
          chosen_option?: string | null
          ai_suggestion?: string | null
          category?: string
          response_time_ms?: number | null
          created_at?: string
        }
      }
      life_hacks: {
        Row: {
          id: string
          title: string
          description: string
          category: string
          tags: Json
          effectiveness_score: number | null
          usage_count: number
          upvotes: number
          downvotes: number
          is_ai_generated: boolean
          source: string | null
          created_at: string
        }
        Insert: {
          id?: string
          title: string
          description: string
          category: string
          tags?: Json
          effectiveness_score?: number | null
          usage_count?: number
          upvotes?: number
          downvotes?: number
          is_ai_generated?: boolean
          source?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string
          category?: string
          tags?: Json
          effectiveness_score?: number | null
          usage_count?: number
          upvotes?: number
          downvotes?: number
          is_ai_generated?: boolean
          source?: string | null
          created_at?: string
        }
      }
      user_life_hacks: {
        Row: {
          id: string
          user_id: string
          life_hack_id: string
          is_saved: boolean
          is_tried: boolean
          rating: number | null
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          life_hack_id: string
          is_saved?: boolean
          is_tried?: boolean
          rating?: number | null
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          life_hack_id?: string
          is_saved?: boolean
          is_tried?: boolean
          rating?: number | null
          notes?: string | null
          created_at?: string
        }
      }
      mood_boosters: {
        Row: {
          id: string
          user_id: string | null
          booster_type: string
          content: Json
          category: string
          effectiveness_score: number
          times_shown: number
          times_helpful: number
          is_global: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          booster_type: string
          content: Json
          category?: string
          effectiveness_score?: number
          times_shown?: number
          times_helpful?: number
          is_global?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          booster_type?: string
          content?: Json
          category?: string
          effectiveness_score?: number
          times_shown?: number
          times_helpful?: number
          is_global?: boolean
          created_at?: string
        }
      }
      decision_templates: {
        Row: {
          id: string
          user_id: string | null
          title: string
          description: string | null
          category: string
          default_options: Json
          prompts: Json
          is_public: boolean
          usage_count: number
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          title: string
          description?: string | null
          category: string
          default_options?: Json
          prompts?: Json
          is_public?: boolean
          usage_count?: number
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          title?: string
          description?: string | null
          category?: string
          default_options?: Json
          prompts?: Json
          is_public?: boolean
          usage_count?: number
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}
