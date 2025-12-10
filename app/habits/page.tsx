"use client"

import { motion } from "framer-motion"
import { useState, useEffect } from "react"
import { createBrowserClient } from "@supabase/ssr"
import { AnimatedBackground } from "@/components/ui/animated-background"
import { Sidebar } from "@/components/layout/sidebar"
import { Navbar } from "@/components/layout/navbar"
import { GradientButton } from "@/components/ui/gradient-button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { 
  Target, TrendingUp, CheckCircle2, Plus, Flame, Calendar,
  Trophy, Activity, Zap, X, Loader2, Edit, Trash2, AlertCircle
} from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"

interface Habit {
  id: string
  name: string
  description: string
  category: string
  target_frequency: string
  target_count: number
  is_active: boolean
  color: string
  created_at: string
}

interface HabitEntry {
  id: string
  habit_id: string
  completed_at: string
  notes: string
  mood: string
  difficulty_rating: number
}

interface HabitStats {
  current_streak: number
  longest_streak: number
  completion_rate: number
  total_completions: number
  this_week: number
}

export default function HabitsPage() {
  const [habits, setHabits] = useState<Habit[]>([])
  const [habitStats, setHabitStats] = useState<Record<string, HabitStats>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [newHabit, setNewHabit] = useState({
    name: "",
    description: "",
    category: "general",
    target_frequency: "daily",
    target_count: 1,
    color: "#50C2B8"
  })

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    loadHabits()
  }, [])

  const loadHabits = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setLoading(false)
        return
      }

      // Load habits
      const { data: habitsData, error: habitsError } = await supabase
        .from('habits')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      if (habitsError) {
        console.error('Error loading habits:', {
          message: habitsError.message,
          details: habitsError.details,
          hint: habitsError.hint,
          code: habitsError.code
        })
        
        // If table doesn't exist, show helpful message
        if (habitsError.code === '42P01') {
          setError('MIGRATION_REQUIRED')
        } else {
          setError(habitsError.message)
        }
        
        setLoading(false)
        return
      }

      if (habitsData) {
        setHabits(habitsData)

        // Load stats for each habit
        const stats: Record<string, HabitStats> = {}
        for (const habit of habitsData) {
          const habitStat = await loadHabitStats(habit.id, user.id)
          stats[habit.id] = habitStat
        }
        setHabitStats(stats)
      }
    } catch (err) {
      console.error('Error loading habits:', err)
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  const loadHabitStats = async (habitId: string, userId: string): Promise<HabitStats> => {
    try {
      // Get streak info
      const { data: streakData } = await supabase
        .from('streaks')
        .select('current_count, longest_count')
        .eq('user_id', userId)
        .eq('streak_type', `habit_${habitId}`)
        .single()

      // Get total completions
      const { count: totalCount } = await supabase
        .from('habit_entries')
        .select('*', { count: 'exact', head: true })
        .eq('habit_id', habitId)

      // Get this week's completions
      const weekStart = new Date()
      weekStart.setDate(weekStart.getDate() - 7)
      const { count: weekCount } = await supabase
        .from('habit_entries')
        .select('*', { count: 'exact', head: true })
        .eq('habit_id', habitId)
        .gte('completed_at', weekStart.toISOString())

      // Calculate completion rate (last 30 days)
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      const { count: recentCount } = await supabase
        .from('habit_entries')
        .select('*', { count: 'exact', head: true })
        .eq('habit_id', habitId)
        .gte('completed_at', thirtyDaysAgo.toISOString())

      return {
        current_streak: streakData?.current_count || 0,
        longest_streak: streakData?.longest_count || 0,
        completion_rate: Math.round(((recentCount || 0) / 30) * 100),
        total_completions: totalCount || 0,
        this_week: weekCount || 0
      }
    } catch (err) {
      console.error('Error loading habit stats:', err)
      return {
        current_streak: 0,
        longest_streak: 0,
        completion_rate: 0,
        total_completions: 0,
        this_week: 0
      }
    }
  }

  const createHabit = async () => {
    if (!newHabit.name) return

    setIsCreating(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { error } = await supabase
        .from('habits')
        .insert({
          user_id: user.id,
          name: newHabit.name,
          description: newHabit.description,
          category: newHabit.category,
          target_frequency: newHabit.target_frequency,
          target_count: newHabit.target_count,
          color: newHabit.color,
          is_active: true
        })

      if (error) throw error

      // Reset form
      setNewHabit({
        name: "",
        description: "",
        category: "general",
        target_frequency: "daily",
        target_count: 1,
        color: "#50C2B8"
      })

      // Reload habits
      await loadHabits()
    } catch (err) {
      console.error('Error creating habit:', err)
    } finally {
      setIsCreating(false)
    }
  }

  const logHabitCompletion = async (habitId: string, rating: number) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { error } = await supabase
        .from('habit_entries')
        .insert({
          habit_id: habitId,
          user_id: user.id,
          difficulty_rating: rating,
          completed_at: new Date().toISOString()
        })

      if (error) {
        console.error('Error logging habit:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        })
        throw error
      }

      // Reload stats
      await loadHabits()
    } catch (err) {
      console.error('Error logging habit:', err)
    }
  }

  const updateHabit = async () => {
    if (!editingHabit) return

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { error } = await supabase
        .from('habits')
        .update({
          name: editingHabit.name,
          description: editingHabit.description,
          category: editingHabit.category,
          target_frequency: editingHabit.target_frequency,
          target_count: editingHabit.target_count,
          color: editingHabit.color
        })
        .eq('id', editingHabit.id)
        .eq('user_id', user.id)

      if (error) {
        console.error('Error updating habit:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        })
        throw error
      }

      setIsEditDialogOpen(false)
      setEditingHabit(null)
      await loadHabits()
    } catch (err) {
      console.error('Error updating habit:', err)
    }
  }

  const deleteHabit = async (habitId: string) => {
    if (!confirm('Are you sure you want to delete this habit? This will also delete all related entries.')) {
      return
    }

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Soft delete by setting is_active to false
      const { error } = await supabase
        .from('habits')
        .update({ is_active: false })
        .eq('id', habitId)
        .eq('user_id', user.id)

      if (error) {
        console.error('Error deleting habit:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        })
        throw error
      }

      await loadHabits()
    } catch (err) {
      console.error('Error deleting habit:', err)
    }
  }

  const openEditDialog = (habit: Habit) => {
    setEditingHabit(habit)
    setIsEditDialogOpen(true)
  }

  if (loading) {
    return (
      <main className="min-h-screen relative flex items-center justify-center">
        <AnimatedBackground />
        <Loader2 className="w-8 h-8 animate-spin text-[#4DD6FF]" />
      </main>
    )
  }

  if (error === 'MIGRATION_REQUIRED') {
    return (
      <main className="min-h-screen relative">
        <AnimatedBackground />
        <Navbar />
        <Sidebar />
        <div className="pt-24 pb-12 px-4 lg:pl-72">
          <div className="max-w-2xl mx-auto">
            <Card className="border-orange-500/20 bg-orange-500/5">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-8 h-8 text-orange-400" />
                  <CardTitle className="text-foreground">Database Setup Required</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">
                  The habits table hasn't been created yet. To use the habit tracking feature, you need to run the migration file.
                </p>
                
                <div className="bg-slate-950 border border-white/10 rounded-lg p-4 space-y-3">
                  <p className="text-sm font-semibold text-foreground">Follow these steps:</p>
                  <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
                    <li>Open your Supabase project dashboard</li>
                    <li>Navigate to the SQL Editor</li>
                    <li>Open the file: <code className="text-[#4DD6FF] bg-white/5 px-2 py-1 rounded">supabase/habits-migration.sql</code></li>
                    <li>Copy all the SQL code and paste it into the SQL Editor</li>
                    <li>Click "Run" to execute the migration</li>
                    <li>Refresh this page</li>
                  </ol>
                </div>

                <button
                  onClick={() => window.location.reload()}
                  className="w-full py-2 px-4 rounded-lg bg-gradient-to-r from-[#0A938A] to-[#50C2B8] text-white font-medium hover:opacity-90 transition-opacity"
                >
                  I've run the migration - Refresh page
                </button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    )
  }

  if (error) {
    return (
      <main className="min-h-screen relative">
        <AnimatedBackground />
        <Navbar />
        <Sidebar />
        <div className="pt-24 pb-12 px-4 lg:pl-72">
          <div className="max-w-2xl mx-auto">
            <Card className="border-red-500/20 bg-red-500/5">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-8 h-8 text-red-400" />
                  <CardTitle className="text-foreground">Error Loading Habits</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">{error}</p>
                <button
                  onClick={() => {
                    setError(null)
                    setLoading(true)
                    loadHabits()
                  }}
                  className="px-4 py-2 rounded-lg bg-gradient-to-r from-[#0A938A] to-[#50C2B8] text-white font-medium hover:opacity-90 transition-opacity"
                >
                  Try Again
                </button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen relative">
      <AnimatedBackground />
      <Navbar />
      <Sidebar />

      <div className="pt-24 pb-12 px-4 lg:pl-72">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-between items-center mb-8"
          >
            <div>
              <h1 className="text-4xl font-bold text-foreground mb-2">Habit Tracker</h1>
              <p className="text-muted-foreground">Build better habits, one day at a time</p>
            </div>

            <Dialog>
              <DialogTrigger asChild>
                <GradientButton variant="teal">
                  <Plus className="w-4 h-4 mr-2" />
                  New Habit
                </GradientButton>
              </DialogTrigger>
              <DialogContent className="bg-slate-950 border-white/10">
                <DialogHeader>
                  <DialogTitle className="text-foreground">Create New Habit</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm text-foreground mb-2 block">Habit Name</label>
                    <Input
                      value={newHabit.name}
                      onChange={(e) => setNewHabit({ ...newHabit, name: e.target.value })}
                      placeholder="e.g., Morning Exercise"
                      className="bg-white/5 border-white/10 text-foreground"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-foreground mb-2 block">Description (optional)</label>
                    <Textarea
                      value={newHabit.description}
                      onChange={(e) => setNewHabit({ ...newHabit, description: e.target.value })}
                      placeholder="Why this habit matters to you..."
                      className="bg-white/5 border-white/10 text-foreground"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm text-foreground mb-2 block">Category</label>
                      <select
                        value={newHabit.category}
                        onChange={(e) => setNewHabit({ ...newHabit, category: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-foreground"
                      >
                        <option value="general" className="bg-slate-900 text-white">General</option>
                        <option value="health" className="bg-slate-900 text-white">Health</option>
                        <option value="productivity" className="bg-slate-900 text-white">Productivity</option>
                        <option value="learning" className="bg-slate-900 text-white">Learning</option>
                        <option value="social" className="bg-slate-900 text-white">Social</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-sm text-foreground mb-2 block">Frequency</label>
                      <select
                        value={newHabit.target_frequency}
                        onChange={(e) => setNewHabit({ ...newHabit, target_frequency: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-foreground"
                      >
                        <option value="daily" className="bg-slate-900 text-white">Daily</option>
                        <option value="weekly" className="bg-slate-900 text-white">Weekly</option>
                      </select>
                    </div>
                  </div>
                  <GradientButton
                    variant="teal"
                    onClick={createHabit}
                    disabled={isCreating || !newHabit.name}
                    className="w-full"
                  >
                    {isCreating ? 'Creating...' : 'Create Habit'}
                  </GradientButton>
                </div>
              </DialogContent>
            </Dialog>

            {/* Edit Dialog */}
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
              <DialogContent className="bg-slate-950 border-white/10">
                <DialogHeader>
                  <DialogTitle className="text-foreground">Edit Habit</DialogTitle>
                </DialogHeader>
                {editingHabit && (
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm text-foreground mb-2 block">Habit Name</label>
                      <Input
                        value={editingHabit.name}
                        onChange={(e) => setEditingHabit({ ...editingHabit, name: e.target.value })}
                        placeholder="e.g., Morning Exercise"
                        className="bg-white/5 border-white/10 text-foreground"
                      />
                    </div>
                    <div>
                      <label className="text-sm text-foreground mb-2 block">Description (optional)</label>
                      <Textarea
                        value={editingHabit.description || ''}
                        onChange={(e) => setEditingHabit({ ...editingHabit, description: e.target.value })}
                        placeholder="Why this habit matters to you..."
                        className="bg-white/5 border-white/10 text-foreground"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm text-foreground mb-2 block">Category</label>
                        <select
                          value={editingHabit.category}
                          onChange={(e) => setEditingHabit({ ...editingHabit, category: e.target.value })}
                          className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-foreground"
                        >
                          <option value="general" className="bg-slate-900 text-white">General</option>
                          <option value="health" className="bg-slate-900 text-white">Health</option>
                          <option value="productivity" className="bg-slate-900 text-white">Productivity</option>
                          <option value="learning" className="bg-slate-900 text-white">Learning</option>
                          <option value="social" className="bg-slate-900 text-white">Social</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-sm text-foreground mb-2 block">Frequency</label>
                        <select
                          value={editingHabit.target_frequency}
                          onChange={(e) => setEditingHabit({ ...editingHabit, target_frequency: e.target.value })}
                          className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-foreground"
                        >
                          <option value="daily" className="bg-slate-900 text-white">Daily</option>
                          <option value="weekly" className="bg-slate-900 text-white">Weekly</option>
                        </select>
                      </div>
                    </div>
                    <GradientButton
                      variant="teal"
                      onClick={updateHabit}
                      disabled={!editingHabit.name}
                      className="w-full"
                    >
                      Update Habit
                    </GradientButton>
                  </div>
                )}
              </DialogContent>
            </Dialog>
          </motion.div>

          {/* Habits Grid */}
          {habits.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-16"
            >
              <Target className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <h2 className="text-xl font-semibold text-foreground mb-2">No habits yet</h2>
              <p className="text-muted-foreground mb-6">Create your first habit to start tracking</p>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {habits.map((habit, index) => {
                const stats = habitStats[habit.id] || {
                  current_streak: 0,
                  longest_streak: 0,
                  completion_rate: 0,
                  total_completions: 0,
                  this_week: 0
                }

                return (
                  <motion.div
                    key={habit.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Card className="border-white/10 bg-white/5 backdrop-blur-xl">
                      <CardHeader>
                        <div className="flex items-start justify-between mb-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: habit.color }}
                          />
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary">{habit.category}</Badge>
                            <button
                              onClick={() => openEditDialog(habit)}
                              className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                            >
                              <Edit className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                            </button>
                            <button
                              onClick={() => deleteHabit(habit.id)}
                              className="p-1.5 rounded-lg hover:bg-red-500/20 transition-colors"
                            >
                              <Trash2 className="w-4 h-4 text-muted-foreground hover:text-red-400" />
                            </button>
                          </div>
                        </div>
                        <CardTitle className="text-foreground text-lg">{habit.name}</CardTitle>
                        {habit.description && (
                          <p className="text-sm text-muted-foreground">{habit.description}</p>
                        )}
                      </CardHeader>
                      <CardContent>
                        {/* Stats */}
                        <div className="grid grid-cols-2 gap-4 mb-4">
                          <div className="text-center p-3 rounded-lg bg-white/5">
                            <Flame className="w-5 h-5 mx-auto text-orange-400 mb-1" />
                            <div className="text-2xl font-bold text-foreground">{stats.current_streak}</div>
                            <div className="text-xs text-muted-foreground">Day Streak</div>
                          </div>
                          <div className="text-center p-3 rounded-lg bg-white/5">
                            <Trophy className="w-5 h-5 mx-auto text-yellow-400 mb-1" />
                            <div className="text-2xl font-bold text-foreground">{stats.longest_streak}</div>
                            <div className="text-xs text-muted-foreground">Best Streak</div>
                          </div>
                          <div className="text-center p-3 rounded-lg bg-white/5">
                            <TrendingUp className="w-5 h-5 mx-auto text-[#50C2B8] mb-1" />
                            <div className="text-2xl font-bold text-foreground">{stats.completion_rate}%</div>
                            <div className="text-xs text-muted-foreground">This Month</div>
                          </div>
                          <div className="text-center p-3 rounded-lg bg-white/5">
                            <Activity className="w-5 h-5 mx-auto text-[#4DD6FF] mb-1" />
                            <div className="text-2xl font-bold text-foreground">{stats.this_week}</div>
                            <div className="text-xs text-muted-foreground">This Week</div>
                          </div>
                        </div>

                        {/* Log Completion */}
                        <div>
                          <p className="text-xs text-muted-foreground mb-2">Log today:</p>
                          <div className="flex gap-2">
                            {[1, 2, 3, 4, 5].map((rating) => (
                              <button
                                key={rating}
                                onClick={() => logHabitCompletion(habit.id, rating)}
                                className={`flex-1 py-2 px-1 rounded-lg text-xs font-medium transition-all ${
                                  rating <= 2
                                    ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
                                    : rating === 3
                                    ? 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30'
                                    : 'bg-orange-500/20 text-orange-400 hover:bg-orange-500/30'
                                }`}
                              >
                                {rating === 1 ? '😊' : rating === 2 ? '🙂' : rating === 3 ? '😐' : rating === 4 ? '😓' : '😰'}
                              </button>
                            ))}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
