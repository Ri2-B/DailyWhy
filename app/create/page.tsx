"use client"

import { motion, AnimatePresence } from "framer-motion"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createBrowserClient } from "@supabase/ssr"
import { AnimatedBackground } from "@/components/ui/animated-background"
import { Sidebar } from "@/components/layout/sidebar"
import { Navbar } from "@/components/layout/navbar"
import { GlassCard } from "@/components/ui/glass-card"
import { GradientButton } from "@/components/ui/gradient-button"
import { ReasoningReveal } from "@/components/ai/reasoning-reveal"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { PlusCircle, Trash2, Brain, Sparkles, CheckCircle2, Target } from "lucide-react"
import { analyzeDecision, type DecisionContext, type AIAnalysisResult } from "@/lib/ai/supabase-ai"

interface AnalysisResult {
  recommendation: string
  confidence: number
  reasoning: string[]
  biases: string[]
  optionScores: { option: string; score: number; pros: string[]; cons: string[] }[]
}

interface Habit {
  id: string
  name: string
  color: string
}

export default function CreateDecisionPage() {
  const router = useRouter()
  const [title, setTitle] = useState("")
  const [context, setContext] = useState("")
  const [options, setOptions] = useState(["", ""])
  const [category, setCategory] = useState("Personal")
  const [selectedHabit, setSelectedHabit] = useState<string>("")
  const [habits, setHabits] = useState<Habit[]>([])
  const [isHabitForming, setIsHabitForming] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [analysisComplete, setAnalysisComplete] = useState(false)
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [savedDecisionId, setSavedDecisionId] = useState<string | null>(null)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    const loadHabits = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('habits')
        .select('id, name, color')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('name')

      if (!error && data) {
        setHabits(data)
      }
    }

    loadHabits()
  }, [supabase])

  const addOption = () => {
    if (options.length < 6) {
      setOptions([...options, ""])
    }
  }

  const removeOption = (index: number) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== index))
    }
  }

  const updateOption = (index: number, value: string) => {
    const newOptions = [...options]
    newOptions[index] = value
    setOptions(newOptions)
  }

  const handleAnalyze = async () => {
    setIsAnalyzing(true)
    setAnalysisComplete(false)
    setError(null)

    try {
      const validOptions = options.filter(Boolean)
      
      if (validOptions.length < 2) {
        setError('Please provide at least 2 options to analyze')
        setIsAnalyzing(false)
        return
      }

      if (!title.trim()) {
        setError('Please provide a decision title')
        setIsAnalyzing(false)
        return
      }
      
      // Generate detailed pros and cons for each option
      const generateDetailedProsAndCons = (option: string, context: string, category: string, allOptions: string[]) => {
        const optionLower = option.toLowerCase()
        const contextLower = context.toLowerCase()
        const combined = `${optionLower} ${contextLower}`
        
        const pros: string[] = []
        const cons: string[] = []
        
        // Context-aware analysis
        const isWork = /work|project|assignment|study|task|deadline|job|homework|maths|graphics|computer/i.test(combined)
        const isHealth = /health|fitness|exercise|diet|wellness/i.test(combined)
        const isFinance = /money|cost|price|budget|save|spend|invest/i.test(combined)
        const isAvoidance = /sleep|rest|relax|nothing|later|postpone|skip|chill|netflix|game|play/i.test(optionLower)
        const isProductive = /complete|finish|start|do|work|study|practice|project|maths|graphics|code|write/i.test(optionLower)
        
        // WORK/STUDY - High specificity for each option
        if (isWork) {
          if (isProductive) {
            // Productive work options
            if (/complete|finish/i.test(optionLower)) {
              pros.push("Achieves full closure on the task")
              pros.push("Eliminates future stress and deadline anxiety")
              pros.push("Demonstrates strong follow-through ability")
              pros.push("Frees up mental space for other priorities")
              cons.push("Requires sustained focus and effort now")
              cons.push("May take longer than expected to fully complete")
            } else if (/start|begin/i.test(optionLower)) {
              pros.push("Breaks through procrastination and inertia")
              pros.push("Gets the hardest part (starting) out of the way")
              pros.push("Allows you to assess actual difficulty and time needed")
              pros.push("Creates momentum for continued progress")
              cons.push("Initial resistance and mental friction")
              cons.push("Commitment to see it through once started")
            } else if (/practice|study/i.test(optionLower)) {
              pros.push("Reinforces learning and builds mastery")
              pros.push("Improves long-term retention and understanding")
              pros.push("Prepares you better for tests or real applications")
              cons.push("May feel tedious without immediate visible results")
              cons.push("Requires discipline and focused attention")
            } else {
              // Generic productive option
              pros.push("Makes tangible progress toward your goal")
              pros.push("Reduces accumulated task backlog")
              pros.push("Shows responsibility and commitment")
              cons.push("Demands immediate time and effort")
              cons.push("May compete with other immediate desires")
            }
          }
          
          if (isAvoidance) {
            // Avoidance/rest options
            if (/sleep/i.test(optionLower)) {
              pros.push("Restores energy and cognitive function")
              pros.push("May improve focus and problem-solving later")
              pros.push("Addresses immediate tiredness effectively")
              cons.push("Postpones important deadlines and commitments")
              cons.push("Creates time pressure for later")
              cons.push("May disrupt sleep schedule if nap is too long")
              cons.push("Guilt or anxiety about unfinished work")
            } else if (/relax|chill|rest/i.test(optionLower)) {
              pros.push("Provides mental break and stress relief")
              pros.push("Can prevent burnout with proper balance")
              cons.push("Doesn't address pending responsibilities")
              cons.push("May lead to extended procrastination")
              cons.push("Deadline pressure accumulates")
            } else if (/game|play|netflix/i.test(optionLower)) {
              pros.push("Offers immediate entertainment and distraction")
              pros.push("Can serve as a reward after completing work")
              cons.push("High risk of losing track of time")
              cons.push("Significantly delays critical tasks")
              cons.push("May require willpower to stop and refocus")
              cons.push("Could lead to regret if deadlines missed")
            } else {
              // Generic avoidance
              pros.push("Provides temporary relief from stress")
              cons.push("Delays important progress and increases future pressure")
              cons.push("May create a cycle of procrastination")
              cons.push("Undermines long-term goals and commitments")
            }
          }
        }
        
        // HEALTH DECISIONS
        if (isHealth) {
          if (/exercise|workout|gym|run|walk|jog/i.test(optionLower)) {
            pros.push("Improves cardiovascular health and fitness")
            pros.push("Releases endorphins, boosting mood and mental clarity")
            pros.push("Builds long-term health habits")
            pros.push("Provides sense of accomplishment")
            cons.push("Requires physical effort and time commitment")
            cons.push("May cause temporary fatigue or muscle soreness")
            if (/gym/i.test(optionLower)) {
              cons.push("Requires travel time to and from gym")
            }
          }
          if (/eat|food|meal|diet/i.test(optionLower)) {
            if (/healthy|salad|vegetables|fruits/i.test(optionLower)) {
              pros.push("Provides essential nutrients and sustained energy")
              pros.push("Supports weight management and health goals")
              pros.push("Improves digestion and overall wellbeing")
              cons.push("May take longer to prepare")
              cons.push("Less immediately satisfying than comfort food")
            } else if (/junk|fast|pizza|burger/i.test(optionLower)) {
              pros.push("Quick and convenient to obtain")
              pros.push("Provides immediate taste satisfaction")
              cons.push("High in calories, low in nutritional value")
              cons.push("May cause energy crash later")
              cons.push("Doesn't support long-term health goals")
            }
          }
        }
        
        // FINANCIAL DECISIONS
        if (isFinance) {
          if (/save|invest|budget|cheap|affordable/i.test(optionLower)) {
            pros.push("Builds financial security and emergency fund")
            pros.push("Creates opportunities for future investments")
            pros.push("Reduces financial stress long-term")
            cons.push("Requires discipline and delayed gratification")
            cons.push("May feel restrictive in the short term")
          }
          if (/buy|purchase|spend|expensive/i.test(optionLower)) {
            pros.push("Fulfills immediate need or want")
            if (/investment|quality|durable/i.test(optionLower)) {
              pros.push("May provide long-term value")
            }
            cons.push("Reduces available cash for other priorities")
            cons.push("May lead to buyer's remorse if impulsive")
            if (/expensive|costly|premium/i.test(optionLower)) {
              cons.push("Significant financial commitment required")
              cons.push("Limits budget flexibility")
            }
          }
        }
        
        // TIME-BASED ANALYSIS
        if (/now|immediately|right away|tonight|today/i.test(optionLower)) {
          pros.push("Capitalizes on current motivation and energy")
          pros.push("Eliminates decision fatigue about when to start")
          pros.push("Provides immediate sense of control")
          cons.push("May conflict with other immediate priorities")
        }
        if (/later|tomorrow|next week|weekend/i.test(optionLower)) {
          pros.push("Allows time for mental preparation")
          pros.push("Can schedule during optimal energy period")
          pros.push("Flexibility to handle unexpected events today")
          cons.push("High risk of procrastination and forgetting")
          cons.push("Current motivation may decrease")
          cons.push("Increases mental burden of pending task")
        }
        
        // QUALITY VS SPEED
        if (/quick|fast|hurry|rush/i.test(optionLower)) {
          pros.push("Saves time for other important activities")
          pros.push("Provides rapid results and closure")
          cons.push("May compromise on quality or thoroughness")
          cons.push("Higher chance of errors or oversights")
        }
        if (/careful|thorough|detailed|perfect/i.test(optionLower)) {
          pros.push("Ensures high quality and attention to detail")
          pros.push("Reduces need for revisions or corrections")
          pros.push("Creates work you can be proud of")
          cons.push("Significantly more time-intensive")
          cons.push("Risk of perfectionism causing delays")
        }
        
        // Fallback: Generate meaningful pros/cons based on the actual option text
        if (pros.length === 0) {
          // Extract key action words from the option
          const actionWords = optionLower.match(/\b(do|make|try|start|continue|stop|avoid|choose|pick|go|stay|buy|sell|learn|practice|study|work|rest|exercise|eat|drink|watch|play|read|write|call|text|visit|leave|join|quit|begin|finish)\b/gi) || []
          const subjects = optionLower.match(/\b(project|task|work|homework|assignment|exercise|game|movie|book|friend|family|food|meal|habit|goal|plan|idea)\b/gi) || []
          
          if (actionWords.length > 0 || subjects.length > 0) {
            // Create contextual pros based on what the option is about
            if (actionWords.some(w => /start|begin|try|do/.test(w))) {
              pros.push("Takes initiative rather than staying stuck")
              pros.push("Opens up possibilities for progress")
            }
            if (subjects.some(w => /work|project|task|homework|assignment/.test(w))) {
              pros.push("Contributes to meeting your responsibilities")
              pros.push("Prevents last-minute stress later")
            }
            if (actionWords.some(w => /rest|relax|sleep/.test(w))) {
              pros.push("Allows physical and mental recovery")
              if (!isWork) {
                pros.push("Reduces stress and prevents burnout")
              }
            }
          } else {
            // If we can't extract specific words, use position in list
            const position = validOptions.indexOf(option)
            if (position === 0) {
              pros.push("First option that comes to mind often reflects intuition")
              pros.push("Requires less decision-making energy")
            } else {
              pros.push("Offers an alternative perspective")
              pros.push("Provides more options to compare")
            }
          }
        }
        
        if (cons.length === 0) {
          // Generate diverse contextual cons
          const actionWords = optionLower.match(/\b(avoid|skip|postpone|delay|wait|ignore|nothing|none|neither)\b/gi) || []
          
          const diverseCons = [
            ["May lead to regret later", "Opportunity cost of not choosing alternatives"],
            ["Could have unforeseen consequences", "Might not align with long-term goals"],
            ["Takes time and energy", "Success depends on external factors"],
            ["Requires commitment to see through", "May conflict with other priorities"],
            ["Not reversible easily", "Could strain resources"]
          ]
          
          if (actionWords.length > 0) {
            cons.push("Delays action and progress")
            cons.push("Misses current window of opportunity")
          } else if (isWork && /rest|sleep|relax|game|play|watch/.test(optionLower)) {
            cons.push("Postpones important responsibilities")
            cons.push("Deadline pressure builds up")
          } else {
            // Use varied cons based on option position
            const conSet = diverseCons[validOptions.indexOf(option) % diverseCons.length]
            cons.push(...conSet)
          }
        }
        
        return { 
          pros: [...new Set(pros)].slice(0, 5),  // Remove duplicates, max 5
          cons: [...new Set(cons)].slice(0, 5)   // Remove duplicates, max 5
        }
      }
      
      // Use local AI analysis with correct format
      const decisionContext: DecisionContext = {
        title,
        description: context,
        options: validOptions.map((opt, index) => {
          const { pros, cons } = generateDetailedProsAndCons(opt, context, category, validOptions)
          return {
            id: `option-${index}`,
            text: opt,
            pros,
            cons
          }
        }),
        category,
        urgency: 'medium'
      }

      const analysis = await analyzeDecision(decisionContext)
      
      // Transform the AI result to match our UI format
      const optionScores = analysis.rankings.map(ranking => {
        const optionIndex = parseInt(ranking.option_id.replace('option-', ''))
        const option = decisionContext.options[optionIndex]
        
        // Ensure pros and cons are always arrays
        const pros = Array.isArray(option.pros) && option.pros.length > 0 ? option.pros : [
          "Addresses the current situation",
          "Provides a clear path forward"
        ]
        const cons = Array.isArray(option.cons) && option.cons.length > 0 ? option.cons : [
          "May have unexpected consequences",
          "Requires careful consideration"
        ]
        
        return {
          option: option.text,
          score: ranking.score,
          pros,
          cons
        }
      })

      setAnalysisResult({
        recommendation: analysis.recommended_action,
        confidence: analysis.confidence_score,
        reasoning: [analysis.reasoning, ...analysis.key_factors],
        biases: analysis.potential_biases,
        optionScores
      })
      
      setAnalysisComplete(true)
    } catch (err) {
      console.error('Analysis error:', err)
      setError('Failed to analyze decision. Please try again.')
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleSave = async () => {
    setIsSaving(true)
    setError(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        setError('Please sign in to save decisions')
        router.push('/login')
        return
      }

      // Ensure profile exists (create if it doesn't)
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .single()

      if (!existingProfile) {
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            email: user.email,
            full_name: user.user_metadata?.full_name || user.email
          })
        
        if (profileError && !profileError.message.includes('duplicate')) {
          console.error('Profile creation error:', profileError)
          setError('Failed to create user profile. Please try again.')
          return
        }
      }

      const validOptions = options.filter(Boolean)
      
      // Format options for schema (JSONB array) - use unique IDs based on option text hash
      const formattedOptions = validOptions.map((opt, idx) => {
        const optionScore = analysisResult?.optionScores.find(s => s.option === opt)
        return {
          id: `opt-${idx}-${opt.substring(0, 10).replace(/\s/g, '-')}`, // Unique composite key
          text: opt,
          pros: optionScore?.pros || [],
          cons: optionScore?.cons || []
        }
      })

      // Format AI rankings for schema - match the option IDs correctly
      const aiRankings = analysisResult?.optionScores.map((score, idx) => {
        const matchingOption = formattedOptions.find(fo => fo.text === score.option)
        return {
          option_id: matchingOption?.id || `opt-${idx}`,
          rank: idx + 1, // Rank based on sorted order
          score: score.score,
          predicted_outcome: score.option === analysisResult.recommendation ? 'recommended' : 'alternative'
        }
      }) || []

      // Save to Supabase
      const { data, error: saveError } = await supabase
        .from('decisions')
        .insert({
          user_id: user.id,
          title,
          description: context,
          options: formattedOptions,
          category: category.toLowerCase(),
          ai_rankings: aiRankings,
          ai_reasoning: analysisResult?.reasoning.join(' '),
          ai_summary: `Recommended: ${analysisResult?.recommendation} (${analysisResult?.confidence}% confidence)`,
          confidence_score: analysisResult ? analysisResult.confidence / 100 : null,
          is_completed: false
        })
        .select()
        .single()

      if (saveError) {
        console.error('Save error:', saveError)
        setError(saveError.message)
        return
      }

      // Link to habit if selected
      if (selectedHabit) {
        await supabase
          .from('decision_habits')
          .insert({
            decision_id: data.id,
            habit_id: selectedHabit,
            is_habit_forming: isHabitForming
          })
      }

      setSavedDecisionId(data.id)
      
      // Redirect to the decision page
      setTimeout(() => {
        router.push(`/decision/${data.id}`)
      }, 1500)
    } catch (err) {
      console.error('Save error:', err)
      setError('Failed to save decision. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleStartOver = () => {
    setTitle("")
    setContext("")
    setOptions(["", ""])
    setCategory("Personal")
    setAnalysisComplete(false)
    setAnalysisResult(null)
    setError(null)
    setSavedDecisionId(null)
  }

  const categories = ["Personal", "Career", "Health", "Finance", "Education", "Relationships", "Other"]

  return (
    <main className="min-h-screen relative">
      <AnimatedBackground />
      <Navbar />
      <Sidebar />

      <div className="pt-24 pb-12 px-4 lg:pl-72">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-8"
          >
            <h1 className="text-3xl font-bold text-foreground">New Decision</h1>
            <p className="text-muted-foreground mt-1">Let AI help you analyze your options</p>
          </motion.div>

          {/* Form */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <GlassCard>
              <div className="space-y-6">
                {/* Title */}
                <div className="space-y-2">
                  <Label htmlFor="title" className="text-foreground">
                    What decision are you making?
                  </Label>
                  <Input
                    id="title"
                    placeholder="e.g., Should I switch careers?"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="bg-white/5 border-white/10 text-foreground placeholder:text-muted-foreground focus:border-[#50C2B8]"
                  />
                </div>

                {/* Context */}
                <div className="space-y-2">
                  <Label htmlFor="context" className="text-foreground">
                    Additional context (optional)
                  </Label>
                  <Textarea
                    id="context"
                    placeholder="Share any relevant details, constraints, or goals..."
                    value={context}
                    onChange={(e) => setContext(e.target.value)}
                    className="bg-white/5 border-white/10 text-foreground placeholder:text-muted-foreground focus:border-[#50C2B8] min-h-[100px]"
                  />
                </div>

                {/* Category */}
                <div className="space-y-2">
                  <Label className="text-foreground">Category</Label>
                  <div className="flex flex-wrap gap-2">
                    {categories.map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setCategory(cat)}
                        className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                          category === cat
                            ? "bg-[#0A938A] text-white"
                            : "bg-white/5 text-muted-foreground hover:bg-white/10"
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Habit Link (Optional) */}
                {habits.length > 0 && (
                  <div className="space-y-2 p-4 rounded-xl bg-white/5 border border-white/10">
                    <div className="flex items-center gap-2 mb-2">
                      <Target className="w-4 h-4 text-[#50C2B8]" />
                      <Label className="text-foreground">Link to Habit (Optional)</Label>
                    </div>
                    <p className="text-xs text-muted-foreground mb-3">
                      Connect this decision to a habit you're tracking
                    </p>
                    <select
                      value={selectedHabit}
                      onChange={(e) => setSelectedHabit(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-foreground"
                    >
                      <option value="" className="bg-slate-900 text-white">No habit</option>
                      {habits.map((habit) => (
                        <option key={habit.id} value={habit.id} className="bg-slate-900 text-white">
                          {habit.name}
                        </option>
                      ))}
                    </select>
                    {selectedHabit && (
                      <label className="flex items-center gap-2 mt-2 text-sm text-foreground cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isHabitForming}
                          onChange={(e) => setIsHabitForming(e.target.checked)}
                          className="w-4 h-4 rounded border-white/10 bg-white/5 text-[#50C2B8] focus:ring-[#50C2B8]"
                        />
                        <span>This decision is forming this habit</span>
                      </label>
                    )}
                  </div>
                )}

                {/* Error Message */}
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm"
                  >
                    {error}
                  </motion.div>
                )}

                {/* Options */}
                <div className="space-y-3">
                  <Label className="text-foreground">Your Options</Label>
                  <AnimatePresence>
                    {options.map((option, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        transition={{ duration: 0.3 }}
                        className="flex items-center gap-3"
                      >
                        <div className="w-8 h-8 rounded-full bg-gradient-to-r from-[#0A938A] to-[#50C2B8] flex items-center justify-center flex-shrink-0">
                          <span className="text-sm font-bold text-white">{index + 1}</span>
                        </div>
                        <Input
                          placeholder={`Option ${index + 1}`}
                          value={option}
                          onChange={(e) => updateOption(index, e.target.value)}
                          className="flex-1 bg-white/5 border-white/10 text-foreground placeholder:text-muted-foreground focus:border-[#50C2B8]"
                        />
                        {options.length > 2 && (
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => removeOption(index)}
                            className="p-2 rounded-lg hover:bg-white/10 text-muted-foreground hover:text-[#E76A18] transition-colors"
                          >
                            <Trash2 className="w-5 h-5" />
                          </motion.button>
                        )}
                      </motion.div>
                    ))}
                  </AnimatePresence>

                  {options.length < 6 && (
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={addOption}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl border border-dashed border-white/20 text-muted-foreground hover:text-foreground hover:border-[#50C2B8] transition-colors w-full justify-center"
                    >
                      <PlusCircle className="w-4 h-4" />
                      Add another option
                    </motion.button>
                  )}
                </div>

                {/* Analyze Button */}
                <GradientButton
                  variant="teal"
                  size="lg"
                  className="w-full"
                  onClick={handleAnalyze}
                  disabled={isAnalyzing || !title || options.filter(Boolean).length < 2}
                >
                  {isAnalyzing ? (
                    <>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
                        className="w-5 h-5 border-2 border-white border-t-transparent rounded-full mr-2"
                      />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Brain className="w-5 h-5 mr-2" />
                      Analyze with AI
                    </>
                  )}
                </GradientButton>
              </div>
            </GlassCard>
          </motion.div>

          {/* AI Reasoning */}
          <ReasoningReveal
            isAnalyzing={isAnalyzing}
            reasoning={analysisResult?.reasoning || [
              "Analyzing your decision context and constraints...",
              "Evaluating each option based on potential outcomes...",
              "Considering short-term and long-term implications...",
              "Weighing pros and cons for each alternative...",
            ]}
            conclusion={
              analysisComplete && analysisResult
                ? `Based on my analysis, the top recommendation scores ${analysisResult.optionScores[0]?.score || 0}/100. ${analysisResult.recommendation}`
                : undefined
            }
          />

          {/* Analysis Results */}
          {analysisComplete && analysisResult && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="mt-6"
            >
              <GlassCard>
                <h3 className="text-lg font-semibold text-foreground mb-4">Option Scores</h3>
                <div className="space-y-4">
                  {analysisResult.optionScores.map((opt, index) => (
                    <div key={index} className="p-4 rounded-lg bg-white/5 border border-white/10">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-foreground">{opt.option}</span>
                        <span className={`text-lg font-bold ${index === 0 ? 'text-[#50C2B8]' : 'text-muted-foreground'}`}>
                          {opt.score}/100
                        </span>
                      </div>
                      <div className="h-2 bg-white/10 rounded-full overflow-hidden mb-3">
                        <div 
                          className={`h-full rounded-full ${index === 0 ? 'bg-gradient-to-r from-[#0A938A] to-[#50C2B8]' : 'bg-[#4786F5]'}`}
                          style={{ width: `${opt.score}%` }}
                        />
                      </div>
                      {opt.pros.length > 0 && (
                        <div className="text-sm text-muted-foreground">
                          <span className="text-emerald-400">Pros:</span> {opt.pros.join(', ')}
                        </div>
                      )}
                      {opt.cons.length > 0 && (
                        <div className="text-sm text-muted-foreground mt-1">
                          <span className="text-red-400">Cons:</span> {opt.cons.join(', ')}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {analysisResult.biases.length > 0 && (
                  <div className="mt-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                    <p className="text-sm text-amber-400 font-medium mb-1">Potential Biases Detected:</p>
                    <p className="text-sm text-muted-foreground">{analysisResult.biases.join(', ')}</p>
                  </div>
                )}
              </GlassCard>
            </motion.div>
          )}

          {/* Action Buttons (after analysis) */}
          <AnimatePresence>
            {analysisComplete && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="mt-6 flex gap-4"
              >
                {savedDecisionId ? (
                  <div className="flex-1 flex items-center justify-center gap-2 py-3 px-6 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400">
                    <CheckCircle2 className="w-5 h-5" />
                    Decision Saved! Redirecting...
                  </div>
                ) : (
                  <GradientButton 
                    variant="cyan" 
                    className="flex-1"
                    onClick={handleSave}
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <>
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
                          className="w-5 h-5 border-2 border-white border-t-transparent rounded-full mr-2"
                        />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Save Decision
                      </>
                    )}
                  </GradientButton>
                )}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleStartOver}
                  className="px-6 py-3 rounded-xl border border-white/20 text-foreground hover:bg-white/5 transition-colors"
                >
                  Start Over
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </main>
  )
}
