"use client"

import React, { createContext, useState, useContext, useEffect } from 'react'

type MaintenanceContextType = {
  isMaintenanceMode: boolean
  setMaintenanceMode: (value: boolean) => void
}

const MaintenanceContext = createContext<MaintenanceContextType | undefined>(undefined)

export function MaintenanceProvider({ children }: { children: React.ReactNode }) {
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  
  // Load maintenance state from API on component mount
  useEffect(() => {
    const fetchMaintenanceStatus = async () => {
      try {
        const response = await fetch('/api/maintenance/status')
        if (response.ok) {
          const data = await response.json()
          setIsMaintenanceMode(data.isMaintenanceMode || false)
        }
      } catch (error) {
        console.error('Failed to fetch maintenance status:', error)
        // Fallback to localStorage if API fails
        const storedValue = localStorage.getItem('maintenanceMode')
        if (storedValue !== null) {
          setIsMaintenanceMode(storedValue === 'true')
        }
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchMaintenanceStatus()
  }, [])

  // Save to both localStorage and API whenever the state changes
  useEffect(() => {
    if (!isLoading) {
      localStorage.setItem('maintenanceMode', isMaintenanceMode.toString())
    }
  }, [isMaintenanceMode, isLoading])

  const updateMaintenanceMode = async (value: boolean) => {
    setIsMaintenanceMode(value)
    
    // Update on server
    try {
      await fetch('/api/maintenance/status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isMaintenanceMode: value }),
      })
    } catch (error) {
      console.error('Failed to update maintenance status on server:', error)
    }
  }

  return (
    <MaintenanceContext.Provider value={{ isMaintenanceMode, setMaintenanceMode: updateMaintenanceMode }}>
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
