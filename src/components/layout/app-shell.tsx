'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import {
  Calendar,
  CheckSquare,
  ClipboardCheck,
  Home,
  LayoutDashboard,
  Settings,
  BookOpen,
  BarChart3,
  Clock,
  LogOut,
} from 'lucide-react'
import { AttendanceTrackerIcon } from '@/components/shared/attendance-tracker-icon'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ThemeToggle } from '@/components/layout/theme-toggle'
import { OnboardingModal } from '@/components/onboarding/onboarding-modal'
import { OfflineBanner } from '@/components/shared/offline-banner'
import { motion } from 'motion/react'
import { signOut } from 'next-auth/react'
import { useState } from 'react'
import * as React from 'react'

function subscribeToMediaQuery(query: string, callback: () => void) {
  const mq = window.matchMedia(query)
  mq.addEventListener('change', callback)
  return () => mq.removeEventListener('change', callback)
}

function useMediaQuery(query: string) {
  return React.useSyncExternalStore(
    (cb) => subscribeToMediaQuery(query, cb),
    () => window.matchMedia(query).matches,
    () => false,
  )
}

const sidebarLinks = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/timetable', label: 'Timetable', icon: Clock },
  { href: '/subjects', label: 'Subjects', icon: BookOpen },
  { href: '/attendance', label: 'Attendance', icon: ClipboardCheck },
  { href: '/calendar', label: 'Calendar', icon: Calendar },
  { href: '/tasks', label: 'Tasks', icon: CheckSquare },
  { href: '/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/settings', label: 'Settings', icon: Settings },
]

const SIDEBAR_WIDTH = 224

function subscribeToReducedMotion(callback: () => void) {
  const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
  mq.addEventListener('change', callback)
  return () => mq.removeEventListener('change', callback)
}

function getReducedMotionSnapshot() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function getReducedMotionServerSnapshot() {
  return false
}

function useReducedMotion() {
  return React.useSyncExternalStore(subscribeToReducedMotion, getReducedMotionSnapshot, getReducedMotionServerSnapshot)
}

export function AppShell({
  children,
  needsOnboarding = false,
}: {
  children: React.ReactNode
  needsOnboarding?: boolean
}) {
  const pathname = usePathname()
  const reduced = useReducedMotion()
  const [onboardingDone, setOnboardingDone] = useState(false)

  const isDesktop = useMediaQuery('(min-width: 768px)')

  return (
    <div className="min-h-dvh">
      {isDesktop && (
        <aside
          className="fixed inset-y-0 left-0 z-30 flex flex-col border-r bg-card/95 card-shadow"
          style={{ width: SIDEBAR_WIDTH, minWidth: SIDEBAR_WIDTH }}
        >
          <div className="flex h-14 items-center gap-2.5 border-b border-border px-4">
            <AttendanceTrackerIcon size={28} />
            <span className="text-sm font-semibold tracking-tight">Academic Planner</span>
          </div>
          <ScrollArea className="flex-1 px-3 py-3">
            <nav className="space-y-0.5">
              {sidebarLinks.map((link, i) => {
                const Icon = link.icon
                const active = pathname === link.href
                return (
                <motion.div
                  key={link.href}
                  initial={reduced ? false : { opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: reduced ? 0 : i * 0.03, duration: reduced ? 0 : 0.2 }}
                >
                    <Link href={link.href}>
                      <div
                        className={cn(
                          'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all duration-150',
                          active
                            ? 'bg-primary/10 text-primary font-medium shadow-[inset_3px_0_0_0_var(--primary)]'
                            : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                        )}
                        aria-current={active ? 'page' : undefined}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        {link.label}
                      </div>
                    </Link>
                </motion.div>
                )
              })}
            </nav>
          </ScrollArea>
          <div className="border-t border-border p-3 flex items-center gap-1">
            <ThemeToggle />
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => signOut({ callbackUrl: '/login' })}
              aria-label="Sign out"
              className="ml-auto hover:bg-destructive/10 hover:text-destructive"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </aside>
      )}

      <div
        className="flex flex-1 flex-col min-w-0 h-dvh overflow-hidden"
        style={{ marginLeft: isDesktop ? SIDEBAR_WIDTH : 0 }}
      >
        {isDesktop && (
          <header className="flex h-14 items-center justify-between border-b bg-background/95 backdrop-blur-sm px-6 sticky top-0 z-40">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Home className="h-4 w-4" />
              <span>{sidebarLinks.find((l) => l.href === pathname)?.label ?? 'Dashboard'}</span>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => signOut({ callbackUrl: '/login' })}
                className="gap-2"
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </Button>
            </div>
          </header>
        )}

        {!isDesktop && (
          <header className="flex h-14 items-center justify-between border-b bg-background/95 px-4 sticky top-0 z-40">
            <Link href="/" className="flex items-center gap-2 font-semibold text-sm">
              <AttendanceTrackerIcon size={24} />
              <span>Academic Planner</span>
            </Link>
            <div className="flex items-center gap-1">
              <Link href="/settings" aria-label="Settings">
                <Button variant="ghost" size="icon-sm">
                  <Settings className="h-4 w-4" />
                </Button>
              </Link>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => signOut({ callbackUrl: '/login' })}
                aria-label="Sign out"
              >
                <LogOut className="h-4 w-4" />
              </Button>
              <ThemeToggle />
            </div>
          </header>
        )}

        <motion.main
          id="main-content"
          key={pathname}
          initial={reduced ? false : { opacity: 0, y: 8, filter: 'blur(4px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          transition={{ duration: reduced ? 0 : 0.25, ease: 'easeOut' }}
          className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8"
        >
          <OfflineBanner />
          {children}
        </motion.main>

        {isDesktop && (
          <footer className="border-t bg-background/95 px-6 py-3 text-xs text-muted-foreground">
            Academic Planner - Plan smarter, attend better.
          </footer>
        )}

        {!isDesktop && (
          <nav className="flex items-center justify-around border-t bg-background/95 py-1 pb-[env(safe-area-inset-bottom)] sticky bottom-0 z-40">
            {sidebarLinks.slice(0, 6).map((link) => {
              const Icon = link.icon
              const active = pathname === link.href
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'flex flex-col items-center gap-0.5 px-2 py-1 text-[10px] transition-colors relative',
                    active ? 'text-primary font-medium' : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <div className={cn("relative flex items-center justify-center h-8 w-8 rounded-lg transition-all duration-150", active && "bg-primary/10")}>
                    <Icon className="h-5 w-5" />
                  </div>
                  {link.label}
                  <motion.div
                    layoutId="mobile-nav-indicator"
                    className="h-1 w-1 rounded-full bg-primary mt-0.5"
                    initial={false}
                    animate={active ? { scale: 1, opacity: 1 } : { scale: 0.3, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  />
                </Link>
              )
            })}
          </nav>
        )}
      </div>

      <OnboardingModal
        open={needsOnboarding && !onboardingDone}
        onComplete={() => setOnboardingDone(true)}
      />
    </div>
  )
}

