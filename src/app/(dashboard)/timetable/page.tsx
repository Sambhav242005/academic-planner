import dynamic from 'next/dynamic'
import { PageSkeleton } from '@/components/shared/page-skeleton'

const TimetablePage = dynamic(() => import('@/features/timetable/timetable-page').then(m => ({ default: m.TimetablePage })), { loading: () => <PageSkeleton /> })

export default function Page() {
  return <TimetablePage />
}
