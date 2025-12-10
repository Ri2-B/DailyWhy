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
import { Input } from "@/components/ui/input"
import {
  History,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  MinusCircle,
  Clock,
  Brain,
  ChevronRight,
  Calendar,
  TrendingUp,
  ArrowUpDown,
  Loader2,
  PlusCircle,
} from "lucide-react"

interface Decision {
  id: string
  title: string
  description: string
  options: { id: number; text: string; pros?: string[]; cons?: string[] }[]
  chosen_option?: { id: number; text: string }
  is_completed: boolean
  category: string
  ai_summary?: string
  confidence_score?: number
  created_at: string
}

const categories = ["All", "Career", "Health", "Finance", "Personal", "Education"]
const outcomeFilters = ["All", "Success", "Neutral", "Failure", "Pending"]

function getOutcomeIcon(outcome: string) {
  switch (outcome) {
    case "success":
      return <CheckCircle2 className="w-5 h-5 text-emerald-400" />
    case "failure":
      return <XCircle className="w-5 h-5 text-red-400" />
    case "neutral":
      return <MinusCircle className="w-5 h-5 text-amber-400" />
    default:
      return <Clock className="w-5 h-5 text-blue-400" />
  }
}

function getOutcomeBadge(outcome: string) {
  const styles = {
    success: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    failure: "bg-red-500/20 text-red-400 border-red-500/30",
    neutral: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    pending: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  }
  return styles[outcome as keyof typeof styles] || styles.pending
}

function formatDate(dateString: string) {
  const date = new Date(dateString)
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function getRelativeTime(dateString: string) {
  const date = new Date(dateString)
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return "Today"
  if (diffDays === 1) return "Yesterday"
  if (diffDays < 7) return `${diffDays} days ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
  return `${Math.floor(diffDays / 30)} months ago`
}

export default function HistoryPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("All")
  const [selectedOutcome, setSelectedOutcome] = useState("All")
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest")
  const [decisions, setDecisions] = useState<Decision[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    const loadDecisions = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        
        if (!user) return

        const { data, error } = await supabase
          .from('decisions')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })

        if (error) {
          console.error('Error loading decisions:', error)
          return
        }

        if (data) {
          setDecisions(data)
        }
      } catch (err) {
        console.error('History error:', err)
      } finally {
        setIsLoading(false)
      }
    }

    loadDecisions()
  }, [supabase])

  // Transform and filter decisions
  const transformedDecisions = decisions.map(d => ({
    id: d.id,
    title: d.title,
    description: d.description || '',
    options: d.options?.map((opt: { id: number; text: string }) => opt.text) || [],
    chosenOption: d.chosen_option?.text,
    outcome: d.is_completed ? 'success' as const : 'pending' as const,
    createdAt: d.created_at,
    category: d.category?.charAt(0).toUpperCase() + d.category?.slice(1) || 'Personal',
    aiRecommendation: d.ai_summary?.includes('Recommended:') 
      ? d.ai_summary.split('Recommended:')[1]?.split('(')[0]?.trim()
      : undefined,
    confidenceScore: d.confidence_score ? Math.round(d.confidence_score * 100) : 0
  }))

  // Filter and sort decisions
  const filteredDecisions = transformedDecisions
    .filter((decision) => {
      const matchesSearch =
        decision.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        decision.description.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesCategory = selectedCategory === "All" || decision.category === selectedCategory
      const matchesOutcome =
        selectedOutcome === "All" || decision.outcome.toLowerCase() === selectedOutcome.toLowerCase()
      return matchesSearch && matchesCategory && matchesOutcome
    })
    .sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime()
      const dateB = new Date(b.createdAt).getTime()
      return sortOrder === "newest" ? dateB - dateA : dateA - dateB
    })

  // Stats
  const stats = {
    total: decisions.length,
    success: decisions.filter((d) => d.is_completed).length,
    pending: decisions.filter((d) => !d.is_completed).length,
    aiAccuracy: decisions.length > 0 
      ? Math.round((decisions.filter((d) => d.is_completed).length / decisions.length) * 100)
      : 0,
  }

  if (isLoading) {
    return (
      <main className="min-h-screen relative flex items-center justify-center">
        <AnimatedBackground />
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-[#4DD6FF]" />
          <p className="text-muted-foreground">Loading history...</p>
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
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0A938A] to-[#50C2B8] flex items-center justify-center">
                <History className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-3xl font-bold text-foreground">Decision History</h1>
            </div>
            <p className="text-muted-foreground">Review all your past decisions and their outcomes</p>
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
                <div className="w-10 h-10 rounded-lg bg-[#4786F5]/20 flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-[#4DD6FF]" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stats.total}</p>
                  <p className="text-sm text-muted-foreground">Total Decisions</p>
                </div>
              </div>
            </GlassCard>

            <GlassCard className="!p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stats.success}</p>
                  <p className="text-sm text-muted-foreground">Successful</p>
                </div>
              </div>
            </GlassCard>

            <GlassCard className="!p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stats.pending}</p>
                  <p className="text-sm text-muted-foreground">Pending</p>
                </div>
              </div>
            </GlassCard>

            <GlassCard className="!p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#0A938A]/20 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-[#50C2B8]" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stats.aiAccuracy}%</p>
                  <p className="text-sm text-muted-foreground">AI Accuracy</p>
                </div>
              </div>
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
                {/* Search */}
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Search decisions..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 bg-white/5 border-white/10 text-foreground placeholder:text-muted-foreground"
                  />
                </div>

                {/* Category Filter */}
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-muted-foreground" />
                  <div className="flex gap-1 flex-wrap">
                    {categories.map((category) => (
                      <button
                        key={category}
                        onClick={() => setSelectedCategory(category)}
                        className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                          selectedCategory === category
                            ? "bg-[#4786F5] text-white"
                            : "bg-white/5 text-muted-foreground hover:bg-white/10"
                        }`}
                      >
                        {category}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Sort Toggle */}
                <button
                  onClick={() => setSortOrder(sortOrder === "newest" ? "oldest" : "newest")}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 text-muted-foreground hover:bg-white/10 transition-colors"
                >
                  <ArrowUpDown className="w-4 h-4" />
                  {sortOrder === "newest" ? "Newest first" : "Oldest first"}
                </button>
              </div>

              {/* Outcome Filter */}
              <div className="flex gap-2 mt-4 pt-4 border-t border-white/10">
                <span className="text-sm text-muted-foreground mr-2">Outcome:</span>
                {outcomeFilters.map((outcome) => (
                  <button
                    key={outcome}
                    onClick={() => setSelectedOutcome(outcome)}
                    className={`px-3 py-1 text-sm rounded-full transition-colors ${
                      selectedOutcome === outcome
                        ? "bg-[#0A938A] text-white"
                        : "bg-white/5 text-muted-foreground hover:bg-white/10"
                    }`}
                  >
                    {outcome}
                  </button>
                ))}
              </div>
            </GlassCard>
          </motion.div>

          {/* Decision List */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="space-y-4"
          >
            {filteredDecisions.length === 0 ? (
              <GlassCard className="text-center py-12">
                <History className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {decisions.length === 0 ? "No decisions yet" : "No decisions found"}
                </h3>
                <p className="text-muted-foreground mb-4">
                  {decisions.length === 0 
                    ? "Start making AI-powered decisions to see them here!" 
                    : "Try adjusting your filters or search query"
                  }
                </p>
                <Link href="/create">
                  <GradientButton variant="teal">
                    <PlusCircle className="w-4 h-4 mr-2" />
                    {decisions.length === 0 ? "Create Your First Decision" : "Make a new decision"}
                  </GradientButton>
                </Link>
              </GlassCard>
            ) : (
              filteredDecisions.map((decision, index) => (
                <motion.div
                  key={decision.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                >
                  <Link href={`/decision/${decision.id}`}>
                    <GlassCard className="group hover:border-[#4DD6FF]/30 transition-all cursor-pointer">
                      <div className="flex items-start gap-4">
                        {/* Outcome Icon */}
                        <div className="flex-shrink-0 mt-1">{getOutcomeIcon(decision.outcome)}</div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <h3 className="text-lg font-semibold text-foreground group-hover:text-[#4DD6FF] transition-colors">
                                {decision.title}
                              </h3>
                              <p className="text-sm text-muted-foreground mt-1 line-clamp-1">{decision.description}</p>
                            </div>
                            <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-[#4DD6FF] transition-colors flex-shrink-0" />
                          </div>

                          {/* Meta info */}
                          <div className="flex flex-wrap items-center gap-3 mt-3">
                            {/* Category */}
                            <span className="px-2 py-0.5 text-xs rounded-full bg-[#4786F5]/20 text-[#4DD6FF] border border-[#4786F5]/30">
                              {decision.category}
                            </span>

                            {/* Outcome Badge */}
                            <span
                              className={`px-2 py-0.5 text-xs rounded-full border capitalize ${getOutcomeBadge(decision.outcome)}`}
                            >
                              {decision.outcome}
                            </span>

                            {/* Chosen Option */}
                            {decision.chosenOption && (
                              <span className="text-sm text-muted-foreground">
                                Chose: <span className="text-foreground font-medium">{decision.chosenOption}</span>
                              </span>
                            )}

                            {/* AI Match */}
                            {decision.chosenOption === decision.aiRecommendation && (
                              <span className="flex items-center gap-1 text-xs text-[#50C2B8]">
                                <Brain className="w-3 h-3" />
                                AI Match
                              </span>
                            )}

                            {/* Date */}
                            <span className="text-sm text-muted-foreground ml-auto">
                              {getRelativeTime(decision.createdAt)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </GlassCard>
                  </Link>
                </motion.div>
              ))
            )}
          </motion.div>

          {/* Load More */}
          {filteredDecisions.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.5 }}
              className="text-center mt-8"
            >
              <button className="px-6 py-2 rounded-lg bg-white/5 border border-white/10 text-muted-foreground hover:bg-white/10 transition-colors">
                Load more decisions
              </button>
            </motion.div>
          )}
        </div>
      </div>
    </main>
  )
}
