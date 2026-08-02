'use client'

import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister'
import { QueryClient } from '@tanstack/react-query'
import { ThemeProvider } from 'next-themes'
import { TooltipProvider } from '@/components/ui/tooltip'
import { SessionProvider } from 'next-auth/react'
import { useMemo } from 'react'
import { LoadingBar } from '@/components/shared/loading-bar'

export function Providers({ children }: { children: React.ReactNode }) {
  const queryClient = useMemo(() => new QueryClient({
    defaultOptions: {
      queries: {
        gcTime: 1000 * 60 * 60 * 24,
        staleTime: 30_000,
        refetchOnWindowFocus: false,
      },
    },
  }), [])

  const persister = useMemo(() => {
    if (typeof window === 'undefined') return null
    return createSyncStoragePersister({ storage: window.localStorage })
  }, [])

  return (
    <SessionProvider>
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={{
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          persister: persister as any,
          dehydrateOptions: {
            shouldDehydrateQuery: (query) =>
              query.state.status === 'success',
          },
        }}
      >
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
          <TooltipProvider>
            <LoadingBar />
            {children}
          </TooltipProvider>
        </ThemeProvider>
      </PersistQueryClientProvider>
    </SessionProvider>
  )
}
