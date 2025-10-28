"use client"

import React from 'react'

// This layout ensures all dashboard content is client-rendered
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Simple wrapper that ensures client-side rendering
  return (
    <div className="dashboard-layout">
      {children}
    </div>
  )
}
