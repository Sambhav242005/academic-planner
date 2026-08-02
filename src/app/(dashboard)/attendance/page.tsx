import dynamic from 'next/dynamic'
import { PageSkeleton } from '@/components/shared/page-skeleton'

const AttendancePage = dynamic(() => import('@/features/attendance/attendance-page').then(m => ({ default: m.AttendancePage })), { loading: () => <PageSkeleton /> })

export default function Page() {
  return <AttendancePage />
}
