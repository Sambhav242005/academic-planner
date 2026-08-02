'use client'

import { useState, useEffect } from 'react'

export function useOfflineStatus() {
  const [isOffline, setIsOffline] = useState(() => typeof navigator !== 'undefined' ? !navigator.onLine : false)
  const [hasPending, setHasPending] = useState(false)

  useEffect(() => {
    function goOnline() { setIsOffline(false) }
    function goOffline() { setIsOffline(true) }
    function onQueued() { setHasPending(true) }
    function onOnline() {
      setHasPending(false)
    }

    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)
    window.addEventListener('offline-mutation-queued', onQueued)
    window.addEventListener('online', onOnline)

    return () => {
      window.removeEventListener('online', goOnline)
      window.removeEventListener('offline', goOffline)
      window.removeEventListener('offline-mutation-queued', onQueued)
      window.removeEventListener('online', onOnline)
    }
  }, [])

  return { isOffline, hasPending }
}
