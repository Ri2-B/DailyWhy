"use client"

import { motion, AnimatePresence } from "framer-motion"
import { useState, useEffect } from "react"
import { AnimatedBackground } from "@/components/ui/animated-background"
import { Sidebar } from "@/components/layout/sidebar"
import { Navbar } from "@/components/layout/navbar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { GradientButton } from "@/components/ui/gradient-button"
import { Badge } from "@/components/ui/badge"
import { 
  Zap, Clock, Brain, Target, Trophy, Flame, CheckCircle2, 
  X, Timer, Lightbulb, Scale, Shuffle, ArrowRight, RotateCcw, Star,
  ThumbsUp, ThumbsDown, Eye, AlertTriangle, Compass,
  Shield, Lock, Calendar, Sparkles, Play
} from "lucide-react"
import { Textarea } from "@/components/ui/textarea"

// ============ UTILITY: GET TODAY'S DATE KEY ============
function getTodayKey(): string {
  const today = new Date()
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`
}

// ============ UTILITY: SEEDED RANDOM (deterministic per day) ============
function seededRandom(date: string, index: number): number {
  const seed = parseInt(date.replace(/-/g, "")) + index
  const x = Math.sin(seed) * 10000
  return x - Math.floor(x)
}

function selectTodaysChallenges(allChallengeIds: string[]): string[] {
  const today = getTodayKey()
  const indices = Array.from({ length: allChallengeIds.length }, (_, i) => i)
    .sort((a, b) => seededRandom(today, a) - seededRandom(today, b))
    .slice(0, 4)
  
  return indices.map(i => allChallengeIds[i])
}

// ============ INTERFACE ============
interface SpeedGameProps {
  onComplete: (score: number) => void
  onClose: () => void
}

// ============ GAME 1: Speed Decision ============
function SpeedDecisionGame({ onComplete, onClose }: SpeedGameProps) {
  const scenarios = [
    { q: "Your coffee order is wrong. Do you:", options: ["Speak up", "Drink it anyway"], best: 0 },
    { q: "A meeting runs over. Do you:", options: ["Leave politely", "Stay and be late"], best: 0 },
    { q: "Friend asks for honest feedback:", options: ["Be honest but kind", "Just say it's great"], best: 0 },
    { q: "You find a wallet on the street:", options: ["Turn it in", "Take the cash"], best: 0 },
    { q: "Boss asks you to work weekend:", options: ["Negotiate", "Just agree"], best: 0 },
  ]

  const [current, setCurrent] = useState(0)
  const [score, setScore] = useState(0)
  const [gameOver, setGameOver] = useState(false)

  const handleAnswer = (index: number) => {
    if (index === scenarios[current].best) setScore(prev => prev + 20)
    if (current >= scenarios.length - 1) {
      setGameOver(true)
    } else {
      setCurrent(prev => prev + 1)
    }
  }

  if (gameOver) {
    return (
      <div className="text-center py-8">
        <Zap className="w-16 h-16 mx-auto text-yellow-400 mb-4" />
        <h3 className="text-2xl font-bold text-foreground mb-2">Speed Decision Complete!</h3>
        <p className="text-4xl font-bold text-[#50C2B8] mb-4">{score} points</p>
        <div className="flex gap-3 justify-center">
          <GradientButton variant="cyan" onClick={() => onComplete(score)}>Claim Points</GradientButton>
          <button onClick={onClose} className="px-4 py-2 rounded-xl bg-white/10 text-foreground">Close</button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm text-muted-foreground">Question {current + 1}/{scenarios.length}</span>
        <span className="text-sm font-medium text-yellow-400">Score: {score}</span>
      </div>
      <div className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20 mb-6">
        <p className="text-foreground">{scenarios[current].q}</p>
      </div>
      <div className="space-y-3">
        {scenarios[current].options.map((opt, i) => (
          <button
            key={i}
            onClick={() => handleAnswer(i)}
            className="w-full p-4 rounded-xl bg-white/5 border border-white/10 hover:border-[#50C2B8] text-foreground text-left"
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  )
}

// ============ GAME 2: Pros & Cons ============
function ProsConsGame({ onComplete, onClose }: SpeedGameProps) {
  const [pros, setPros] = useState<string[]>([])
  const [cons, setCons] = useState<string[]>([])
  const [proText, setProText] = useState("")
  const [conText, setConText] = useState("")
  const [gameOver, setGameOver] = useState(false)

  const submit = () => {
    setGameOver(true)
  }

  if (gameOver) {
    const points = (pros.length + cons.length) * 15 + (pros.length >= 3 && cons.length >= 3 ? 20 : 0)
    return (
      <div className="text-center py-8">
        <Scale className="w-16 h-16 mx-auto text-blue-400 mb-4" />
        <h3 className="text-2xl font-bold text-foreground mb-2">Analysis Complete!</h3>
        <p className="text-4xl font-bold text-[#50C2B8] mb-4">{points} points</p>
        <div className="flex gap-3 justify-center">
          <GradientButton variant="blue" onClick={() => onComplete(points)}>Claim Points</GradientButton>
          <button onClick={onClose} className="px-4 py-2 rounded-xl bg-white/10 text-foreground">Close</button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className="text-sm text-emerald-400 mb-2 block">Pros</label>
          <Textarea value={proText} onChange={(e) => setProText(e.target.value)} placeholder="One per line..." className="h-24 bg-white/5 border-white/10 text-foreground" />
          <button onClick={() => { if (proText.trim()) { setPros([...pros, proText]); setProText(""); } }} className="mt-2 px-3 py-2 rounded-lg bg-emerald-500/20 text-emerald-400 text-sm">Add Pro</button>
        </div>
        <div>
          <label className="text-sm text-red-400 mb-2 block">Cons</label>
          <Textarea value={conText} onChange={(e) => setConText(e.target.value)} placeholder="One per line..." className="h-24 bg-white/5 border-white/10 text-foreground" />
          <button onClick={() => { if (conText.trim()) { setCons([...cons, conText]); setConText(""); } }} className="mt-2 px-3 py-2 rounded-lg bg-red-500/20 text-red-400 text-sm">Add Con</button>
        </div>
      </div>
      <div className="mb-4 text-sm">
        <p className="text-muted-foreground">Pros: {pros.length} | Cons: {cons.length}</p>
      </div>
      <GradientButton variant="blue" className="w-full" onClick={submit} disabled={pros.length === 0 && cons.length === 0}>Complete</GradientButton>
    </div>
  )
}

// ============ GAME 3: Coin Flip Intuition ============
function CoinFlipGame({ onComplete, onClose }: SpeedGameProps) {
  const [flipped, setFlipped] = useState(false)
  const [result, setResult] = useState<"heads" | "tails" | null>(null)
  const [reaction, setReaction] = useState("")
  const [submitted, setSubmitted] = useState(false)

  const flip = () => {
    setFlipped(true)
    setTimeout(() => {
      setResult(Math.random() > 0.5 ? "heads" : "tails")
      setFlipped(false)
    }, 1000)
  }

  if (submitted) {
    return (
      <div className="text-center py-8">
        <Shuffle className="w-16 h-16 mx-auto text-orange-400 mb-4" />
        <h3 className="text-2xl font-bold text-foreground mb-2">Gut Check Complete!</h3>
        <p className="text-4xl font-bold text-[#50C2B8] mb-4">50 points</p>
        <div className="flex gap-3 justify-center">
          <GradientButton variant="orange" onClick={() => onComplete(50)}>Claim Points</GradientButton>
          <button onClick={onClose} className="px-4 py-2 rounded-xl bg-white/10 text-foreground">Close</button>
        </div>
      </div>
    )
  }

  return (
    <div className="text-center">
      <p className="text-muted-foreground mb-6">Decision: Accept a risky opportunity?</p>
      {!result ? (
        <motion.button
          onClick={flip}
          whileHover={{ scale: 1.1 }}
          className="w-32 h-32 mx-auto mb-6 rounded-full bg-gradient-to-br from-orange-400 to-yellow-600 flex items-center justify-center text-4xl font-bold text-white shadow-lg"
        >
          🪙
        </motion.button>
      ) : (
        <div className="mb-6">
          <p className="text-2xl font-bold text-foreground mb-4">{result === "heads" ? "👑 Heads" : "🌙 Tails"}</p>
          <p className="text-muted-foreground mb-4">How do you feel?</p>
          <div className="flex gap-4 justify-center">
            <button onClick={() => { setReaction("happy"); setSubmitted(true); }} className="px-6 py-3 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400">😊 Happy</button>
            <button onClick={() => { setReaction("sad"); setSubmitted(true); }} className="px-6 py-3 rounded-xl bg-red-500/20 border border-red-500/30 text-red-400">😞 Sad</button>
          </div>
        </div>
      )}
      {!result && !flipped && <GradientButton variant="orange" onClick={flip}>Flip Coin</GradientButton>}
    </div>
  )
}

// ============ GAME 4: Quiz ============
function QuizGame({ onComplete, onClose }: SpeedGameProps) {
  const questions = [
    { q: "What is the 10-10-10 rule?", a: "Impact in 10 mins, months, years", b: "Ask 10 people", correct: "a" },
    { q: "Analysis paralysis means:", a: "Over-analyzing until you can't decide", b: "Quick decisions", correct: "a" },
    { q: "Sunk cost fallacy is:", a: "Past investments shouldn't affect future decisions", b: "Always finish what you start", correct: "a" },
    { q: "For reversible decisions:", a: "Decide quickly and adjust", b: "Take your time", correct: "a" },
    { q: "When emotions are high:", a: "Wait before deciding", b: "Go with feelings", correct: "a" },
  ]

  const [current, setCurrent] = useState(0)
  const [score, setScore] = useState(0)
  const [gameOver, setGameOver] = useState(false)

  const handleAnswer = (answer: "a" | "b") => {
    if (answer === questions[current].correct) setScore(prev => prev + 30)
    if (current >= questions.length - 1) {
      setGameOver(true)
    } else {
      setCurrent(prev => prev + 1)
    }
  }

  if (gameOver) {
    return (
      <div className="text-center py-8">
        <Brain className="w-16 h-16 mx-auto text-purple-400 mb-4" />
        <h3 className="text-2xl font-bold text-foreground mb-2">Quiz Complete!</h3>
        <p className="text-4xl font-bold text-[#50C2B8] mb-4">{score} points</p>
        <div className="flex gap-3 justify-center">
          <GradientButton variant="purple" onClick={() => onComplete(score)}>Claim Points</GradientButton>
          <button onClick={onClose} className="px-4 py-2 rounded-xl bg-white/10 text-foreground">Close</button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex justify-between mb-4">
        <span className="text-sm text-muted-foreground">Q {current + 1}/5</span>
        <span className="text-sm text-purple-400">Score: {score}</span>
      </div>
      <p className="font-semibold text-foreground mb-6">{questions[current].q}</p>
      <div className="space-y-3">
        <button onClick={() => handleAnswer("a")} className="w-full p-4 rounded-xl bg-white/5 border border-white/10 hover:border-purple-500 text-foreground text-left">{questions[current].a}</button>
        <button onClick={() => handleAnswer("b")} className="w-full p-4 rounded-xl bg-white/5 border border-white/10 hover:border-purple-500 text-foreground text-left">{questions[current].b}</button>
      </div>
    </div>
  )
}

// ============ GAME 5: Bias Detector ============
function BiasDetectorGame({ onComplete, onClose }: SpeedGameProps) {
  const biases = [
    { scenario: "You spent $200 on tickets but you're sick. Go?", bias: "Sunk Cost", correct: false },
    { scenario: "Everyone agrees. Just go along?", bias: "Groupthink", correct: false },
    { scenario: "One bad review among 50 good. Avoid?", bias: "Negativity", correct: false },
    { scenario: "First impression great. Ignore mediocre interview?", bias: "Halo Effect", correct: false },
  ]

  const [current, setCurrent] = useState(0)
  const [score, setScore] = useState(0)
  const [gameOver, setGameOver] = useState(false)

  const handleAnswer = (answer: boolean) => {
    if (answer === biases[current].correct) setScore(prev => prev + 30)
    if (current >= biases.length - 1) {
      setGameOver(true)
    } else {
      setCurrent(prev => prev + 1)
    }
  }

  if (gameOver) {
    return (
      <div className="text-center py-8">
        <Eye className="w-16 h-16 mx-auto text-purple-400 mb-4" />
        <h3 className="text-2xl font-bold text-foreground mb-2">Bias Training Complete!</h3>
        <p className="text-4xl font-bold text-[#50C2B8] mb-4">{score} points</p>
        <div className="flex gap-3 justify-center">
          <GradientButton variant="purple" onClick={() => onComplete(score)}>Claim Points</GradientButton>
          <button onClick={onClose} className="px-4 py-2 rounded-xl bg-white/10 text-foreground">Close</button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex justify-between mb-4">
        <span className="text-sm text-muted-foreground">Scenario {current + 1}/{biases.length}</span>
        <span className="text-sm text-purple-400">Score: {score}</span>
      </div>
      <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20 mb-6">
        <p className="text-sm text-purple-400 mb-2">Bias: {biases[current].bias}</p>
        <p className="text-foreground">{biases[current].scenario}</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <button onClick={() => handleAnswer(true)} className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 hover:border-emerald-500 text-foreground">This is a bias</button>
        <button onClick={() => handleAnswer(false)} className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 hover:border-red-500 text-foreground">It's reasonable</button>
      </div>
    </div>
  )
}

// ============ GAME 6: Priority Matrix ============
function PriorityMatrixGame({ onComplete, onClose }: SpeedGameProps) {
  const tasks = [
    { task: "Fix critical bug", quadrant: "do" },
    { task: "Plan next quarter", quadrant: "schedule" },
    { task: "Organize desk", quadrant: "eliminate" },
    { task: "Reply to Slack", quadrant: "delegate" },
  ]

  const [current, setCurrent] = useState(0)
  const [score, setScore] = useState(0)
  const [gameOver, setGameOver] = useState(false)

  const handleAnswer = (q: string) => {
    if (q === tasks[current].quadrant) setScore(prev => prev + 25)
    if (current >= tasks.length - 1) {
      setGameOver(true)
    } else {
      setCurrent(prev => prev + 1)
    }
  }

  if (gameOver) {
    return (
      <div className="text-center py-8">
        <Target className="w-16 h-16 mx-auto text-blue-400 mb-4" />
        <h3 className="text-2xl font-bold text-foreground mb-2">Matrix Master!</h3>
        <p className="text-4xl font-bold text-[#50C2B8] mb-4">{score} points</p>
        <div className="flex gap-3 justify-center">
          <GradientButton variant="cyan" onClick={() => onComplete(score)}>Claim Points</GradientButton>
          <button onClick={onClose} className="px-4 py-2 rounded-xl bg-white/10 text-foreground">Close</button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex justify-between mb-4">
        <span className="text-sm text-muted-foreground">Task {current + 1}/4</span>
        <span className="text-sm text-blue-400">Score: {score}</span>
      </div>
      <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 mb-6 text-center">
        <p className="text-lg font-medium text-foreground">{tasks[current].task}</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <button onClick={() => handleAnswer("do")} className="p-3 rounded-xl bg-white/5 border border-white/10 hover:border-red-500 text-foreground text-sm">Do First</button>
        <button onClick={() => handleAnswer("schedule")} className="p-3 rounded-xl bg-white/5 border border-white/10 hover:border-blue-500 text-foreground text-sm">Schedule</button>
        <button onClick={() => handleAnswer("delegate")} className="p-3 rounded-xl bg-white/5 border border-white/10 hover:border-yellow-500 text-foreground text-sm">Delegate</button>
        <button onClick={() => handleAnswer("eliminate")} className="p-3 rounded-xl bg-white/5 border border-white/10 hover:border-gray-500 text-foreground text-sm">Eliminate</button>
      </div>
    </div>
  )
}

// ============ GAME 7: Perspective Shift ============
function PerspectiveGame({ onComplete, onClose }: SpeedGameProps) {
  const [reflection, setReflection] = useState("")
  const [submitted, setSubmitted] = useState(false)

  if (submitted) {
    return (
      <div className="text-center py-8">
        <Compass className="w-16 h-16 mx-auto text-indigo-400 mb-4" />
        <h3 className="text-2xl font-bold text-foreground mb-2">New Perspectives!</h3>
        <p className="text-4xl font-bold text-[#50C2B8] mb-4">75 points</p>
        <div className="flex gap-3 justify-center">
          <GradientButton variant="teal" onClick={() => onComplete(75)}>Claim Points</GradientButton>
          <button onClick={onClose} className="px-4 py-2 rounded-xl bg-white/10 text-foreground">Close</button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20 mb-6">
        <p className="text-sm text-indigo-400 mb-2">Situation: Career change decision</p>
        <p className="text-foreground">View from multiple angles</p>
      </div>
      <div className="space-y-3 mb-6">
        <div className="p-3 rounded-xl bg-white/5 border border-white/10">
          <p className="font-medium text-indigo-400 mb-1">🔮 Your Future Self (10y)</p>
          <p className="text-sm text-foreground">This decision changed my life.</p>
        </div>
        <div className="p-3 rounded-xl bg-white/5 border border-white/10">
          <p className="font-medium text-indigo-400 mb-1">👔 A Mentor</p>
          <p className="text-sm text-foreground">Fear is normal, but regret is permanent.</p>
        </div>
        <div className="p-3 rounded-xl bg-white/5 border border-white/10">
          <p className="font-medium text-indigo-400 mb-1">👥 Your Friend</p>
          <p className="text-sm text-foreground">I support whatever makes you happy.</p>
        </div>
      </div>
      <Textarea value={reflection} onChange={(e) => setReflection(e.target.value)} placeholder="Your thoughts..." className="mb-4 h-20 bg-white/5 border-white/10 text-foreground" />
      <GradientButton variant="teal" className="w-full" onClick={() => setSubmitted(true)} disabled={!reflection.trim()}>Complete</GradientButton>
    </div>
  )
}

// ============ GAME 8: Risk Assessment ============
function RiskGame({ onComplete, onClose }: SpeedGameProps) {
  const scenarios = [
    { situation: "Invest 50% savings in startup", risk: "high", reward: "high" },
    { situation: "Ask for 10% raise", risk: "low", reward: "medium" },
    { situation: "Quit to travel a year", risk: "high", reward: "high" },
    { situation: "Take free online course", risk: "low", reward: "medium" },
  ]

  const [current, setCurrent] = useState(0)
  const [score, setScore] = useState(0)
  const [gameOver, setGameOver] = useState(false)
  const [selectedRisk, setSelectedRisk] = useState<string | null>(null)
  const [selectedReward, setSelectedReward] = useState<string | null>(null)

  const checkAnswer = () => {
    let pts = 0
    if (selectedRisk === scenarios[current].risk) pts += 15
    if (selectedReward === scenarios[current].reward) pts += 15
    setScore(prev => prev + pts)

    if (current >= scenarios.length - 1) {
      setGameOver(true)
    } else {
      setCurrent(prev => prev + 1)
      setSelectedRisk(null)
      setSelectedReward(null)
    }
  }

  if (gameOver) {
    return (
      <div className="text-center py-8">
        <Shield className="w-16 h-16 mx-auto text-amber-400 mb-4" />
        <h3 className="text-2xl font-bold text-foreground mb-2">Risk Analyst!</h3>
        <p className="text-4xl font-bold text-[#50C2B8] mb-4">{score} points</p>
        <div className="flex gap-3 justify-center">
          <GradientButton variant="orange" onClick={() => onComplete(score)}>Claim Points</GradientButton>
          <button onClick={onClose} className="px-4 py-2 rounded-xl bg-white/10 text-foreground">Close</button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex justify-between mb-4">
        <span className="text-sm text-muted-foreground">Scenario {current + 1}/4</span>
        <span className="text-sm text-amber-400">Score: {score}</span>
      </div>
      <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 mb-6 text-center">
        <p className="text-foreground font-medium">{scenarios[current].situation}</p>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-sm text-amber-400 mb-2 text-center">Risk Level</p>
          <div className="space-y-2">
            {["low", "medium", "high"].map(level => (
              <button key={level} onClick={() => setSelectedRisk(level)} className={`w-full p-2 rounded-lg text-sm capitalize ${selectedRisk === level ? "bg-amber-500/30 border border-amber-500" : "bg-white/5 border border-white/10 hover:border-amber-500"}`}>{level}</button>
            ))}
          </div>
        </div>
        <div>
          <p className="text-sm text-blue-400 mb-2 text-center">Potential Reward</p>
          <div className="space-y-2">
            {["low", "medium", "high"].map(level => (
              <button key={level} onClick={() => setSelectedReward(level)} className={`w-full p-2 rounded-lg text-sm capitalize ${selectedReward === level ? "bg-blue-500/30 border border-blue-500" : "bg-white/5 border border-white/10 hover:border-blue-500"}`}>{level}</button>
            ))}
          </div>
        </div>
      </div>
      {selectedRisk && selectedReward && <GradientButton variant="orange" className="w-full mt-4" onClick={checkAnswer}>Submit</GradientButton>}
    </div>
  )
}

// ============ MAIN PAGE ============

const allChallenges = [
  { id: "speed", title: "Speed Decision", desc: "Quick decisions under pressure", icon: Zap, points: 100, gradient: "from-[#FBBF24] to-[#F59E0B]", game: SpeedDecisionGame },
  { id: "proscons", title: "Pros & Cons", desc: "Balanced analysis practice", icon: Scale, points: 100, gradient: "from-[#3B82F6] to-[#06B6D4]", game: ProsConsGame },
  { id: "coinflip", title: "Gut Check", desc: "Discover true preferences", icon: Shuffle, points: 50, gradient: "from-[#F97316] to-[#FB923C]", game: CoinFlipGame },
  { id: "quiz", title: "Decision Wisdom", desc: "Test your knowledge", icon: Brain, points: 150, gradient: "from-[#7C3AED] to-[#A78BFA]", game: QuizGame },
  { id: "bias", title: "Bias Detector", desc: "Spot cognitive biases", icon: Eye, points: 120, gradient: "from-[#9333EA] to-[#C084FC]", game: BiasDetectorGame },
  { id: "priority", title: "Priority Matrix", desc: "Master prioritization", icon: Target, points: 100, gradient: "from-[#2563EB] to-[#60A5FA]", game: PriorityMatrixGame },
  { id: "perspective", title: "Perspective Shift", desc: "See all viewpoints", icon: Compass, points: 75, gradient: "from-[#6366F1] to-[#A5B4FC]", game: PerspectiveGame },
  { id: "risk", title: "Risk vs Reward", desc: "Assess risk & reward", icon: Shield, points: 120, gradient: "from-[#D97706] to-[#FBBF24]", game: RiskGame },
]

export default function ChallengesPage() {
  const [selectedGame, setSelectedGame] = useState<string | null>(null)
  const [todaysChallenges, setTodaysChallenges] = useState<string[]>([])
  const [completed, setCompleted] = useState<Set<string>>(new Set())
  const [totalPoints, setTotalPoints] = useState(0)
  const [hoursLeft, setHoursLeft] = useState(24)

  useEffect(() => {
    const today = getTodayKey()
    const selected = selectTodaysChallenges(allChallenges.map(c => c.id))
    setTodaysChallenges(selected)

    const completedToday = JSON.parse(localStorage.getItem(`completed_${today}`) || "[]")
    setCompleted(new Set(completedToday))

    const points = parseInt(localStorage.getItem(`points_${today}`) || "0")
    setTotalPoints(points)

    // Calculate hours until reset
    const nextMidnight = new Date()
    nextMidnight.setDate(nextMidnight.getDate() + 1)
    nextMidnight.setHours(0, 0, 0, 0)
    const h = Math.ceil((nextMidnight.getTime() - new Date().getTime()) / 3600000)
    setHoursLeft(h)
  }, [])

  const handleGameComplete = (gameId: string, points: number) => {
    const today = getTodayKey()
    const newCompleted = new Set(completed)
    newCompleted.add(gameId)
    setCompleted(newCompleted)

    const newTotal = totalPoints + points
    setTotalPoints(newTotal)

    localStorage.setItem(`completed_${today}`, JSON.stringify(Array.from(newCompleted)))
    localStorage.setItem(`points_${today}`, newTotal.toString())

    setSelectedGame(null)
  }

  const available = allChallenges.filter(c => todaysChallenges.includes(c.id))
  const locked = allChallenges.filter(c => !todaysChallenges.includes(c.id))
  const GameComponent = selectedGame ? allChallenges.find(c => c.id === selectedGame)?.game : null

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
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-4xl font-bold text-foreground mb-2">Daily Challenges</h1>
                <p className="text-muted-foreground">{available.length} challenges today • Resets in <Badge variant="secondary">{hoursLeft}h</Badge></p>
              </div>
              <div className="text-right">
                <div className="text-sm text-muted-foreground">Today's Points</div>
                <div className="text-4xl font-bold text-[#50C2B8]">{totalPoints}</div>
              </div>
            </div>
          </motion.div>

          {/* Available Challenges */}
          <div className="mb-12">
            <h2 className="text-xl font-bold text-foreground mb-4">🎮 Today's Challenges</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {available.map((challenge, index) => {
                const isCompleted = completed.has(challenge.id)
                const Comp = challenge.game

                return (
                  <motion.div 
                    key={challenge.id} 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                    whileHover={{ y: -4 }}
                  >
                    {selectedGame === challenge.id ? (
                      <Card className="bg-white/5 border-white/10 p-6 h-full backdrop-blur-xl">
                        <div className="flex justify-between items-center mb-4">
                          <h3 className="font-bold text-foreground">{challenge.title}</h3>
                          <button onClick={() => setSelectedGame(null)} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
                        </div>
                        <Comp onComplete={(pts) => handleGameComplete(challenge.id, pts)} onClose={() => setSelectedGame(null)} />
                      </Card>
                    ) : (
                      <Card className={`bg-gradient-to-br ${challenge.gradient} p-0 h-full overflow-hidden cursor-pointer border-white/10 hover:border-white/30 transition-all backdrop-blur-xl ${isCompleted ? "opacity-60" : ""}`} onClick={() => !isCompleted && setSelectedGame(challenge.id)}>
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <challenge.icon className="w-6 h-6 text-white/80" />
                            {isCompleted && <CheckCircle2 className="w-5 h-5 text-white" />}
                          </div>
                          <CardTitle className="text-white text-lg">{challenge.title}</CardTitle>
                          <CardDescription className="text-white/70 text-sm">{challenge.desc}</CardDescription>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-white/60">+{challenge.points} pts</span>
                            {!isCompleted && <Play className="w-4 h-4 text-white/60" />}
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </motion.div>
                )
              })}
            </div>
          </div>

          {/* Locked Challenges */}
          {locked.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              <h2 className="text-xl font-bold text-foreground mb-4">🔒 Tomorrow's Challenges</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {locked.map((challenge, index) => (
                  <motion.div
                    key={challenge.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.5 + index * 0.1 }}
                  >
                    <Card className="bg-white/5 border-white/10 opacity-50 backdrop-blur-xl">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <challenge.icon className="w-6 h-6 text-muted-foreground" />
                          <Lock className="w-5 h-5 text-muted-foreground" />
                        </div>
                        <CardTitle className="text-muted-foreground text-lg">{challenge.title}</CardTitle>
                        <CardDescription className="text-muted-foreground/70 text-sm">{challenge.desc}</CardDescription>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <span className="text-xs text-muted-foreground">+{challenge.points} pts</span>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </main>
  )
}
