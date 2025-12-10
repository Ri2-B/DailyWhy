"use client"

import { motion, AnimatePresence } from "framer-motion"
import { useState, useEffect } from "react"
import { GlassCard } from "@/components/ui/glass-card"
import { Brain, Sparkles, CheckCircle2 } from "lucide-react"

interface ReasoningStep {
  id: number
  text: string
  complete: boolean
}

interface ReasoningRevealProps {
  isAnalyzing: boolean
  reasoning?: string[]
  conclusion?: string
}

export function ReasoningReveal({ isAnalyzing, reasoning = [], conclusion }: ReasoningRevealProps) {
  const [steps, setSteps] = useState<ReasoningStep[]>([])
  const [showConclusion, setShowConclusion] = useState(false)

  useEffect(() => {
    if (isAnalyzing && reasoning.length > 0) {
      setSteps([])
      setShowConclusion(false)

      reasoning.forEach((text, index) => {
        setTimeout(() => {
          setSteps((prev) => [...prev, { id: index, text, complete: false }])
          setTimeout(() => {
            setSteps((prev) => prev.map((step) => (step.id === index ? { ...step, complete: true } : step)))
          }, 1500)
        }, index * 2000)
      })

      setTimeout(
        () => {
          setShowConclusion(true)
        },
        reasoning.length * 2000 + 500,
      )
    }
  }, [isAnalyzing, reasoning])

  if (!isAnalyzing && steps.length === 0) return null

  return (
    <GlassCard variant="glow-cyan" className="mt-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-[#4786F5] to-[#4DD6FF] flex items-center justify-center">
          <Brain className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="font-semibold text-foreground">AI Analysis</h3>
          <p className="text-sm text-muted-foreground">Thinking through your options...</p>
        </div>
      </div>

      <div className="space-y-3">
        <AnimatePresence>
          {steps.map((step) => (
            <motion.div
              key={step.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4 }}
              className="flex items-start gap-3"
            >
              <div className="mt-1">
                {step.complete ? (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="w-5 h-5 rounded-full bg-gradient-to-r from-[#0A938A] to-[#50C2B8] flex items-center justify-center"
                  >
                    <CheckCircle2 className="w-3 h-3 text-white" />
                  </motion.div>
                ) : (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
                    className="w-5 h-5 rounded-full border-2 border-[#4DD6FF] border-t-transparent"
                  />
                )}
              </div>
              <p className="text-sm text-foreground/80">{step.text}</p>
            </motion.div>
          ))}
        </AnimatePresence>

        <AnimatePresence>
          {showConclusion && conclusion && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="mt-4 pt-4 border-t border-white/10"
            >
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-[#E76A18]" />
                <span className="text-sm font-semibold text-[#E76A18]">Recommendation</span>
              </div>
              <p className="text-foreground font-medium">{conclusion}</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </GlassCard>
  )
}
