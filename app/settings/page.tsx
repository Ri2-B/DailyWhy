"use client"

import { motion } from "framer-motion"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createBrowserClient } from "@supabase/ssr"
import { AnimatedBackground } from "@/components/ui/animated-background"
import { Sidebar } from "@/components/layout/sidebar"
import { Navbar } from "@/components/layout/navbar"
import { GlassCard } from "@/components/ui/glass-card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  Settings,
  User,
  Bell,
  Shield,
  Palette,
  Brain,
  Trash2,
  LogOut,
  ChevronRight,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Save,
  Loader2,
  Moon,
  Sun,
  Smartphone,
  Globe,
} from "lucide-react"

const settingsSections = [
  { id: "profile", label: "Profile", icon: User },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "privacy", label: "Privacy", icon: Shield },
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "ai", label: "AI Preferences", icon: Brain },
  { id: "account", label: "Account", icon: Settings },
]

export default function SettingsPage() {
  const router = useRouter()
  const [activeSection, setActiveSection] = useState("profile")
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingData, setIsLoadingData] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Profile settings
  const [profile, setProfile] = useState({
    fullName: "",
    email: "",
    bio: "",
    timezone: "UTC",
  })

  // Notification settings
  const [notifications, setNotifications] = useState({
    emailDigest: true,
    pushNotifications: true,
    weeklyInsights: true,
    streakReminders: true,
    achievementAlerts: true,
    communityUpdates: false,
  })

  // Privacy settings
  const [privacy, setPrivacy] = useState({
    publicProfile: false,
    shareDecisions: false,
    showStreak: true,
    allowAnalytics: true,
  })

  // Appearance settings
  const [appearance, setAppearance] = useState({
    theme: "dark" as "dark" | "light" | "system",
    compactMode: false,
    animationsEnabled: true,
  })

  // AI settings
  const [aiSettings, setAiSettings] = useState({
    showReasoning: true,
    detailedAnalysis: true,
    biasDetection: true,
    autoSuggest: true,
    confidenceThreshold: 70,
  })

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  // Load user data on mount
  useEffect(() => {
    const loadUserData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        
        if (!user) {
          router.push('/login')
          return
        }

        // Set email from auth
        setProfile(prev => ({
          ...prev,
          email: user.email || '',
          fullName: user.user_metadata?.full_name || ''
        }))

        // Load profile from database
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()

        if (profileData) {
          setProfile(prev => ({
            ...prev,
            fullName: profileData.full_name || prev.fullName,
            timezone: profileData.timezone || 'UTC',
            bio: profileData.preferences?.bio || ''
          }))

          // Load preferences
          if (profileData.preferences) {
            if (profileData.preferences.notifications) {
              setNotifications(profileData.preferences.notifications)
            }
            if (profileData.preferences.privacy) {
              setPrivacy(profileData.preferences.privacy)
            }
            if (profileData.preferences.appearance) {
              setAppearance(profileData.preferences.appearance)
            }
            if (profileData.preferences.ai) {
              setAiSettings(profileData.preferences.ai)
            }
          }
        }
      } catch (err) {
        console.error('Error loading user data:', err)
      } finally {
        setIsLoadingData(false)
      }
    }

    loadUserData()
  }, [supabase, router])

  const handleSave = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        setError('Not authenticated')
        return
      }

      // Update profile in database
      const { error: updateError } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          email: profile.email,
          full_name: profile.fullName,
          timezone: profile.timezone,
          preferences: {
            bio: profile.bio,
            notifications,
            privacy,
            appearance,
            ai: aiSettings
          },
          updated_at: new Date().toISOString()
        })

      if (updateError) {
        console.error('Update error:', updateError)
        setError(updateError.message)
        return
      }

      // Update auth metadata
      await supabase.auth.updateUser({
        data: { full_name: profile.fullName }
      })

      setSuccessMessage("Settings saved successfully!")
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (err) {
      console.error('Save error:', err)
      setError('Failed to save settings')
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/login")
    router.refresh()
  }

  const renderSection = () => {
    switch (activeSection) {
      case "profile":
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-4">Profile Information</h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName" className="text-foreground">
                    Full Name
                  </Label>
                  <Input
                    id="fullName"
                    value={profile.fullName}
                    onChange={(e) => setProfile({ ...profile, fullName: e.target.value })}
                    className="bg-white/5 border-white/10 text-foreground"
                  />
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
                      value={profile.email}
                      onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                      className="pl-10 bg-white/5 border-white/10 text-foreground"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bio" className="text-foreground">
                    Bio
                  </Label>
                  <textarea
                    id="bio"
                    value={profile.bio}
                    onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-foreground placeholder:text-muted-foreground focus:border-[#4DD6FF] focus:outline-none resize-none"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="timezone" className="text-foreground">
                    Timezone
                  </Label>
                  <div className="relative">
                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <select
                      id="timezone"
                      value={profile.timezone}
                      onChange={(e) => setProfile({ ...profile, timezone: e.target.value })}
                      className="w-full pl-10 pr-3 py-2 rounded-lg bg-white/5 border border-white/10 text-foreground focus:border-[#4DD6FF] focus:outline-none appearance-none"
                    >
                      <option value="UTC-8">Pacific Time (UTC-8)</option>
                      <option value="UTC-5">Eastern Time (UTC-5)</option>
                      <option value="UTC+0">UTC</option>
                      <option value="UTC+1">Central European Time (UTC+1)</option>
                      <option value="UTC+5:30">India Standard Time (UTC+5:30)</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )

      case "notifications":
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-4">Notification Preferences</h3>
              <div className="space-y-4">
                {[
                  { key: "emailDigest", label: "Email Digest", description: "Receive daily summary of your decisions" },
                  { key: "pushNotifications", label: "Push Notifications", description: "Get notified on your device" },
                  { key: "weeklyInsights", label: "Weekly Insights", description: "Receive weekly AI-powered insights" },
                  { key: "streakReminders", label: "Streak Reminders", description: "Reminder to maintain your streak" },
                  { key: "achievementAlerts", label: "Achievement Alerts", description: "Get notified when you unlock achievements" },
                  { key: "communityUpdates", label: "Community Updates", description: "Updates from the decision community" },
                ].map((item) => (
                  <div key={item.key} className="flex items-center justify-between p-4 rounded-lg bg-white/5 border border-white/10">
                    <div>
                      <p className="font-medium text-foreground">{item.label}</p>
                      <p className="text-sm text-muted-foreground">{item.description}</p>
                    </div>
                    <Switch
                      checked={notifications[item.key as keyof typeof notifications]}
                      onCheckedChange={(checked) => setNotifications({ ...notifications, [item.key]: checked })}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )

      case "privacy":
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-4">Privacy Settings</h3>
              <div className="space-y-4">
                {[
                  { key: "publicProfile", label: "Public Profile", description: "Allow others to see your profile" },
                  { key: "shareDecisions", label: "Share Decisions", description: "Share anonymous decisions with community" },
                  { key: "showStreak", label: "Show Streak", description: "Display your streak publicly" },
                  { key: "allowAnalytics", label: "Allow Analytics", description: "Help improve the app with usage data" },
                ].map((item) => (
                  <div key={item.key} className="flex items-center justify-between p-4 rounded-lg bg-white/5 border border-white/10">
                    <div>
                      <p className="font-medium text-foreground">{item.label}</p>
                      <p className="text-sm text-muted-foreground">{item.description}</p>
                    </div>
                    <Switch
                      checked={privacy[item.key as keyof typeof privacy]}
                      onCheckedChange={(checked) => setPrivacy({ ...privacy, [item.key]: checked })}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )

      case "appearance":
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-4">Appearance Settings</h3>
              <div className="space-y-4">
                {/* Theme Selection */}
                <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                  <p className="font-medium text-foreground mb-3">Theme</p>
                  <div className="flex gap-3">
                    {[
                      { value: "dark", label: "Dark", icon: Moon },
                      { value: "light", label: "Light", icon: Sun },
                      { value: "system", label: "System", icon: Smartphone },
                    ].map((theme) => (
                      <button
                        key={theme.value}
                        onClick={() => setAppearance({ ...appearance, theme: theme.value as typeof appearance.theme })}
                        className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border transition-colors ${
                          appearance.theme === theme.value
                            ? "bg-[#4786F5] border-[#4786F5] text-white"
                            : "bg-white/5 border-white/10 text-muted-foreground hover:bg-white/10"
                        }`}
                      >
                        <theme.icon className="w-4 h-4" />
                        {theme.label}
                      </button>
                    ))}
                  </div>
                </div>

                {[
                  { key: "compactMode", label: "Compact Mode", description: "Use smaller spacing and fonts" },
                  { key: "animationsEnabled", label: "Animations", description: "Enable smooth transitions and effects" },
                ].map((item) => (
                  <div key={item.key} className="flex items-center justify-between p-4 rounded-lg bg-white/5 border border-white/10">
                    <div>
                      <p className="font-medium text-foreground">{item.label}</p>
                      <p className="text-sm text-muted-foreground">{item.description}</p>
                    </div>
                    <Switch
                      checked={appearance[item.key as keyof typeof appearance] as boolean}
                      onCheckedChange={(checked) => setAppearance({ ...appearance, [item.key]: checked })}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )

      case "ai":
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-4">AI Preferences</h3>
              <div className="space-y-4">
                {[
                  { key: "showReasoning", label: "Show AI Reasoning", description: "Display detailed AI thought process" },
                  { key: "detailedAnalysis", label: "Detailed Analysis", description: "Get comprehensive decision analysis" },
                  { key: "biasDetection", label: "Bias Detection", description: "Alert me about potential biases" },
                  { key: "autoSuggest", label: "Auto Suggestions", description: "Get proactive decision suggestions" },
                ].map((item) => (
                  <div key={item.key} className="flex items-center justify-between p-4 rounded-lg bg-white/5 border border-white/10">
                    <div>
                      <p className="font-medium text-foreground">{item.label}</p>
                      <p className="text-sm text-muted-foreground">{item.description}</p>
                    </div>
                    <Switch
                      checked={aiSettings[item.key as keyof typeof aiSettings] as boolean}
                      onCheckedChange={(checked) => setAiSettings({ ...aiSettings, [item.key]: checked })}
                    />
                  </div>
                ))}

                {/* Confidence Threshold Slider */}
                <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="font-medium text-foreground">Confidence Threshold</p>
                      <p className="text-sm text-muted-foreground">Minimum confidence level for recommendations</p>
                    </div>
                    <span className="text-lg font-bold text-[#4DD6FF]">{aiSettings.confidenceThreshold}%</span>
                  </div>
                  <input
                    type="range"
                    min="50"
                    max="95"
                    value={aiSettings.confidenceThreshold}
                    onChange={(e) => setAiSettings({ ...aiSettings, confidenceThreshold: parseInt(e.target.value) })}
                    className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#4DD6FF]"
                  />
                </div>
              </div>
            </div>
          </div>
        )

      case "account":
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-4">Account Settings</h3>
              <div className="space-y-4">
                {/* Change Password */}
                <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                  <p className="font-medium text-foreground mb-3">Change Password</p>
                  <div className="space-y-3">
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="Current password"
                        className="pl-10 pr-10 bg-white/5 border-white/10 text-foreground"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2"
                      >
                        {showPassword ? (
                          <EyeOff className="w-5 h-5 text-muted-foreground" />
                        ) : (
                          <Eye className="w-5 h-5 text-muted-foreground" />
                        )}
                      </button>
                    </div>
                    <Input
                      type="password"
                      placeholder="New password"
                      className="bg-white/5 border-white/10 text-foreground"
                    />
                    <Input
                      type="password"
                      placeholder="Confirm new password"
                      className="bg-white/5 border-white/10 text-foreground"
                    />
                    <button className="px-4 py-2 rounded-lg bg-[#4786F5] text-white font-medium hover:bg-[#4786F5]/80 transition-colors">
                      Update Password
                    </button>
                  </div>
                </div>

                {/* Danger Zone */}
                <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20">
                  <p className="font-medium text-red-400 mb-3">Danger Zone</p>
                  <div className="space-y-3">
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-foreground hover:bg-white/10 transition-colors w-full"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30 transition-colors w-full">
                      <Trash2 className="w-4 h-4" />
                      Delete Account
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <main className="min-h-screen relative">
      <AnimatedBackground />
      <Navbar />
      <Sidebar />

      <div className="pt-24 pb-12 px-4 lg:pl-72">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-8"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#4786F5] to-[#4DD6FF] flex items-center justify-center">
                <Settings className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-3xl font-bold text-foreground">Settings</h1>
            </div>
            <p className="text-muted-foreground">Manage your account and preferences</p>
          </motion.div>

          {/* Success Message */}
          {successMessage && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-6 p-4 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-400"
            >
              {successMessage}
            </motion.div>
          )}

          <div className="grid lg:grid-cols-4 gap-6">
            {/* Sidebar Navigation */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <GlassCard className="!p-2">
                <nav className="space-y-1">
                  {settingsSections.map((section) => (
                    <button
                      key={section.id}
                      onClick={() => setActiveSection(section.id)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                        activeSection === section.id
                          ? "bg-[#4786F5] text-white"
                          : "text-muted-foreground hover:bg-white/5"
                      }`}
                    >
                      <section.icon className="w-5 h-5" />
                      <span className="font-medium">{section.label}</span>
                      {activeSection === section.id && <ChevronRight className="w-4 h-4 ml-auto" />}
                    </button>
                  ))}
                </nav>
              </GlassCard>
            </motion.div>

            {/* Content */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="lg:col-span-3"
            >
              <GlassCard>
                {renderSection()}

                {/* Save Button */}
                <div className="mt-8 pt-6 border-t border-white/10 flex justify-end">
                  <button
                    onClick={handleSave}
                    disabled={isLoading}
                    className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-[#4786F5] to-[#4DD6FF] hover:shadow-lg hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <Save className="w-5 h-5" />
                        Save Changes
                      </>
                    )}
                  </button>
                </div>
              </GlassCard>
            </motion.div>
          </div>
        </div>
      </div>
    </main>
  )
}
