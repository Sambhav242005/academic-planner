import dynamic from 'next/dynamic'
import { PageSkeleton } from '@/components/shared/page-skeleton'

const AnalyticsPage = dynamic(() => import('@/features/analytics/analytics-page').then(m => ({ default: m.AnalyticsPage })), { loading: () => <PageSkeleton /> })

export default function Page() {
  return <AnalyticsPage />
}
