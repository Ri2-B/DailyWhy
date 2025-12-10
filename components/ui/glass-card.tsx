"use client"

import { motion, type HTMLMotionProps } from "framer-motion"
import { cn } from "@/lib/utils"
import { forwardRef, type ReactNode } from "react"

interface GlassCardProps extends Omit<HTMLMotionProps<"div">, "children"> {
  children: ReactNode
  className?: string
  variant?: "default" | "glow-teal" | "glow-cyan" | "glow-orange"
  hover?: boolean
}

const GlassCard = forwardRef<HTMLDivElement, GlassCardProps>(
  ({ children, className, variant = "default", hover = true, ...props }, ref) => {
    const glowClasses = {
      default: "",
      "glow-teal": "glow-teal",
      "glow-cyan": "glow-cyan",
      "glow-orange": "glow-orange",
    }

    return (
      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        whileHover={hover ? { scale: 1.02, y: -5 } : undefined}
        className={cn(
          "backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6",
          glowClasses[variant],
          hover && "transition-shadow duration-300 hover:border-white/20",
          className,
        )}
        {...props}
      >
        {children}
      </motion.div>
    )
  },
)

GlassCard.displayName = "GlassCard"

export { GlassCard }
