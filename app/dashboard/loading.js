"use client"

// This file ensures the dashboard has a client-side loading state
// which helps prevent server-side rendering issues

export default function Loading() {
  return (
    <div className="flex h-screen w-full items-center justify-center">
      <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-primary"></div>
    </div>
  )
}
