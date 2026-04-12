"use client"

import type { PropsWithChildren } from "react"
import { motion } from "framer-motion"

type DashboardTabPanelProps = PropsWithChildren<{
  panelKey: string
  className?: string
}>

export function DashboardTabPanel({
  panelKey,
  className,
  children,
}: DashboardTabPanelProps) {
  return (
    <motion.div
      key={panelKey}
      initial={{ y: 10 }}
      animate={{ y: 0 }}
      exit={{ y: -10 }}
      transition={{ duration: 0.2 }}
      className={className}
    >
      {children}
    </motion.div>
  )
}
