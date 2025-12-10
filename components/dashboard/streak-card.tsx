"use client"

import { motion } from "framer-motion"
import { GlassCard } from "@/components/ui/glass-card"
import { Flame, Target, Zap } from "lucide-react"

interface StreakCardProps {
  currentStreak: number
  longestStreak: number
  decisionsThisWeek: number
}

export function StreakCard({ currentStreak, longestStreak, decisionsThisWeek }: StreakCardProps) {
  return (
    <GlassCard variant="glow-orange" className="relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-32 h-32 opacity-10">
        <Flame className="w-full h-full text-[#E76A18]" />
      </div>

      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-4">
          <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 1.5, repeat: Number.POSITIVE_INFINITY }}>
            <Flame className="w-6 h-6 text-[#E76A18]" />
          </motion.div>
          <h3 className="text-lg font-semibold text-foreground">Your Streak</h3>
        </div>

        <div className="text-5xl font-bold text-foreground mb-2">
          {currentStreak} <span className="text-2xl text-muted-foreground">days</span>
        </div>

        <div className="flex gap-4 mt-4">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-[#50C2B8]" />
            <span className="text-sm text-muted-foreground">Best: {longestStreak} days</span>
          </div>
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-[#4DD6FF]" />
            <span className="text-sm text-muted-foreground">{decisionsThisWeek} this week</span>
          </div>
        </div>
      </div>
    </GlassCard>
  )
}
