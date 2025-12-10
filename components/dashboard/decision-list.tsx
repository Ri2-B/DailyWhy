"use client"

import { motion } from "framer-motion"
import { GlassCard } from "@/components/ui/glass-card"
import { CheckCircle2, Clock, XCircle, ChevronRight } from "lucide-react"
import Link from "next/link"

interface Decision {
  id: string
  title: string
  options: string[]
  chosenOption?: string
  outcome?: "success" | "neutral" | "failure"
  createdAt: string
  aiRecommendation?: string
}

interface DecisionListProps {
  decisions: Decision[]
}

export function DecisionList({ decisions }: DecisionListProps) {
  const getOutcomeIcon = (outcome?: Decision["outcome"]) => {
    switch (outcome) {
      case "success":
        return <CheckCircle2 className="w-5 h-5 text-[#50C2B8]" />
      case "failure":
        return <XCircle className="w-5 h-5 text-[#E76A18]" />
      default:
        return <Clock className="w-5 h-5 text-[#4DD6FF]" />
    }
  }

  const getOutcomeBg = (outcome?: Decision["outcome"]) => {
    switch (outcome) {
      case "success":
        return "from-[#0A938A]/20 to-[#50C2B8]/20"
      case "failure":
        return "from-[#E76A18]/20 to-[#EED9B6]/20"
      default:
        return "from-[#4786F5]/20 to-[#4DD6FF]/20"
    }
  }

  return (
    <div className="space-y-4">
      {decisions.map((decision, index) => (
        <motion.div
          key={decision.id}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: index * 0.1 }}
        >
          <Link href={`/decision/${decision.id}`}>
            <GlassCard hover className="cursor-pointer">
              <div className="flex items-center gap-4">
                <div
                  className={`w-12 h-12 rounded-xl bg-gradient-to-r ${getOutcomeBg(decision.outcome)} flex items-center justify-center flex-shrink-0`}
                >
                  {getOutcomeIcon(decision.outcome)}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground truncate">{decision.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {decision.options.length} options • {decision.createdAt}
                  </p>
                  {decision.chosenOption && (
                    <p className="text-sm text-[#50C2B8] mt-1">Chose: {decision.chosenOption}</p>
                  )}
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
              </div>
            </GlassCard>
          </Link>
        </motion.div>
      ))}
    </div>
  )
}
