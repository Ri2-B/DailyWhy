"use client"

import { motion } from "framer-motion"
import { useState, useEffect } from "react"
import { createBrowserClient } from "@supabase/ssr"
import { AnimatedBackground } from "@/components/ui/animated-background"
import { Sidebar } from "@/components/layout/sidebar"
import { Navbar } from "@/components/layout/navbar"
import { GlassCard } from "@/components/ui/glass-card"
import {
  Trophy,
  Star,
  Target,
  Flame,
  Brain,
  CheckCircle2,
  Lock,
  Medal,
  Crown,
  Zap,
  TrendingUp,
  Calendar,
  Users,
  Award,
  Loader2,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"

interface Achievement {
  id: string
  title: string
  description: string
  icon: LucideIcon
  category: string
  progress: number
  unlocked: boolean
  unlockedAt?: string
  xp: number
  rarity: "common" | "uncommon" | "rare" | "epic" | "legendary"
}

const categories = ["All", "Getting Started", "Milestones", "Consistency"]

function getRarityStyles(rarity: string) {
  const styles = {
    common: {
      bg: "bg-slate-500/20",
      border: "border-slate-500/30",
      text: "text-slate-400",
      glow: "",
    },
    uncommon: {
      bg: "bg-emerald-500/20",
      border: "border-emerald-500/30",
      text: "text-emerald-400",
      glow: "",
    },
    rare: {
      bg: "bg-blue-500/20",
      border: "border-blue-500/30",
      text: "text-blue-400",
      glow: "shadow-blue-500/20",
    },
    epic: {
      bg: "bg-purple-500/20",
      border: "border-purple-500/30",
      text: "text-purple-400",
      glow: "shadow-purple-500/20",
    },
    legendary: {
      bg: "bg-amber-500/20",
      border: "border-amber-500/30",
      text: "text-amber-400",
      glow: "shadow-amber-500/30 shadow-lg",
    },
  }
  return styles[rarity as keyof typeof styles] || styles.common
}

// Generate achievements based on user stats
function generateAchievements(totalDecisions: number, completedDecisions: number): Achievement[] {
  return [
    {
      id: "1",
      title: "First Decision",
      description: "Make your first decision with AI assistance",
      icon: Target,
      category: "Getting Started",
      progress: Math.min(totalDecisions * 100, 100),
      unlocked: totalDecisions >= 1,
      unlockedAt: totalDecisions >= 1 ? new Date().toISOString() : undefined,
      xp: 50,
      rarity: "common",
    },
    {
      id: "2",
      title: "Getting Started",
      description: "Make 5 decisions",
      icon: Star,
      category: "Milestones",
      progress: Math.min((totalDecisions / 5) * 100, 100),
      unlocked: totalDecisions >= 5,
      xp: 100,
      rarity: "common",
    },
    {
      id: "3",
      title: "Decision Maker",
      description: "Make 10 decisions",
      icon: Brain,
      category: "Milestones",
      progress: Math.min((totalDecisions / 10) * 100, 100),
      unlocked: totalDecisions >= 10,
      xp: 200,
      rarity: "uncommon",
    },
    {
      id: "4",
      title: "Thoughtful",
      description: "Complete 5 decisions with outcomes",
      icon: CheckCircle2,
      category: "Consistency",
      progress: Math.min((completedDecisions / 5) * 100, 100),
      unlocked: completedDecisions >= 5,
      xp: 150,
      rarity: "uncommon",
    },
    {
      id: "5",
      title: "Decision Expert",
      description: "Make 25 decisions",
      icon: Medal,
      category: "Milestones",
      progress: Math.min((totalDecisions / 25) * 100, 100),
      unlocked: totalDecisions >= 25,
      xp: 300,
      rarity: "rare",
    },
    {
      id: "6",
      title: "Consistent",
      description: "Complete 10 decisions with outcomes",
      icon: Flame,
      category: "Consistency",
      progress: Math.min((completedDecisions / 10) * 100, 100),
      unlocked: completedDecisions >= 10,
      xp: 250,
      rarity: "rare",
    },
    {
      id: "7",
      title: "Decision Master",
      description: "Make 50 decisions",
      icon: Crown,
      category: "Milestones",
      progress: Math.min((totalDecisions / 50) * 100, 100),
      unlocked: totalDecisions >= 50,
      xp: 500,
      rarity: "epic",
    },
    {
      id: "8",
      title: "Decision Legend",
      description: "Make 100 decisions",
      icon: Trophy,
      category: "Milestones",
      progress: Math.min((totalDecisions / 100) * 100, 100),
      unlocked: totalDecisions >= 100,
      xp: 1000,
      rarity: "legendary",
    },
  ]
}

export default function AchievementsPage() {
  const [selectedCategory, setSelectedCategory] = useState("All")
  const [showUnlocked, setShowUnlocked] = useState<"all" | "unlocked" | "locked">("all")
  const [achievements, setAchievements] = useState<Achievement[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    const loadAchievements = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        
        if (!user) return

        // Load decisions to calculate achievements
        const { data: decisions } = await supabase
          .from('decisions')
          .select('id, is_completed')
          .eq('user_id', user.id)

        const total = decisions?.length || 0
        const completed = decisions?.filter(d => d.is_completed).length || 0

        setAchievements(generateAchievements(total, completed))
      } catch (err) {
        console.error('Error loading achievements:', err)
        setAchievements(generateAchievements(0, 0))
      } finally {
        setIsLoading(false)
      }
    }

    loadAchievements()
  }, [supabase])

  // Filter achievements
  const filteredAchievements = achievements.filter((achievement) => {
    const matchesCategory = selectedCategory === "All" || achievement.category === selectedCategory
    const matchesUnlocked =
      showUnlocked === "all" ||
      (showUnlocked === "unlocked" && achievement.unlocked) ||
      (showUnlocked === "locked" && !achievement.unlocked)
    return matchesCategory && matchesUnlocked
  })

  // Stats
  const stats = {
    total: achievements.length,
    unlocked: achievements.filter((a) => a.unlocked).length,
    totalXP: achievements.filter((a) => a.unlocked).reduce((sum, a) => sum + a.xp, 0),
    completion: achievements.length > 0 
      ? Math.round((achievements.filter((a) => a.unlocked).length / achievements.length) * 100)
      : 0,
  }

  const currentLevel = Math.floor(stats.totalXP / 500) + 1
  const xpForNextLevel = currentLevel * 500
  const xpProgress = stats.totalXP % 500

  if (isLoading) {
    return (
      <main className="min-h-screen relative flex items-center justify-center">
        <AnimatedBackground />
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-[#4DD6FF]" />
          <p className="text-muted-foreground">Loading achievements...</p>
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
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
                <Trophy className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-3xl font-bold text-foreground">Achievements</h1>
            </div>
            <p className="text-muted-foreground">Unlock achievements and earn XP as you master decision-making</p>
          </motion.div>

          {/* Stats Cards */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
          >
            <GlassCard className="!p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                  <Trophy className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">
                    {stats.unlocked}/{stats.total}
                  </p>
                  <p className="text-sm text-muted-foreground">Unlocked</p>
                </div>
              </div>
            </GlassCard>

            <GlassCard className="!p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#4786F5]/20 flex items-center justify-center">
                  <Star className="w-5 h-5 text-[#4DD6FF]" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stats.totalXP}</p>
                  <p className="text-sm text-muted-foreground">Total XP</p>
                </div>
              </div>
            </GlassCard>

            <GlassCard className="!p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stats.completion}%</p>
                  <p className="text-sm text-muted-foreground">Completion</p>
                </div>
              </div>
            </GlassCard>

            <GlassCard className="!p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                  <Award className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">Level {currentLevel}</p>
                  <p className="text-sm text-muted-foreground">Current Rank</p>
                </div>
              </div>
            </GlassCard>
          </motion.div>

          {/* XP Progress Bar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="mb-8"
          >
            <GlassCard className="!p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-foreground">Level {currentLevel} Progress</span>
                <span className="text-sm text-muted-foreground">{xpProgress} / 500 XP</span>
              </div>
              <div className="h-3 bg-white/10 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(xpProgress / 500) * 100}%` }}
                  transition={{ duration: 1, delay: 0.5 }}
                  className="h-full bg-gradient-to-r from-[#4786F5] to-[#4DD6FF] rounded-full"
                />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {500 - xpProgress} XP until Level {currentLevel + 1}
              </p>
            </GlassCard>
          </motion.div>

          {/* Filters */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mb-6"
          >
            <GlassCard className="!p-4">
              <div className="flex flex-col lg:flex-row gap-4">
                {/* Category Filter */}
                <div className="flex gap-1 flex-wrap flex-1">
                  {categories.map((category) => (
                    <button
                      key={category}
                      onClick={() => setSelectedCategory(category)}
                      className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                        selectedCategory === category
                          ? "bg-amber-500 text-white"
                          : "bg-white/5 text-muted-foreground hover:bg-white/10"
                      }`}
                    >
                      {category}
                    </button>
                  ))}
                </div>

                {/* Status Filter */}
                <div className="flex gap-2">
                  {(["all", "unlocked", "locked"] as const).map((status) => (
                    <button
                      key={status}
                      onClick={() => setShowUnlocked(status)}
                      className={`px-3 py-1.5 text-sm rounded-lg transition-colors capitalize ${
                        showUnlocked === status
                          ? "bg-[#0A938A] text-white"
                          : "bg-white/5 text-muted-foreground hover:bg-white/10"
                      }`}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>
            </GlassCard>
          </motion.div>

          {/* Achievements Grid */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {filteredAchievements.map((achievement, index) => {
              const rarityStyles = getRarityStyles(achievement.rarity)
              const Icon = achievement.icon

              return (
                <motion.div
                  key={achievement.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                >
                  <GlassCard
                    className={`relative overflow-hidden ${!achievement.unlocked ? "opacity-60" : ""} ${rarityStyles.glow}`}
                  >
                    {/* Rarity badge */}
                    <div className="absolute top-3 right-3">
                      <span
                        className={`px-2 py-0.5 text-xs rounded-full capitalize ${rarityStyles.bg} ${rarityStyles.border} ${rarityStyles.text} border`}
                      >
                        {achievement.rarity}
                      </span>
                    </div>

                    {/* Icon */}
                    <div
                      className={`w-14 h-14 rounded-xl ${rarityStyles.bg} ${rarityStyles.border} border flex items-center justify-center mb-4`}
                    >
                      {achievement.unlocked ? (
                        <Icon className={`w-7 h-7 ${rarityStyles.text}`} />
                      ) : (
                        <Lock className="w-7 h-7 text-muted-foreground" />
                      )}
                    </div>

                    {/* Content */}
                    <h3 className="text-lg font-semibold text-foreground mb-1">{achievement.title}</h3>
                    <p className="text-sm text-muted-foreground mb-4">{achievement.description}</p>

                    {/* Progress */}
                    <div className="mb-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-muted-foreground">Progress</span>
                        <span className="text-xs text-foreground">{Math.round(achievement.progress)}%</span>
                      </div>
                      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${achievement.progress}%` }}
                          transition={{ duration: 0.5, delay: 0.3 + index * 0.05 }}
                          className={`h-full rounded-full ${
                            achievement.unlocked
                              ? "bg-gradient-to-r from-emerald-500 to-emerald-400"
                              : "bg-gradient-to-r from-[#4786F5] to-[#4DD6FF]"
                          }`}
                        />
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between text-sm">
                      <span className={`font-medium ${rarityStyles.text}`}>+{achievement.xp} XP</span>
                      {achievement.unlocked && (
                        <span className="text-emerald-400 text-xs flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          Unlocked
                        </span>
                      )}
                    </div>
                  </GlassCard>
                </motion.div>
              )
            })}
          </motion.div>

          {filteredAchievements.length === 0 && (
            <GlassCard className="text-center py-12">
              <Trophy className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">No achievements found</h3>
              <p className="text-muted-foreground">Try adjusting your filters</p>
            </GlassCard>
          )}
        </div>
      </div>
    </main>
  )
}
