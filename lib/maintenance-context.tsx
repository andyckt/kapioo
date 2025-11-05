"use client"

import React, { createContext, useState, useContext, useEffect } from 'react'

type MaintenanceContextType = {
  isMaintenanceMode: boolean
  setMaintenanceMode: (value: boolean) => void
}

const MaintenanceContext = createContext<MaintenanceContextType | undefined>(undefined)

export function MaintenanceProvider({ children }: { children: React.ReactNode }) {
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(false)
  
  // Load maintenance state from localStorage on component mount
  useEffect(() => {
    const storedValue = localStorage.getItem('maintenanceMode')
    if (storedValue !== null) {
      setIsMaintenanceMode(storedValue === 'true')
    }
  }, [])

  // Save to localStorage whenever the state changes
  useEffect(() => {
    localStorage.setItem('maintenanceMode', isMaintenanceMode.toString())
  }, [isMaintenanceMode])

  const setMaintenanceMode = (value: boolean) => {
    setIsMaintenanceMode(value)
  }

  return (
    <MaintenanceContext.Provider value={{ isMaintenanceMode, setMaintenanceMode }}>
      {children}
    </MaintenanceContext.Provider>
  )
}

export function useMaintenanceMode() {
  const context = useContext(MaintenanceContext)
  if (context === undefined) {
    throw new Error('useMaintenanceMode must be used within a MaintenanceProvider')
  }
  return context
}
