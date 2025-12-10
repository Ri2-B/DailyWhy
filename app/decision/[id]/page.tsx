"use client"

import { motion } from "framer-motion"
import { useState, useEffect } from "react"
import { createBrowserClient } from "@supabase/ssr"
import { useRouter, useParams } from "next/navigation"
import { Sidebar } from "@/components/layout/sidebar"
import { GradientButton } from "@/components/ui/gradient-button"
import { Brain, CheckCircle2, ArrowLeft, Calendar, Trophy, ThumbsUp, ThumbsDown, Meh, Sparkles, Loader, X, RotateCcw, Plus, Minus } from "lucide-react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"

interface Decision {
  id: string
  title: string
  context: string
  options: Array<{
    id: string
    text: string
    score: number
    pros?: string[]
    cons?: string[]
  }>
  chosen_option: string | null
  outcome: "success" | "neutral" | "failure" | null
  ai_recommendation: string
  ai_reasoning: string
  created_at: string
  decided_at: string | null
  reviewed_at: string | null
}

export default function DecisionDetailPage() {
  const router = useRouter()
  const params = useParams()
  const decisionId = params.id as string

  const [decision, setDecision] = useState<Decision | null>(null)
  const [selectedOption, setSelectedOption] = useState<string>("")
  const [selectedOutcome, setSelectedOutcome] = useState<"success" | "neutral" | "failure" | null>(null)
  const [outcomeNotes, setOutcomeNotes] = useState("")
  const [lessonsLearned, setLessonsLearned] = useState("")
  const [wouldDecideSame, setWouldDecideSame] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [aiFeedback, setAiFeedback] = useState<string | null>(null)
  const [generatingFeedback, setGeneratingFeedback] = useState(false)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  // Fetch decision from Supabase
  useEffect(() => {
    const fetchDecision = async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from("decisions")
          .select("*")
          .eq("id", decisionId)
          .single()

        if (fetchError) throw fetchError

        const parsedOptions = typeof data.options === "string" ? JSON.parse(data.options) : data.options

        setDecision({
          id: data.id,
          title: data.title,
          context: data.description || data.context,
          options: parsedOptions,
          chosen_option: data.chosen_option?.text || data.chosen_option,
          outcome: data.outcome,
          ai_recommendation: data.ai_summary || data.ai_recommendation,
          ai_reasoning: data.ai_reasoning || "",
          created_at: new Date(data.created_at).toLocaleDateString(),
          decided_at: data.decided_at ? new Date(data.decided_at).toLocaleDateString() : null,
          reviewed_at: data.reviewed_at ? new Date(data.reviewed_at).toLocaleDateString() : null,
        })

        setSelectedOption(data.chosen_option?.text || data.chosen_option || "")
        setSelectedOutcome(data.outcome)
      } catch (err) {
        setError("Failed to load decision")
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    fetchDecision()
  }, [decisionId, supabase])

  const handleSaveOutcome = async () => {
    if (!selectedOutcome) return

    setSaving(true)
    setError("")
    
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        throw new Error("You must be logged in to save outcomes")
      }

      // Verify the decision belongs to this user
      const { data: decisionData, error: decisionError } = await supabase
        .from("decisions")
        .select("user_id")
        .eq("id", decisionId)
        .single()

      if (decisionError || !decisionData) {
        throw new Error("Decision not found")
      }

      if (decisionData.user_id !== user.id) {
        throw new Error("You don't have permission to update this decision")
      }

      // Map UI outcome values to database outcome_type values
      const outcomeTypeMap = {
        success: "positive",
        neutral: "neutral", 
        failure: "negative"
      }

      // Check if outcome already exists for this decision
      const { data: existingOutcome } = await supabase
        .from("outcomes")
        .select("id")
        .eq("decision_id", decisionId)
        .maybeSingle()

      if (existingOutcome) {
        // Update existing outcome
        const { error: updateOutcomeError } = await supabase
          .from("outcomes")
          .update({
            outcome_type: outcomeTypeMap[selectedOutcome],
            outcome_score: selectedOutcome === "success" ? 8 : selectedOutcome === "failure" ? 3 : 5,
            notes: outcomeNotes,
            learned_lessons: lessonsLearned,
            would_decide_same: wouldDecideSame,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingOutcome.id)
          .eq("user_id", user.id)

        if (updateOutcomeError) {
          throw new Error(updateOutcomeError.message || "Failed to update outcome")
        }
      } else {
        // Insert new outcome
        const { error: insertOutcomeError } = await supabase
          .from("outcomes")
          .insert({
            decision_id: decisionId,
            user_id: user.id,
            outcome_type: outcomeTypeMap[selectedOutcome],
            outcome_score: selectedOutcome === "success" ? 8 : selectedOutcome === "failure" ? 3 : 5,
            notes: outcomeNotes,
            learned_lessons: lessonsLearned,
            would_decide_same: wouldDecideSame,
          })

        if (insertOutcomeError) {
          console.error("Insert outcome error details:", insertOutcomeError)
          throw new Error(insertOutcomeError.message || "Failed to save outcome")
        }
      }

      // Update decision to mark as completed and save chosen option
      const { error: updateError } = await supabase
        .from("decisions")
        .update({
          is_completed: true,
          completed_at: new Date().toISOString(),
          chosen_option: selectedOption,
        })
        .eq("id", decisionId)

      if (updateError) {
        console.error("Failed to update decision:", updateError)
      }

      // Check if this decision is linked to a habit and log the entry
      const { data: linkedHabits, error: habitLinkError } = await supabase
        .from("decision_habits")
        .select("habit_id, is_habit_forming")
        .eq("decision_id", decisionId)

      if (habitLinkError) {
        console.error("Error fetching habit links:", {
          message: habitLinkError.message,
          details: habitLinkError.details,
          hint: habitLinkError.hint,
          code: habitLinkError.code
        })
      }

      if (linkedHabits && linkedHabits.length > 0) {
        console.log("Found linked habits:", linkedHabits)
        
        // Log habit entry for each linked habit
        for (const link of linkedHabits) {
          const difficultyRating = selectedOutcome === "success" ? 1 : selectedOutcome === "neutral" ? 3 : 5
          
          const habitEntry = {
            habit_id: link.habit_id,
            user_id: user.id,
            decision_id: decisionId,
            difficulty_rating: difficultyRating,
            notes: outcomeNotes || `Decision outcome: ${selectedOutcome}`,
            mood: selectedOutcome === "success" ? "positive" : selectedOutcome === "failure" ? "challenging" : "neutral",
            completed_at: new Date().toISOString()
          }
          
          console.log("Attempting to insert habit entry:", habitEntry)
          
          const { data: insertedEntry, error: habitEntryError } = await supabase
            .from("habit_entries")
            .insert(habitEntry)
            .select()
          
          if (habitEntryError) {
            console.error("Error logging habit:", {
              message: habitEntryError.message,
              details: habitEntryError.details,
              hint: habitEntryError.hint,
              code: habitEntryError.code,
              entry: habitEntry
            })
          } else {
            console.log("Successfully logged habit entry:", insertedEntry)
            
            // Auto-generate insights for this habit
            try {
              const { error: insightError } = await supabase.rpc('generate_habit_insights', {
                p_habit_id: link.habit_id,
                p_user_id: user.id
              })
              
              if (insightError) {
                console.log("Note: Could not auto-generate insights (may need migration):", insightError.message)
              } else {
                console.log("Auto-generated insights for habit:", link.habit_id)
              }
            } catch (err) {
              console.log("Insights generation skipped:", err)
            }
          }
        }
      } else {
        console.log("No linked habits found for this decision")
      }

      setDecision(prev => prev ? { 
        ...prev, 
        chosen_option: selectedOption,
        outcome: selectedOutcome,
        reviewed_at: new Date().toLocaleDateString()
      } : null)
      
      // Generate AI feedback after saving
      await generateAIFeedback()
      
      // Don't redirect immediately, let user see AI feedback
      setTimeout(() => {
        if (window.confirm("Would you like to return to the dashboard?")) {
          router.push("/dashboard")
        }
      }, 2000)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to save outcome"
      setError(errorMessage)
    } finally {
      setSaving(false)
    }
  }

  const generateAIFeedback = async () => {
    setGeneratingFeedback(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Fetch user's decision history
      const { data: userDecisions } = await supabase
        .from("decisions")
        .select(`
          *,
          outcomes (
            outcome_type,
            outcome_score,
            would_decide_same
          )
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10)

      // Analyze patterns
      const totalDecisions = userDecisions?.length || 0
      const completedDecisions = userDecisions?.filter(d => d.is_completed).length || 0
      const successfulOutcomes = userDecisions?.filter(d => 
        d.outcomes?.[0]?.outcome_type === "positive"
      ).length || 0
      
      const followedAI = decision.chosen_option === decision.ai_recommendation
      const wasSuccessful = selectedOutcome === "success"

      // Generate feedback based on patterns
      let feedback = `📊 **Your Decision Profile:**\n`
      feedback += `You've made ${totalDecisions} decisions and completed ${completedDecisions} of them.\n`
      
      const successRate = completedDecisions > 0 ? Math.round(successfulOutcomes/completedDecisions*100) : 0
      if (successRate >= 70) {
        feedback += `Your ${successRate}% success rate is excellent! You're making strong choices.\n\n`
      } else if (successRate >= 50) {
        feedback += `Your ${successRate}% success rate is solid. You're doing well overall.\n\n`
      } else if (completedDecisions > 0) {
        feedback += `Your ${successRate}% success rate shows room for improvement. Let's learn from each decision.\n\n`
      } else {
        feedback += `This is your first completed decision - great start!\n\n`
      }

      feedback += `🎯 **What Just Happened:**\n`
      feedback += `You chose "${selectedOption}" and the outcome was ${selectedOutcome === "success" ? "successful" : selectedOutcome === "failure" ? "challenging" : "neutral"}.\n`
      
      if (followedAI) {
        feedback += `You followed my recommendation. `
        if (wasSuccessful) {
          feedback += `It worked out well! 🎉\n\n`
        } else {
          feedback += `It didn't go as planned, but that's okay - context matters more than recommendations.\n\n`
        }
      } else {
        feedback += `You went with your gut instead of my suggestion. `
        if (wasSuccessful) {
          feedback += `Your intuition was spot on! 💪\n\n`
        } else {
          feedback += `Next time, consider weighing both options more carefully.\n\n`
        }
      }

      feedback += `💡 **What to Remember:**\n`
      if (wasSuccessful) {
        feedback += `- Great decision! Think about what made this work well\n`
        feedback += `- Try to replicate this decision-making process\n`
        if (wouldDecideSame) {
          feedback += `- You said you'd decide the same again - that's confidence!\n`
        }
      } else {
        feedback += `- Every outcome teaches us something valuable\n`
        feedback += `- Review what you'd do differently next time\n`
        if (!wouldDecideSame) {
          feedback += `- You've already identified what to change - that's growth!\n`
        }
      }
      
      if (lessonsLearned) {
        feedback += `\n📝 **Your Key Lesson:**\n"${lessonsLearned}"\n`
      }

      setAiFeedback(feedback)
    } catch (err) {
      console.error("Error generating feedback:", err)
      setAiFeedback("Unable to generate AI feedback at this time. Please try again later.")
    } finally {
      setGeneratingFeedback(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
        <div className="flex flex-col items-center gap-4">
          <Loader className="w-8 h-8 text-[#50C2B8] animate-spin" />
          <p className="text-muted-foreground">Loading decision...</p>
        </div>
      </div>
    )
  }

  if (!decision || error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error || "Decision not found"}</p>
          <Link href="/dashboard">
            <GradientButton variant="cyan">Back to Dashboard</GradientButton>
          </Link>
        </div>
      </div>
    )
  }
  return (
    <div className="flex min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <Sidebar />

      <main className="flex-1 p-6">
        <div className="max-w-4xl mx-auto">
          {/* Back Button */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
            className="mb-6"
          >
            <Link href="/dashboard">
              <motion.button
                whileHover={{ x: -4 }}
                className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
                Back to Dashboard
              </motion.button>
            </Link>
          </motion.div>

          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-8"
          >
            <Card className="bg-gradient-to-br from-[#0A938A]/20 to-[#50C2B8]/20 border-[#50C2B8]/30">
              <CardHeader>
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <CardTitle className="text-2xl md:text-3xl mb-2">{decision.title}</CardTitle>
                    <p className="text-muted-foreground">{decision.context}</p>
                  </div>
                  {decision.chosen_option && (
                    <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-[#0A938A] to-[#50C2B8] text-white whitespace-nowrap">
                      <Trophy className="w-5 h-5" />
                      <span className="font-semibold">Chose: {decision.chosen_option}</span>
                    </div>
                  )}
                </div>

                {/* Timeline */}
                <div className="flex flex-wrap gap-6 mt-6 pt-6 border-t border-white/10">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Created: {decision.created_at}</span>
                  </div>
                  {decision.decided_at && (
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-[#50C2B8]" />
                      <span className="text-sm text-muted-foreground">Decided: {decision.decided_at}</span>
                    </div>
                  )}
                  {decision.reviewed_at && (
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-[#4DD6FF]" />
                      <span className="text-sm text-muted-foreground">Reviewed: {decision.reviewed_at}</span>
                    </div>
                  )}
                </div>
              </CardHeader>
            </Card>
          </motion.div>

          {/* Options Ranking */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mb-8"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-foreground">Options Analysis</h2>
              {decision.ai_reasoning && (
                <span className="text-sm text-muted-foreground">AI-powered insights</span>
              )}
            </div>
            <div className="space-y-6">
              {decision.options.map((option, index) => {
                const isChosen = option.text === decision.chosen_option
                const isRecommended = option.text === decision.ai_recommendation || option.score >= 80
                
                return (
                  <motion.div
                    key={option.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.4, delay: 0.2 + index * 0.1 }}
                  >
                    <Card
                      className={`border-white/10 overflow-hidden ${
                        isChosen ? "border-[#50C2B8] border-2 shadow-lg shadow-[#50C2B8]/20" : ""
                      }`}
                    >
                      <CardHeader className="pb-4">
                        <div className="flex items-start gap-4">
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                            isChosen 
                              ? "bg-gradient-to-r from-[#0A938A] to-[#50C2B8]" 
                              : "bg-white/5"
                          }`}>
                            <span className={`text-xl font-bold ${isChosen ? "text-white" : "text-muted-foreground"}`}>
                              #{index + 1}
                            </span>
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                              <h3 className="text-lg font-semibold text-foreground">{option.text}</h3>
                              {isRecommended && (
                                <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-[#0A938A]/20 text-[#50C2B8] text-xs font-medium">
                                  <Brain className="w-3 h-3" />
                                  Recommended
                                </span>
                              )}
                              {isChosen && (
                                <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-[#4DD6FF]/20 text-[#4DD6FF] text-xs font-medium">
                                  <CheckCircle2 className="w-3 h-3" />
                                  Your Choice
                                </span>
                              )}
                            </div>
                            
                            {/* AI Score */}
                            <div className="mb-3">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-sm text-muted-foreground">AI Confidence</span>
                                <span className="text-sm font-semibold text-foreground">{option.score}/100</span>
                              </div>
                              <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{ width: `${option.score}%` }}
                                  transition={{ duration: 1, delay: 0.5 + index * 0.1 }}
                                  className={`h-full rounded-full ${
                                    option.score >= 80 
                                      ? "bg-gradient-to-r from-[#0A938A] to-[#50C2B8]"
                                      : option.score >= 50
                                      ? "bg-gradient-to-r from-[#4786F5] to-[#4DD6FF]"
                                      : "bg-gradient-to-r from-[#E76A18] to-[#EED9B6]"
                                  }`}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                      
                      <CardContent>
                        {/* Pros and Cons */}
                        <div className="grid md:grid-cols-2 gap-4">
                          {/* Pros */}
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 mb-3">
                              <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center">
                                <Plus className="w-4 h-4 text-emerald-400" />
                              </div>
                              <h4 className="text-sm font-semibold text-emerald-400">Pros</h4>
                            </div>
                            {option.pros && option.pros.length > 0 ? (
                              <ul className="space-y-2">
                                {option.pros.map((pro, i) => (
                                  <motion.li
                                    key={`${option.id}-pro-${i}-${pro.substring(0, 20)}`}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.6 + index * 0.1 + i * 0.05 }}
                                    className="flex items-start gap-2 text-sm text-foreground"
                                  >
                                    <span className="text-emerald-400 mt-0.5">•</span>
                                    <span>{pro}</span>
                                  </motion.li>
                                ))}
                              </ul>
                            ) : (
                              <p className="text-sm text-muted-foreground italic">No specific pros listed</p>
                            )}
                          </div>
                          
                          {/* Cons */}
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 mb-3">
                              <div className="w-6 h-6 rounded-full bg-red-500/20 flex items-center justify-center">
                                <Minus className="w-4 h-4 text-red-400" />
                              </div>
                              <h4 className="text-sm font-semibold text-red-400">Cons</h4>
                            </div>
                            {option.cons && option.cons.length > 0 ? (
                              <ul className="space-y-2">
                                {option.cons.map((con, i) => (
                                  <motion.li
                                    key={`${option.id}-con-${i}-${con.substring(0, 20)}`}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.6 + index * 0.1 + i * 0.05 }}
                                    className="flex items-start gap-2 text-sm text-foreground"
                                  >
                                    <span className="text-red-400 mt-0.5">•</span>
                                    <span>{con}</span>
                                  </motion.li>
                                ))}
                              </ul>
                            ) : (
                              <p className="text-sm text-muted-foreground italic">No specific cons listed</p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                )
              })}
            </div>
            
            {/* AI Reasoning Summary */}
            {decision.ai_reasoning && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.4 }}
                className="mt-6"
              >
                <Card className="border-white/10 bg-gradient-to-br from-[#4786F5]/5 to-[#4DD6FF]/5">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <Brain className="w-5 h-5 text-[#4DD6FF]" />
                      <CardTitle className="text-base">My Analysis</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="prose prose-sm max-w-none">
                      <p className="text-foreground/90 leading-relaxed whitespace-pre-line">
                        {decision.ai_reasoning}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </motion.div>

          {/* Outcome Review */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="mb-8"
          >
            <h2 className="text-xl font-semibold text-foreground mb-4">Rate Your Outcome</h2>
            <Card className="border-white/10">
              <CardHeader>
                <p className="text-muted-foreground">How did this decision turn out for you?</p>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-3 mb-6">
                  {(["success", "neutral", "failure"] as const).map((outcome) => {
                    const isSelected = selectedOutcome === outcome
                    const config = {
                      success: {
                        icon: ThumbsUp,
                        label: "Great outcome",
                        gradient: "from-[#0A938A] to-[#50C2B8]",
                      },
                      neutral: {
                        icon: Meh,
                        label: "It was okay",
                        gradient: "from-[#4786F5] to-[#4DD6FF]",
                      },
                      failure: {
                        icon: ThumbsDown,
                        label: "Could be better",
                        gradient: "from-[#E76A18] to-[#EED9B6]",
                      },
                    }[outcome]

                    return (
                      <motion.button
                        key={outcome}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setSelectedOutcome(outcome)}
                        className={`flex items-center gap-2 px-4 py-3 rounded-xl transition-all ${
                          isSelected
                            ? `bg-gradient-to-r ${config.gradient} text-white`
                            : "bg-white/5 border border-white/10 text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <config.icon className="w-5 h-5" />
                        <span className="font-medium">{config.label}</span>
                      </motion.button>
                    )
                  })}
                </div>

                {selectedOutcome && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-4"
                  >
                    {/* Which option did you choose? */}
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Which option did you actually choose? <span className="text-red-400">*</span>
                      </label>
                      <select
                        value={selectedOption}
                        onChange={(e) => setSelectedOption(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-foreground focus:border-[#50C2B8] transition-colors"
                        required
                      >
                        <option value="" className="bg-slate-900 text-gray-400">Select an option...</option>
                        {decision?.options.map((option) => (
                          <option key={option.id} value={option.text} className="bg-slate-900 text-white">
                            {option.text}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* What you chose and why */}
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        What happened? (optional)
                      </label>
                      <Textarea
                        value={outcomeNotes}
                        onChange={(e) => setOutcomeNotes(e.target.value)}
                        placeholder="Describe what happened after making this decision..."
                        className="bg-white/5 border-white/10 text-foreground min-h-[100px]"
                      />
                    </div>

                    {/* Lessons learned */}
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        What did you learn? (optional)
                      </label>
                      <Textarea
                        value={lessonsLearned}
                        onChange={(e) => setLessonsLearned(e.target.value)}
                        placeholder="Key takeaways or lessons from this decision..."
                        className="bg-white/5 border-white/10 text-foreground min-h-[80px]"
                      />
                    </div>

                    {/* Would decide the same? */}
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-3">
                        Would you make the same choice again?
                      </label>
                      <div className="flex gap-3">
                        <button
                          onClick={() => setWouldDecideSame(true)}
                          className={`flex-1 px-4 py-3 rounded-xl transition-all ${
                            wouldDecideSame === true
                              ? "bg-gradient-to-r from-[#0A938A] to-[#50C2B8] text-white"
                              : "bg-white/5 border border-white/10 text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          <CheckCircle2 className="w-5 h-5 mx-auto mb-1" />
                          <span className="text-sm font-medium">Yes</span>
                        </button>
                        <button
                          onClick={() => setWouldDecideSame(false)}
                          className={`flex-1 px-4 py-3 rounded-xl transition-all ${
                            wouldDecideSame === false
                              ? "bg-gradient-to-r from-[#E76A18] to-[#EED9B6] text-white"
                              : "bg-white/5 border border-white/10 text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          <X className="w-5 h-5 mx-auto mb-1" />
                          <span className="text-sm font-medium">No</span>
                        </button>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-white/10">
                      {error && (
                        <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                          {error}
                        </div>
                      )}
                      {!selectedOption && (
                        <div className="mb-4 p-3 rounded-lg bg-orange-500/10 border border-orange-500/30 text-orange-400 text-sm">
                          Please select which option you chose before saving
                        </div>
                      )}
                      
                      {/* AI Feedback Display */}
                      {aiFeedback && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="mb-4 p-4 rounded-lg bg-gradient-to-br from-[#4786F5]/10 to-[#4DD6FF]/10 border border-[#4DD6FF]/30"
                        >
                          <div className="flex items-center gap-2 mb-3">
                            <Brain className="w-5 h-5 text-[#4DD6FF]" />
                            <h3 className="font-semibold text-foreground">AI Feedback</h3>
                          </div>
                          <div className="prose prose-sm max-w-none text-foreground/90 whitespace-pre-line">
                            {aiFeedback}
                          </div>
                        </motion.div>
                      )}
                      
                      {generatingFeedback && (
                        <div className="mb-4 p-4 rounded-lg bg-white/5 border border-white/10 flex items-center gap-3">
                          <Loader className="w-5 h-5 animate-spin text-[#4DD6FF]" />
                          <span className="text-sm text-muted-foreground">Analyzing your decision patterns...</span>
                        </div>
                      )}
                      
                      <GradientButton 
                        variant="teal" 
                        onClick={handleSaveOutcome}
                        disabled={saving || !selectedOption}
                        className="w-full"
                      >
                        {saving ? (
                          <>
                            <Loader className="w-4 h-4 mr-2 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4 mr-2" />
                            Save Outcome & Get AI Feedback
                          </>
                        )}
                      </GradientButton>
                    </div>
                  </motion.div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* AI Feedback Section */}
          {decision.outcome && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.6 }}
            >
              <h2 className="text-xl font-semibold text-foreground mb-4">AI Pattern Analysis</h2>
              <Card className="border-white/10 bg-gradient-to-br from-[#4786F5]/10 to-[#4DD6FF]/10">
                <CardHeader>
                  <div className="flex items-center gap-3 mb-2">
                    <Brain className="w-6 h-6 text-[#4DD6FF]" />
                    <CardTitle className="text-foreground">Personalized Insights</CardTitle>
                  </div>
                  <p className="text-muted-foreground text-sm">
                    Based on your decision-making patterns and outcomes
                  </p>
                </CardHeader>
                <CardContent>
                  {!aiFeedback ? (
                    <GradientButton
                      variant="blue"
                      onClick={generateAIFeedback}
                      disabled={generatingFeedback}
                      className="w-full"
                    >
                      {generatingFeedback ? (
                        <>
                          <Loader className="w-4 h-4 mr-2 animate-spin" />
                          Analyzing your patterns...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 mr-2" />
                          Generate AI Feedback
                        </>
                      )}
                    </GradientButton>
                  ) : (
                    <div className="prose prose-invert max-w-none">
                      <div className="text-sm text-foreground whitespace-pre-wrap">
                        {aiFeedback}
                      </div>
                      <button
                        onClick={generateAIFeedback}
                        className="mt-4 text-sm text-[#4DD6FF] hover:underline flex items-center gap-1"
                      >
                        <RotateCcw className="w-4 h-4" />
                        Regenerate feedback
                      </button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}
        </div>
      </main>
    </div>
  )
}
