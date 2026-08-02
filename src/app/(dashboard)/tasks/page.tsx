import dynamic from 'next/dynamic'
import { PageSkeleton } from '@/components/shared/page-skeleton'

const TasksPage = dynamic(() => import('@/features/tasks/tasks-page').then(m => ({ default: m.TasksPage })), { loading: () => <PageSkeleton /> })

export default function Page() {
  return <TasksPage />
}
