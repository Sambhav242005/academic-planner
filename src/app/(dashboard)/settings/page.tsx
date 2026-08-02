import dynamic from 'next/dynamic'
import { PageSkeleton } from '@/components/shared/page-skeleton'

const SettingsPage = dynamic(() => import('@/features/settings/settings-page').then(m => ({ default: m.SettingsPage })), { loading: () => <PageSkeleton /> })

export default function Page() {
  return <SettingsPage />
}
