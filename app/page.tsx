"use client"

import { motion } from "framer-motion"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { AnimatedBackground } from "@/components/ui/animated-background"
import { GlassCard } from "@/components/ui/glass-card"
import { Navbar } from "@/components/layout/navbar"
import { Brain, Sparkles, TrendingUp, Zap, Target, BarChart3, ArrowRight, CheckCircle2 } from "lucide-react"

const features = [
  {
    icon: Brain,
    title: "AI-Powered Analysis",
    description: "Get intelligent insights on your options with advanced reasoning",
    gradient: "from-[#0A938A] to-[#50C2B8]",
  },
  {
    icon: TrendingUp,
    title: "Track Outcomes",
    description: "Log results and see patterns in your decision-making over time",
    gradient: "from-[#4786F5] to-[#4DD6FF]",
  },
  {
    icon: Zap,
    title: "Daily Challenges",
    description: "Build better habits with micro-challenges and life hacks",
    gradient: "from-[#E76A18] to-[#EED9B6]",
  },
  {
    icon: BarChart3,
    title: "Insights Dashboard",
    description: "Visualize your progress with beautiful charts and analytics",
    gradient: "from-[#03065C] to-[#2B40D8]",
  },
]

const benefits = [
  "Make decisions 3x faster with AI assistance",
  "Track success rates across all your choices",
  "Build decision-making streaks and habits",
  "Get personalized improvement suggestions",
]

export default function LandingPage() {
  const router = useRouter()

  const handleNavigation = (path: string) => {
    router.push(path)
  }

  return (
    <main className="min-h-screen relative">
      <AnimatedBackground />
      <Navbar />

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-6">
              <Sparkles className="w-4 h-4 text-[#4DD6FF]" />
              <span className="text-sm text-muted-foreground">AI-powered decision assistant</span>
            </div>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-5xl md:text-7xl font-bold text-foreground mb-6 text-balance"
          >
            Make{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#0A938A] to-[#50C2B8]">
              Better Decisions
            </span>
            <br />
            Every Single Day
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8 text-pretty"
          >
            Your personal AI assistant that analyzes options, tracks outcomes, and helps you build better
            decision-making habits.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 relative z-10"
          >
            <button
              onClick={() => handleNavigation('/signup')}
              className="relative font-semibold text-white rounded-xl overflow-hidden shadow-lg transition-all duration-300 bg-gradient-to-r from-[#0A938A] to-[#50C2B8] px-8 py-4 text-lg hover:shadow-xl hover:scale-105 inline-flex items-center cursor-pointer"
            >
              Start Making Better Decisions
              <ArrowRight className="w-5 h-5 ml-2" />
            </button>
            <button
              onClick={() => handleNavigation('/login')}
              className="px-8 py-4 text-lg font-semibold text-foreground border border-white/20 rounded-xl hover:bg-white/5 transition-all duration-300 hover:scale-105 cursor-pointer"
            >
              Sign In
            </button>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Everything You Need to Decide Better
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Powerful tools to analyze, track, and improve your decision-making process
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <GlassCard hover className="h-full">
                  <div
                    className={`w-14 h-14 rounded-2xl bg-gradient-to-r ${feature.gradient} flex items-center justify-center mb-4`}
                  >
                    <feature.icon className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </GlassCard>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">Why DailyWhy?</h2>
              <div className="space-y-4">
                {benefits.map((benefit, index) => (
                  <motion.div
                    key={benefit}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: index * 0.1 }}
                    className="flex items-center gap-3"
                  >
                    <div className="w-6 h-6 rounded-full bg-gradient-to-r from-[#0A938A] to-[#50C2B8] flex items-center justify-center flex-shrink-0">
                      <CheckCircle2 className="w-4 h-4 text-white" />
                    </div>
                    <p className="text-lg text-foreground">{benefit}</p>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <GlassCard variant="glow-teal" className="p-8">
                <div className="text-center">
                  <div className="w-20 h-20 rounded-3xl bg-gradient-to-r from-[#0A938A] to-[#50C2B8] flex items-center justify-center mx-auto mb-6">
                    <Target className="w-10 h-10 text-white" />
                  </div>
                  <div className="text-5xl font-bold text-foreground mb-2">87%</div>
                  <p className="text-lg text-muted-foreground">of users report better decision outcomes</p>
                </div>
              </GlassCard>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <GlassCard variant="glow-cyan" className="text-center p-12">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                Ready to Transform Your Decision-Making?
              </h2>
              <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto">
                Join thousands of users who are making smarter choices every day with DailyWhy.
              </p>
              <button
                onClick={() => handleNavigation('/signup')}
                className="relative font-semibold text-white rounded-xl overflow-hidden shadow-lg transition-all duration-300 bg-gradient-to-r from-[#0A938A] to-[#50C2B8] px-8 py-4 text-lg hover:shadow-xl hover:scale-105 inline-flex items-center cursor-pointer"
              >
                Get Started Free
                <ArrowRight className="w-5 h-5 ml-2" />
              </button>
            </motion.div>
          </GlassCard>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-white/10">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#0A938A] to-[#50C2B8] flex items-center justify-center">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <span className="font-semibold text-foreground">DailyWhy</span>
          </div>
          <p className="text-sm text-muted-foreground">© 2025 DailyWhy. All rights reserved.</p>
        </div>
      </footer>
    </main>
  )
}
