"use client"

import { motion } from "framer-motion"
import { useState, useEffect } from "react"
import { createBrowserClient } from "@supabase/ssr"
import { AnimatedBackground } from "@/components/ui/animated-background"
import { Sidebar } from "@/components/layout/sidebar"
import { Navbar } from "@/components/layout/navbar"
import { GlassCard } from "@/components/ui/glass-card"
import { TrendChart } from "@/components/charts/trend-chart"
import { InsightCard } from "@/components/dashboard/insight-card"
import { Brain, TrendingUp, Clock, Target, Calendar, PieChart, BarChart3, Loader2, Lightbulb, Activity, CheckCircle, AlertCircle, Zap } from "lucide-react"
import { PieChart as RechartsPieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts"
import Link from "next/link"

interface Decision {
  id: string
  title: string
  category: string
  is_completed: boolean
  created_at: string
}

interface HabitInsight {
  id: string
  habit_id: string
  insight_type: string
  title: string
  description: string
  actionable_tips: string[]
  confidence_score: number
  data: any
  habit?: {
    name: string
    color: string
  }
}

const COLORS = ["#0A938A", "#4786F5", "#E76A18", "#4DD6FF", "#50C2B8", "#2B40D8"]

export default function InsightsPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [decisions, setDecisions] = useState<Decision[]>([])
  const [habitInsights, setHabitInsights] = useState<HabitInsight[]>([])
  const [stats, setStats] = useState({
    total: 0,
    completed: 0,
    successRate: 0,
    categories: 0
  })
  const [categoryData, setCategoryData] = useState<{ name: string; value: number; color: string }[]>([])
  const [weeklyData, setWeeklyData] = useState<{ name: string; decisions: number; success: number }[]>([])
  const [timeData, setTimeData] = useState<{ time: string; decisions: number; success: number }[]>([])
  const [insights, setInsights] = useState<{ icon: any; title: string; description: string; gradient: string }[]>([])

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    const loadInsights = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data: decisionsData, error } = await supabase
          .from('decisions')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })

        if (error) {
          console.error('Error loading decisions:', error.message)
          return
        }

        // Load habit insights
        const { data: habitInsightsData, error: habitError } = await supabase
          .from('habit_insights')
          .select(`
            *,
            habit:habits(name, color)
          `)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(5)

        if (!habitError && habitInsightsData) {
          setHabitInsights(habitInsightsData)
          
          // If no insights exist but user has habits, try to generate them
          if (habitInsightsData.length === 0) {
            const { data: habitsData } = await supabase
              .from('habits')
              .select('id')
              .eq('user_id', user.id)
              .eq('is_active', true)
              .limit(1)
            
            if (habitsData && habitsData.length > 0) {
              // Call the function to generate insights
              await supabase.rpc('generate_habit_insights', { target_user_id: user.id })
              
              // Reload insights after generation
              const { data: newInsights } = await supabase
                .from('habit_insights')
                .select(`
                  *,
                  habit:habits(name, color)
                `)
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .limit(5)
              
              if (newInsights) {
                setHabitInsights(newInsights)
              }
            }
          }
        } else if (habitError) {
          console.error('Error loading habit insights:', habitError)
        }

        if (decisionsData) {
          setDecisions(decisionsData)

          // Calculate stats
          const total = decisionsData.length
          const completed = decisionsData.filter(d => d.is_completed).length
          const categories = new Set(decisionsData.map(d => d.category || 'general')).size

          setStats({
            total,
            completed,
            successRate: total > 0 ? Math.round((completed / total) * 100) : 0,
            categories
          })

          // Category breakdown
          const catCounts: Record<string, number> = {}
          decisionsData.forEach(d => {
            const cat = d.category || 'general'
            catCounts[cat] = (catCounts[cat] || 0) + 1
          })
          const catData = Object.entries(catCounts).map(([name, value], i) => ({
            name: name.charAt(0).toUpperCase() + name.slice(1),
            value,
            color: COLORS[i % COLORS.length]
          }))
          setCategoryData(catData)

          // Weekly data (last 4 weeks)
          const now = new Date()
          const weekData: { name: string; decisions: number; success: number }[] = []
          for (let i = 3; i >= 0; i--) {
            const weekStart = new Date(now)
            weekStart.setDate(now.getDate() - (i + 1) * 7)
            const weekEnd = new Date(now)
            weekEnd.setDate(now.getDate() - i * 7)
            
            const weekDecisions = decisionsData.filter(d => {
              const date = new Date(d.created_at)
              return date >= weekStart && date < weekEnd
            })
            
            weekData.push({
              name: `Week ${4 - i}`,
              decisions: weekDecisions.length,
              success: weekDecisions.filter(d => d.is_completed).length
            })
          }
          setWeeklyData(weekData)

          // Time of day analysis
          const timeGroups = { Morning: { total: 0, completed: 0 }, Afternoon: { total: 0, completed: 0 }, Evening: { total: 0, completed: 0 } }
          decisionsData.forEach(d => {
            const hour = new Date(d.created_at).getHours()
            let period: 'Morning' | 'Afternoon' | 'Evening' = 'Morning'
            if (hour >= 12 && hour < 17) period = 'Afternoon'
            else if (hour >= 17) period = 'Evening'
            
            timeGroups[period].total++
            if (d.is_completed) timeGroups[period].completed++
          })
          
          const timeDataCalc = Object.entries(timeGroups).map(([time, data]) => ({
            time,
            decisions: data.total,
            success: data.total > 0 ? Math.round((data.completed / data.total) * 100) : 0
          }))
          setTimeData(timeDataCalc)

          // Generate insights based on data
          const generatedInsights = []
          
          // Habit consistency insight
          if (habitInsightsData && habitInsightsData.length > 0) {
            const avgSuccessRate = habitInsightsData.reduce((sum, h) => sum + h.success_rate, 0) / habitInsightsData.length
            generatedInsights.push({
              icon: Target,
              title: \"Habit Consistency\",
              description: `Your average habit success rate is ${Math.round(avgSuccessRate)}%. ${avgSuccessRate >= 70 ? 'Great consistency!' : avgSuccessRate >= 50 ? 'Keep building momentum!' : 'Focus on one habit at a time.'}`,
              gradient: \"from-[#0A938A] to-[#50C2B8]\"
            })
          }
          
          // Most active category
          if (catData.length > 0) {
            const topCat = catData.reduce((a, b) => a.value > b.value ? a : b)
            generatedInsights.push({
              icon: Brain,
              title: \"Top Category\",
              description: `${topCat.name} is your most common decision area with ${topCat.value} decisions. Consider linking these to habits for better tracking.`,
              gradient: \"from-[#0A938A] to-[#50C2B8]\"
            })
          }

          // Best time
          const bestTime = timeDataCalc.reduce((a, b) => a.success > b.success ? a : b, { time: 'Morning', success: 0, decisions: 0 })
          if (bestTime.decisions > 0) {
            generatedInsights.push({
              icon: Clock,
              title: \"Best Time\",
              description: `Your success rate is highest in the ${bestTime.time.toLowerCase()} at ${bestTime.success}%. Schedule important decisions during this time.`,
              gradient: \"from-[#4786F5] to-[#4DD6FF]\"
            })
          }

          // Decision trend
          if (weekData.length >= 2) {
            const recent = weekData[weekData.length - 1].decisions
            const previous = weekData[weekData.length - 2].decisions
            if (recent > previous) {
              generatedInsights.push({
                icon: TrendingUp,
                title: \"Trending Up\",
                description: `You made ${recent - previous} more decisions this week. Your decision-making momentum is growing!`,
                gradient: \"from-[#E76A18] to-[#EED9B6]\"
              })
            } else if (recent < previous) {
              generatedInsights.push({
                icon: Brain,
                title: \"Reflection Time\",
                description: `Fewer decisions this week. Take time to review outcomes and refine your approach.`,
                gradient: \"from-[#4786F5] to-[#4DD6FF]\"
              })
            }
          }

          if (generatedInsights.length === 0) {
            generatedInsights.push({
              icon: Lightbulb,
              title: \"Getting Started\",
              description: \"Make more decisions and track habits to unlock personalized insights!\",
              gradient: \"from-[#0A938A] to-[#50C2B8]\"
            })
          }

          setInsights(generatedInsights)
        }
      } catch (err) {
        console.error('Error:', err)
      } finally {
        setIsLoading(false)
      }
    }

    loadInsights()
  }, [supabase])

  if (isLoading) {
    return (
      <main className="min-h-screen relative flex items-center justify-center">
        <AnimatedBackground />
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-[#4DD6FF]" />
          <p className="text-muted-foreground">Loading insights...</p>
        </div>
      </main>
    )
  }

  if (decisions.length === 0) {
    return (
      <main className="min-h-screen relative">
        <AnimatedBackground />
        <Navbar />
        <Sidebar />
        <div className="pt-24 pb-12 px-4 lg:pl-72">
          <div className="max-w-4xl mx-auto">
            <GlassCard className="text-center py-16">
              <BarChart3 className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <h2 className="text-2xl font-bold text-foreground mb-2">No Insights Yet</h2>
              <p className="text-muted-foreground mb-6">Make some decisions to see your personalized insights!</p>
              <Link
                href="/create"
                className="inline-block py-3 px-6 rounded-xl font-semibold text-white bg-gradient-to-r from-[#0A938A] to-[#50C2B8]"
              >
                Create Your First Decision
              </Link>
            </GlassCard>
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
            transition={{ duration: 0.5 }}
            className="mb-8"
          >
            <h1 className="text-3xl font-bold text-foreground">Insights</h1>
            <p className="text-muted-foreground mt-1">Discover patterns in your decision-making</p>
          </motion.div>

          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <InsightCard
              title="Total Decisions"
              value={stats.total}
              icon={<BarChart3 className="w-6 h-6 text-[#0A938A]" />}
              delay={0}
            />
            <InsightCard
              title="Success Rate"
              value={`${stats.successRate}%`}
              icon={<TrendingUp className="w-6 h-6 text-[#50C2B8]" />}
              delay={0.1}
            />
            <InsightCard
              title="Completed"
              value={stats.completed}
              icon={<Target className="w-6 h-6 text-[#4DD6FF]" />}
              delay={0.2}
            />
            <InsightCard
              title="Categories"
              value={stats.categories}
              icon={<PieChart className="w-6 h-6 text-[#E76A18]" />}
              delay={0.3}
            />
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Main Charts */}
            <div className="lg:col-span-2 space-y-6">
              {/* Weekly Trend */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.4 }}
              >
                <TrendChart data={weeklyData} title="Weekly Overview" />
              </motion.div>

              {/* Category Breakdown */}
              {categoryData.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.5 }}
                >
                  <GlassCard>
                    <h3 className="text-lg font-semibold text-foreground mb-4">Decisions by Category</h3>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <RechartsPieChart>
                          <Pie
                            data={categoryData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            {categoryData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "rgba(10, 15, 30, 0.9)",
                              border: "1px solid rgba(255,255,255,0.1)",
                              borderRadius: "12px",
                              color: "#fff",
                            }}
                          />
                          <Legend formatter={(value) => <span className="text-foreground">{value}</span>} />
                        </RechartsPieChart>
                      </ResponsiveContainer>
                    </div>
                  </GlassCard>
                </motion.div>
              )}

              {/* Time of Day Analysis */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.6 }}
              >
                <GlassCard>
                  <h3 className="text-lg font-semibold text-foreground mb-4">Performance by Time of Day</h3>
                  <div className="space-y-4">
                    {timeData.map((item, index) => (
                      <div key={item.time} className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-foreground font-medium">{item.time}</span>
                          <span className="text-muted-foreground">
                            {item.decisions} decisions • {item.success}% success
                          </span>
                        </div>
                        <div className="h-3 bg-white/5 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${item.success}%` }}
                            transition={{ duration: 1, delay: 0.7 + index * 0.1 }}
                            className="h-full rounded-full bg-gradient-to-r from-[#0A938A] to-[#50C2B8]"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </GlassCard>
              </motion.div>

              {/* Habit Patterns */}
              {habitInsights.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.7 }}
                >
                  <GlassCard>
                    <div className="flex items-center gap-3 mb-4">
                      <Activity className="w-6 h-6 text-[#50C2B8]" />
                      <h3 className="text-lg font-semibold text-foreground">Habit Patterns</h3>
                    </div>
                    <div className="space-y-4">
                      {habitInsights.map((insight) => {
                        const isSuccess = insight.insight_type === 'success_pattern'
                        const Icon = isSuccess ? CheckCircle : AlertCircle
                        const colorClass = isSuccess ? 'text-emerald-400' : 'text-orange-400'
                        const bgClass = isSuccess ? 'bg-emerald-500/10' : 'bg-orange-500/10'

                        return (
                          <div key={insight.id} className={`p-4 rounded-xl ${bgClass} border border-white/10`}>
                            <div className="flex items-start gap-3 mb-2">
                              <Icon className={`w-5 h-5 ${colorClass} mt-0.5`} />
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  {insight.habit && (
                                    <div
                                      className="w-2 h-2 rounded-full"
                                      style={{ backgroundColor: insight.habit.color }}
                                    />
                                  )}
                                  <h4 className="font-semibold text-foreground">
                                    {insight.habit?.name || 'Overall'}: {insight.title}
                                  </h4>
                                </div>
                                <p className="text-sm text-muted-foreground mb-3">{insight.description}</p>
                                
                                {insight.actionable_tips && insight.actionable_tips.length > 0 && (
                                  <div className="space-y-1">
                                    {insight.actionable_tips.map((tip, i) => (
                                      <div key={i} className="flex items-start gap-2 text-xs text-foreground">
                                        <Zap className="w-3 h-3 text-[#4DD6FF] mt-0.5" />
                                        <span>{tip}</span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            {insight.data && insight.data.success_rate && (
                              <div className="mt-3 pt-3 border-t border-white/10">
                                <div className="flex items-center justify-between text-xs">
                                  <span className="text-muted-foreground">Success Rate</span>
                                  <span className={`font-semibold ${colorClass}`}>
                                    {insight.data.success_rate}%
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                    
                    <Link
                      href="/habits"
                      className="mt-4 block text-center text-sm text-[#4DD6FF] hover:text-[#50C2B8] transition-colors"
                    >
                      View All Habits →
                    </Link>
                  </GlassCard>
                </motion.div>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* AI Insights */}
              {insights.map((insight, index) => (
                <motion.div
                  key={insight.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.5 + index * 0.1 }}
                >
                  <GlassCard>
                    <div className="flex items-start gap-4">
                      <div
                        className={`w-12 h-12 rounded-xl bg-gradient-to-r ${insight.gradient} flex items-center justify-center flex-shrink-0`}
                      >
                        <insight.icon className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-foreground mb-1">{insight.title}</h4>
                        <p className="text-sm text-muted-foreground">{insight.description}</p>
                      </div>
                    </div>
                  </GlassCard>
                </motion.div>
              ))}

              {/* Summary */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.8 }}
              >
                <GlassCard variant="glow-cyan">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-[#4786F5] to-[#4DD6FF] flex items-center justify-center">
                      <Calendar className="w-5 h-5 text-white" />
                    </div>
                    <h3 className="font-semibold text-foreground">Summary</h3>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Total Decisions</span>
                      <span className="font-semibold text-foreground">{stats.total}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Completed</span>
                      <span className="font-semibold text-[#50C2B8]">{stats.completed}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Pending</span>
                      <span className="font-semibold text-[#4DD6FF]">{stats.total - stats.completed}</span>
                    </div>
                  </div>
                </GlassCard>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
