'use client'

import { useOfflineStatus } from '@/lib/offline/use-offline-status'
import { WifiOff, Loader2 } from 'lucide-react'

export function OfflineBanner() {
  const { isOffline, hasPending } = useOfflineStatus()

  if (!isOffline && !hasPending) return null

  return (
    <div
      role="status"
      aria-live="polite"
      className="sticky top-0 z-10 -mx-4 -mt-4 mb-2 flex items-center justify-center gap-2 bg-amber-600 px-3 py-2 text-xs font-medium text-white shadow-lg md:-mx-6 md:-mt-6 lg:-mx-8 lg:-mt-8 sm:px-4 sm:text-sm"
    >
      {isOffline ? (
        <>
          <WifiOff className="h-3.5 w-3.5" />
          <span>You&apos;re offline — changes will sync when reconnected</span>
        </>
      ) : hasPending ? (
        <>
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          <span>Syncing pending changes…</span>
        </>
      ) : null}
    </div>
  )
}
