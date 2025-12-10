"use client"

import { motion } from "framer-motion"
import Link from "next/link"
import { useState, useEffect } from "react"
import { createBrowserClient } from "@supabase/ssr"
import { AnimatedBackground } from "@/components/ui/animated-background"
import { Sidebar } from "@/components/layout/sidebar"
import { Navbar } from "@/components/layout/navbar"
import { GlassCard } from "@/components/ui/glass-card"
import { GradientButton } from "@/components/ui/gradient-button"
import { InsightCard } from "@/components/dashboard/insight-card"
import { DecisionList } from "@/components/dashboard/decision-list"
import { StreakCard } from "@/components/dashboard/streak-card"
import { TrendChart } from "@/components/charts/trend-chart"
import { Target, TrendingUp, CheckCircle2, Clock, PlusCircle, Brain, Sparkles, Loader2 } from "lucide-react"

interface Decision {
  id: string
  title: string
  options: { id: number; text: string }[]
  chosen_option?: { id: number; text: string }
  is_completed: boolean
  ai_summary?: string
  created_at: string
}

export default function DashboardPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [decisions, setDecisions] = useState<Decision[]>([])
  const [stats, setStats] = useState({
    total: 0,
    completed: 0,
    pending: 0,
    successRate: 0
  })
  const [chartData, setChartData] = useState<{ name: string; decisions: number; success: number }[]>([])
  const [userName, setUserName] = useState("")

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        
        if (!user) return

        setUserName(user.user_metadata?.full_name || user.email?.split('@')[0] || 'User')

        // Load decisions
        const { data: decisionsData, error } = await supabase
          .from('decisions')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(10)

        if (error) {
          console.error('Error loading decisions:', error.message, error.details, error.hint)
          // Table might not exist yet - user needs to run the SQL setup
        }

        if (decisionsData) {
          setDecisions(decisionsData)
          
          // Calculate stats
          const total = decisionsData.length
          const completed = decisionsData.filter(d => d.is_completed).length
          const pending = total - completed
          
          setStats({
            total,
            completed,
            pending,
            successRate: total > 0 ? Math.round((completed / total) * 100) : 0
          })

          // Generate chart data for last 7 days
          const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
          const today = new Date()
          const last7Days = Array.from({ length: 7 }, (_, i) => {
            const date = new Date(today)
            date.setDate(date.getDate() - (6 - i))
            return {
              name: days[date.getDay()],
              date: date.toISOString().split('T')[0],
              decisions: 0,
              success: 0
            }
          })

          decisionsData.forEach(decision => {
            const decisionDate = decision.created_at.split('T')[0]
            const dayData = last7Days.find(d => d.date === decisionDate)
            if (dayData) {
              dayData.decisions++
              if (decision.is_completed) {
                dayData.success++
              }
            }
          })

          setChartData(last7Days.map(d => ({
            name: d.name,
            decisions: d.decisions,
            success: d.success
          })))
        }
      } catch (err) {
        console.error('Dashboard error:', err)
      } finally {
        setIsLoading(false)
      }
    }

    loadDashboardData()
  }, [supabase])

  // Transform decisions for DecisionList component
  const formattedDecisions = decisions.map(d => ({
    id: d.id,
    title: d.title,
    options: d.options?.map((opt: { id: number; text: string }) => opt.text) || [],
    chosenOption: d.chosen_option?.text,
    outcome: d.is_completed ? 'success' as const : undefined,
    createdAt: getRelativeTime(d.created_at),
    aiRecommendation: d.ai_summary?.includes('Recommended:') 
      ? d.ai_summary.split('Recommended:')[1]?.split('(')[0]?.trim()
      : undefined
  }))

  function getRelativeTime(dateString: string) {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays} days ago`
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} week${Math.floor(diffDays / 7) > 1 ? 's' : ''} ago`
    return `${Math.floor(diffDays / 30)} month${Math.floor(diffDays / 30) > 1 ? 's' : ''} ago`
  }

  if (isLoading) {
    return (
      <main className="min-h-screen relative flex items-center justify-center">
        <AnimatedBackground />
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-[#4DD6FF]" />
          <p className="text-muted-foreground">Loading dashboard...</p>
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
            className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8"
          >
            <div>
              <h1 className="text-3xl font-bold text-foreground">
                Welcome{userName ? `, ${userName}` : ''}!
              </h1>
              <p className="text-muted-foreground mt-1">Track your decisions and insights</p>
            </div>
            <Link href="/create">
              <GradientButton variant="teal">
                <PlusCircle className="w-4 h-4 mr-2" />
                New Decision
              </GradientButton>
            </Link>
          </motion.div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <InsightCard
              title="Total Decisions"
              value={stats.total}
              change={0}
              icon={<Target className="w-6 h-6 text-[#0A938A]" />}
              delay={0}
            />
            <InsightCard
              title="Success Rate"
              value={`${stats.successRate}%`}
              change={0}
              icon={<TrendingUp className="w-6 h-6 text-[#50C2B8]" />}
              delay={0.1}
            />
            <InsightCard
              title="Completed"
              value={stats.completed}
              change={0}
              icon={<CheckCircle2 className="w-6 h-6 text-[#4DD6FF]" />}
              delay={0.2}
            />
            <InsightCard
              title="Pending"
              value={stats.pending}
              change={0}
              icon={<Clock className="w-6 h-6 text-[#E76A18]" />}
              delay={0.3}
            />
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Chart */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.4 }}
              >
                <TrendChart data={chartData} title="Weekly Activity" />
              </motion.div>

              {/* Recent Decisions */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.5 }}
              >
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-foreground">Recent Decisions</h2>
                  <Link href="/history" className="text-sm text-[#4DD6FF] hover:underline">
                    View all
                  </Link>
                </div>
                {formattedDecisions.length > 0 ? (
                  <DecisionList decisions={formattedDecisions} />
                ) : (
                  <GlassCard className="text-center py-8">
                    <Target className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold text-foreground mb-2">No decisions yet</h3>
                    <p className="text-muted-foreground mb-4">Start making AI-powered decisions today!</p>
                    <Link href="/create">
                      <GradientButton variant="teal">
                        <PlusCircle className="w-4 h-4 mr-2" />
                        Create Your First Decision
                      </GradientButton>
                    </Link>
                  </GlassCard>
                )}
              </motion.div>
            </div>

            {/* Sidebar Content */}
            <div className="space-y-6">
              {/* Streak Card */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.4 }}
              >
                <StreakCard 
                  currentStreak={stats.total > 0 ? 1 : 0} 
                  longestStreak={stats.total} 
                  decisionsThisWeek={chartData.reduce((sum, d) => sum + d.decisions, 0)} 
                />
              </motion.div>

              {/* AI Insight */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.5 }}
              >
                <GlassCard variant="glow-cyan">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-[#4786F5] to-[#4DD6FF] flex items-center justify-center">
                      <Brain className="w-5 h-5 text-white" />
                    </div>
                    <h3 className="font-semibold text-foreground">AI Insight</h3>
                  </div>
                  <p className="text-muted-foreground text-sm">
                    {stats.total === 0 
                      ? "Start making decisions to get personalized AI insights about your decision-making patterns!"
                      : stats.successRate >= 70 
                        ? "Great job! You're making well-thought-out decisions. Keep up the good work!"
                        : "Consider taking more time to analyze your options. Our AI can help you make better choices."
                    }
                  </p>
                </GlassCard>
              </motion.div>

              {/* Quick Action */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.6 }}
              >
                <GlassCard>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-[#E76A18] to-[#EED9B6] flex items-center justify-center">
                      <Sparkles className="w-5 h-5 text-white" />
                    </div>
                    <h3 className="font-semibold text-foreground">Quick Decision</h3>
                  </div>
                  <p className="text-foreground font-medium mb-2">Need to decide something?</p>
                  <p className="text-muted-foreground text-sm mb-4">
                    Let AI help you analyze your options and make better choices.
                  </p>
                  <Link href="/create">
                    <GradientButton variant="orange" size="sm" className="w-full">
                      Start Now
                    </GradientButton>
                  </Link>
                </GlassCard>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
