import { redirect } from 'next/navigation'
import DashboardPage from './(dashboard)/page'
import { AppShell } from '@/components/layout/app-shell'
import { auth } from '@/lib/auth/auth'

export default async function HomePage() {
	const session = await auth()

	if (!session?.user) {
		redirect('/login')
	}

	return (
		<AppShell>
			<DashboardPage />
		</AppShell>
	)
}
