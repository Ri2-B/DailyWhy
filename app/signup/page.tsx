"use client"

import type React from "react"
import { motion } from "framer-motion"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { createBrowserClient } from "@supabase/ssr"
import { AnimatedBackground } from "@/components/ui/animated-background"
import { GlassCard } from "@/components/ui/glass-card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Brain, Mail, Lock, User, ArrowRight, Github, Chrome, CheckCircle2, Loader2 } from "lucide-react"

const benefits = ["AI-powered decision analysis", "Track your outcomes over time", "Build better habits with streaks"]

export default function SignupPage() {
  const router = useRouter()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (error) {
        console.error('Signup error:', error)
        setError(error.message)
        return
      }

      if (data.user) {
        // If email confirmation is disabled in Supabase, session will exist
        if (data.session) {
          router.push("/dashboard")
          router.refresh()
        } else {
          // Email confirmation is enabled - show success message
          setSuccess(true)
        }
      }
    } catch (err) {
      console.error('Unexpected signup error:', err)
      setError("An unexpected error occurred. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleOAuthSignup = async (provider: "github" | "google") => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (error) {
        setError(error.message)
      }
    } catch (err) {
      setError("An unexpected error occurred")
    }
  }

  if (success) {
    return (
      <main className="min-h-screen relative flex items-center justify-center p-4">
        <AnimatedBackground />
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md relative z-10"
        >
          <GlassCard variant="glow-teal" hover={false}>
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-r from-[#0A938A] to-[#50C2B8] flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-2">Check Your Email</h2>
              <p className="text-muted-foreground mb-6">
                We've sent a confirmation link to <strong>{email}</strong>. Click the link to activate your account.
              </p>
              <Link
                href="/login"
                className="inline-block py-3 px-6 rounded-xl font-semibold text-white bg-gradient-to-r from-[#0A938A] to-[#50C2B8] hover:shadow-lg transition-all"
              >
                Go to Login
              </Link>
            </div>
          </GlassCard>
        </motion.div>
      </main>
    )
  }

  return (
    <main className="min-h-screen relative flex items-center justify-center p-4">
      <AnimatedBackground />

      <div className="w-full max-w-4xl grid lg:grid-cols-2 gap-8 items-center relative z-10">
        {/* Left side - Benefits */}
        <motion.div
          initial={{ opacity: 0, x: -40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="hidden lg:block"
        >
          <h2 className="text-3xl font-bold text-foreground mb-6">Start Your Journey to Better Decisions</h2>
          <div className="space-y-4">
            {benefits.map((benefit, index) => (
              <motion.div
                key={benefit}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: 0.2 + index * 0.1 }}
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

        {/* Right side - Form */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          {/* Logo for mobile */}
          <Link href="/" className="flex items-center justify-center gap-3 mb-8 lg:hidden">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#0A938A] to-[#50C2B8] flex items-center justify-center">
              <Brain className="w-7 h-7 text-white" />
            </div>
            <span className="text-2xl font-bold text-foreground">DailyWhy</span>
          </Link>

          <GlassCard variant="glow-cyan" hover={false}>
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold text-foreground mb-2">Create Your Account</h1>
              <p className="text-muted-foreground">Get started with DailyWhy today</p>
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm"
              >
                {error}
              </motion.div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-foreground">
                  Full Name
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="name"
                    type="text"
                    placeholder="John Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="pl-10 bg-white/5 border-white/10 text-foreground placeholder:text-muted-foreground focus:border-[#4DD6FF]"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-foreground">
                  Email
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="pl-10 bg-white/5 border-white/10 text-foreground placeholder:text-muted-foreground focus:border-[#4DD6FF]"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-foreground">
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    className="pl-10 bg-white/5 border-white/10 text-foreground placeholder:text-muted-foreground focus:border-[#4DD6FF]"
                  />
                </div>
                <p className="text-xs text-muted-foreground">Must be at least 6 characters</p>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 rounded-xl font-semibold text-white bg-gradient-to-r from-[#4786F5] to-[#4DD6FF] hover:shadow-lg hover:scale-[1.02] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    Create Account
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/10" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-[#030614] text-muted-foreground">or continue with</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleOAuthSignup("github")}
                className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-foreground hover:bg-white/10 transition-colors"
              >
                <Github className="w-5 h-5" />
                <span>GitHub</span>
              </button>
              <button
                type="button"
                onClick={() => handleOAuthSignup("google")}
                className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-foreground hover:bg-white/10 transition-colors"
              >
                <Chrome className="w-5 h-5" />
                <span>Google</span>
              </button>
            </div>

            <p className="text-center text-muted-foreground mt-6">
              Already have an account?{" "}
              <Link href="/login" className="text-[#4DD6FF] hover:underline font-medium">
                Sign in
              </Link>
            </p>
          </GlassCard>
        </motion.div>
      </div>
    </main>
  )
}
