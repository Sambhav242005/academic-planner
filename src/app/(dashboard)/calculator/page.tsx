import dynamic from 'next/dynamic'
import { PageSkeleton } from '@/components/shared/page-skeleton'

const CalculatorPage = dynamic(() => import('@/features/analytics/calculator-page').then(m => ({ default: m.CalculatorPage })), { loading: () => <PageSkeleton /> })

export default function Page() {
  return <CalculatorPage />
}
