'use client'

import { cn } from '@/lib/utils'

export function AttendanceTrackerIcon({
  className,
  size = 32,
}: {
  className?: string
  size?: number
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('shrink-0', className)}
      aria-hidden="true"
    >
      {/* Clipboard body */}
      <rect x="12" y="8" width="40" height="48" rx="4" fill="var(--primary)" opacity="0.15" />
      <rect x="14" y="10" width="36" height="44" rx="3" fill="var(--card)" stroke="var(--primary)" strokeWidth="1.5" />
      
      {/* Clipboard clip */}
      <rect x="24" y="6" width="16" height="8" rx="2" fill="var(--primary)" />
      <rect x="27" y="4" width="10" height="4" rx="2" fill="var(--primary)" opacity="0.7" />
      
      {/* Checkmark lines */}
      <circle cx="22" cy="22" r="3" fill="#22c55e" />
      <path d="M20.5 22L21.5 23L23.5 21" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      
      <circle cx="22" cy="32" r="3" fill="#22c55e" />
      <path d="M20.5 32L21.5 33L23.5 31" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      
      <circle cx="22" cy="42" r="3" fill="#22c55e" />
      <path d="M20.5 42L21.5 43L23.5 41" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      
      {/* Horizontal lines */}
      <rect x="30" y="21" width="14" height="2" rx="1" fill="var(--muted-foreground)" opacity="0.3" />
      <rect x="30" y="31" width="14" height="2" rx="1" fill="var(--muted-foreground)" opacity="0.3" />
      <rect x="30" y="41" width="10" height="2" rx="1" fill="var(--muted-foreground)" opacity="0.3" />
      
      {/* Pie chart */}
      <circle cx="50" cy="50" r="10" fill="var(--card)" stroke="var(--border)" strokeWidth="1" />
      <path d="M50 50 L50 40 A10 10 0 0 1 58.66 55 Z" fill="#8b5cf6" />
      <path d="M50 50 L58.66 55 A10 10 0 0 1 50 60 Z" fill="#3b82f6" />
      <path d="M50 50 L50 60 A10 10 0 0 1 41.34 55 Z" fill="#22c55e" />
      <path d="M50 50 L41.34 55 A10 10 0 0 1 50 40 Z" fill="#f59e0b" />
    </svg>
  )
}
