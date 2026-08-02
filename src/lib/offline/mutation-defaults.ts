'use client'

import { MutationCache, QueryClient } from '@tanstack/react-query'

function handleOfflineError(error: unknown) {
  if (!(error instanceof Error)) return false
  const isAuthError =
    error.message.includes('auth') ||
    error.message.includes('401') ||
    error.message.includes('403')
  if (isAuthError) return false

  const isNetworkError =
    error.message.includes('fetch') ||
    error.message.includes('network') ||
    error.message.includes('Failed to fetch') ||
    error.message.includes('NetworkError')
  return isNetworkError
}

export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        refetchOnWindowFocus: false,
      },
    },
    mutationCache: new MutationCache({
      onError: (_vars, _ctx, _mutation, error) => {
        if (typeof window !== 'undefined' && handleOfflineError(error)) {
          window.dispatchEvent(new Event('offline-mutation-queued'))
        }
      },
    }),
  })
}
