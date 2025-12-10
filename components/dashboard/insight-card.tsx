"use client"

import { motion } from "framer-motion"
import { GlassCard } from "@/components/ui/glass-card"
import { TrendingUp, TrendingDown, Minus } from "lucide-react"
import type { ReactNode } from "react"

interface InsightCardProps {
  title: string
  value: string | number
  change?: number
  icon: ReactNode
  delay?: number
}

export function InsightCard({ title, value, change, icon, delay = 0 }: InsightCardProps) {
  const getTrendIcon = () => {
    if (!change) return <Minus className="w-4 h-4 text-muted-foreground" />
    if (change > 0) return <TrendingUp className="w-4 h-4 text-[#50C2B8]" />
    return <TrendingDown className="w-4 h-4 text-[#E76A18]" />
  }

  const getTrendColor = () => {
    if (!change) return "text-muted-foreground"
    if (change > 0) return "text-[#50C2B8]"
    return "text-[#E76A18]"
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay }}>
      <GlassCard hover>
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground mb-1">{title}</p>
            <p className="text-3xl font-bold text-foreground">{value}</p>
            {change !== undefined && (
              <div className="flex items-center gap-1 mt-2">
                {getTrendIcon()}
                <span className={`text-sm font-medium ${getTrendColor()}`}>
                  {change > 0 ? "+" : ""}
                  {change}% from last week
                </span>
              </div>
            )}
          </div>
          <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-[#0A938A]/20 to-[#50C2B8]/20 flex items-center justify-center">
            {icon}
          </div>
        </div>
      </GlassCard>
    </motion.div>
  )
}
