import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader } from '@/components/ui/card'

export default function AuthLoading() {
  return (
    <div className="w-full max-w-sm flex flex-col items-center gap-6">
      <div className="flex flex-col items-center gap-2">
        <Skeleton className="h-12 w-12 rounded-xl" />
        <Skeleton className="h-7 w-40 mt-2" />
        <Skeleton className="h-4 w-52 mt-1" />
      </div>
      <Card className="w-full bg-card border border-border">
        <CardHeader className="items-center">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-4 w-44 mt-1" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-10 w-full" />
          </div>
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    </div>
  )
}
