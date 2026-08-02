import dynamic from 'next/dynamic'
import { PageSkeleton } from '@/components/shared/page-skeleton'

const SubjectsPage = dynamic(() => import('@/features/subjects/subjects-page').then(m => ({ default: m.SubjectsPage })), { loading: () => <PageSkeleton /> })

export default function Page() {
  return <SubjectsPage />
}
