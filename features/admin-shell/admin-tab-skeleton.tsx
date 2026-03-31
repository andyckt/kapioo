"use client"

import { Skeleton } from "@/components/ui/skeleton"

export function AdminTabSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading tab">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-10 w-full sm:w-64" />
      </div>
      <Skeleton className="h-[280px] w-full rounded-lg" />
      <div className="flex gap-2">
        <Skeleton className="h-9 w-24" />
        <Skeleton className="h-9 w-24" />
        <Skeleton className="h-9 w-24" />
      </div>
    </div>
  )
}
