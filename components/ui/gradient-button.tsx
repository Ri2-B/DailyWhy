"use client"

import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react"

interface GradientButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 
  'onDrag' | 'onDragStart' | 'onDragEnd' | 'onAnimationStart' | 'onAnimationEnd' | 'onAnimationIteration'
> {
  children: ReactNode
  variant?: "teal" | "cyan" | "orange" | "blue" | "purple"
  size?: "sm" | "md" | "lg"
}

const GradientButton = forwardRef<HTMLButtonElement, GradientButtonProps>(
  ({ children, className, variant = "teal", size = "md", ...props }, ref) => {
    const gradients = {
      teal: "bg-gradient-to-r from-[#0A938A] to-[#50C2B8]",
      cyan: "bg-gradient-to-r from-[#4786F5] to-[#4DD6FF]",
      orange: "bg-gradient-to-r from-[#E76A18] to-[#EED9B6]",
      blue: "bg-gradient-to-r from-[#03065C] to-[#2B40D8]",
      purple: "bg-gradient-to-r from-[#7C3AED] to-[#A78BFA]",
    }

    const sizes = {
      sm: "px-4 py-2 text-sm",
      md: "px-6 py-3 text-base",
      lg: "px-8 py-4 text-lg",
    }

    return (
      <motion.button
        ref={ref}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className={cn(
          "relative font-semibold text-white rounded-xl overflow-hidden",
          "shadow-lg transition-shadow duration-300",
          gradients[variant],
          sizes[size],
          "hover:shadow-xl",
          className,
        )}
        {...props}
      >
        <span className="relative z-10">{children}</span>
        <motion.div
          className="absolute inset-0 bg-white/20"
          initial={{ x: "-100%", opacity: 0 }}
          whileHover={{ x: "100%", opacity: 1 }}
          transition={{ duration: 0.5 }}
        />
      </motion.button>
    )
  },
)

GradientButton.displayName = "GradientButton"

export { GradientButton }
