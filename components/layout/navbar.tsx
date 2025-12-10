"use client"

import { motion } from "framer-motion"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { createBrowserClient } from "@supabase/ssr"
import { cn } from "@/lib/utils"
import { Brain, LayoutDashboard, PlusCircle, LineChart, Sparkles, Menu, X, LogOut } from "lucide-react"
import { useState } from "react"

const navLinks = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/create", label: "New Decision", icon: PlusCircle },
  { href: "/insights", label: "Insights", icon: LineChart },
  { href: "/challenges", label: "Challenges", icon: Sparkles },
]

// Pages where we show auth buttons (Sign in / Get Started)
const publicPages = ["/", "/login", "/signup"]

// Pages where we show app navigation (Dashboard, etc.)
const protectedPages = ["/dashboard", "/create", "/insights", "/challenges", "/decision"]

export function Navbar() {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const handleNavigation = (path: string) => {
    router.push(path)
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  // Determine if we're on a public page or protected page
  const isPublicPage = publicPages.includes(pathname) || pathname === "/"
  const isProtectedPage = protectedPages.some(page => pathname.startsWith(page))

  return (
    <motion.nav
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="fixed top-0 left-0 right-0 z-50"
    >
      <div className="mx-4 mt-4">
        <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <Link href={isProtectedPage ? "/dashboard" : "/"} className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0A938A] to-[#50C2B8] flex items-center justify-center">
                <Brain className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold text-foreground">DailyWhy</span>
            </Link>

            {/* Desktop Navigation - Only show on protected pages */}
            {isProtectedPage && (
              <div className="hidden md:flex items-center gap-2">
                {navLinks.map((link) => {
                  const isActive = pathname === link.href
                  return (
                    <Link key={link.href} href={link.href}>
                      <motion.div
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className={cn(
                          "flex items-center gap-2 px-4 py-2 rounded-xl transition-colors",
                          isActive
                            ? "bg-gradient-to-r from-[#0A938A] to-[#50C2B8] text-white"
                            : "text-muted-foreground hover:text-foreground hover:bg-white/5",
                        )}
                      >
                        <link.icon className="w-4 h-4" />
                        <span className="text-sm font-medium">{link.label}</span>
                      </motion.div>
                    </Link>
                  )
                })}
              </div>
            )}

            {/* Auth Buttons - Only show on public pages */}
            {isPublicPage && (
              <div className="hidden md:flex items-center gap-3">
                <button
                  onClick={() => handleNavigation('/login')}
                  className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                >
                  Sign in
                </button>
                <button
                  onClick={() => handleNavigation('/signup')}
                  className="px-4 py-2 text-sm font-medium bg-gradient-to-r from-[#0A938A] to-[#50C2B8] text-white rounded-xl cursor-pointer"
                >
                  Get Started
                </button>
              </div>
            )}

            {/* Logout Button - Only show on protected pages */}
            {isProtectedPage && (
              <div className="hidden md:flex items-center gap-3">
                <button
                  onClick={handleSignOut}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </button>
              </div>
            )}

            {/* Mobile Menu Button */}
            <button className="md:hidden text-foreground" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

          {/* Mobile Menu */}
          <AnimatedMobileMenu 
            isOpen={mobileMenuOpen} 
            pathname={pathname} 
            isPublicPage={isPublicPage}
            isProtectedPage={isProtectedPage}
            onSignOut={handleSignOut}
          />
        </div>
      </div>
    </motion.nav>
  )
}

function AnimatedMobileMenu({ 
  isOpen, 
  pathname,
  isPublicPage,
  isProtectedPage,
  onSignOut 
}: { 
  isOpen: boolean
  pathname: string
  isPublicPage: boolean
  isProtectedPage: boolean
  onSignOut: () => void 
}) {
  if (!isOpen) return null

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      className="md:hidden mt-4 pt-4 border-t border-white/10"
    >
      <div className="flex flex-col gap-2">
        {/* Show nav links only on protected pages */}
        {isProtectedPage && navLinks.map((link) => {
          const isActive = pathname === link.href
          return (
            <Link key={link.href} href={link.href}>
              <div
                className={cn(
                  "flex items-center gap-2 px-4 py-3 rounded-xl transition-colors",
                  isActive
                    ? "bg-gradient-to-r from-[#0A938A] to-[#50C2B8] text-white"
                    : "text-muted-foreground hover:text-foreground hover:bg-white/5",
                )}
              >
                <link.icon className="w-5 h-5" />
                <span className="font-medium">{link.label}</span>
              </div>
            </Link>
          )
        })}

        {/* Show auth buttons only on public pages */}
        {isPublicPage && (
          <div className="flex gap-2 mt-2 pt-2 border-t border-white/10">
            <Link
              href="/login"
              className="flex-1 py-3 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors rounded-xl border border-white/10 text-center cursor-pointer"
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className="flex-1 py-3 text-sm font-medium bg-gradient-to-r from-[#0A938A] to-[#50C2B8] text-white rounded-xl text-center cursor-pointer"
            >
              Get Started
            </Link>
          </div>
        )}

        {/* Show logout only on protected pages */}
        {isProtectedPage && (
          <div className="mt-2 pt-2 border-t border-white/10">
            <button
              onClick={onSignOut}
              className="w-full flex items-center justify-center gap-2 py-3 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors rounded-xl border border-white/10"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        )}
      </div>
    </motion.div>
  )
}
