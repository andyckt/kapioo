"use client"

import type { ReactNode } from "react"

import { motion } from "framer-motion"

interface AdminTabPanelProps {
  children: ReactNode
  panelKey: string
  className?: string
}

export function AdminTabPanel({ children, panelKey, className }: AdminTabPanelProps) {
  return (
    <motion.div
      key={panelKey}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className={className}
    >
      {children}
    </motion.div>
  )
}
