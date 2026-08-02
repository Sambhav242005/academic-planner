import dynamic from 'next/dynamic'
import { PageSkeleton } from '@/components/shared/page-skeleton'

const CalendarPage = dynamic(() => import('@/features/calendar/calendar-page').then(m => ({ default: m.CalendarPage })), { loading: () => <PageSkeleton /> })

export default function Page() {
  return <CalendarPage />
}
