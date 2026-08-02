import { auth } from '@/lib/auth/auth'
import { redirect } from 'next/navigation'
import { AppShell } from '@/components/layout/app-shell'
import { createAdminClient } from '@/lib/supabase/admin'
import { DEMO_EMAIL } from '@/lib/demo/seed'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const isDemo = session.user.email === DEMO_EMAIL

  let needsOnboarding = false
  if (!isDemo) {
    const supabase = createAdminClient()
    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name, college, semester')
      .eq('id', session.user.id)
      .single()

    needsOnboarding = !profile?.display_name || !profile?.college || !profile?.semester
  }

  return <AppShell needsOnboarding={needsOnboarding}>{children}</AppShell>
}
