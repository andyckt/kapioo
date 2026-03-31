"use client"

import { Skeleton } from "@/components/ui/skeleton"

export function DashboardTabSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading">
      <Skeleton className="h-10 w-2/3 max-w-md" />
      <Skeleton className="h-[200px] w-full rounded-xl" />
      <div className="grid gap-3 sm:grid-cols-2">
        <Skeleton className="h-32 rounded-lg" />
        <Skeleton className="h-32 rounded-lg" />
      </div>
    </div>
  )
}
