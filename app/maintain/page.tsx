"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { useMaintenanceMode } from "@/lib/maintenance-context"
import { Lock, ShieldAlert, ArrowLeft } from "lucide-react"

export default function MaintenancePage() {
  const router = useRouter()
  const { isMaintenanceMode, setMaintenanceMode } = useMaintenanceMode()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  
  // Simple authentication - in a real app, use proper authentication
  const adminPassword = "admin123" // This should be an environment variable in production
  
  const handleLogin = () => {
    if (password === adminPassword) {
      setIsAuthenticated(true)
      setError("")
      localStorage.setItem("maintenanceAuth", "true")
    } else {
      setError("Invalid password")
    }
  }
  
  useEffect(() => {
    // Check if already authenticated
    const auth = localStorage.getItem("maintenanceAuth")
    if (auth === "true") {
      setIsAuthenticated(true)
    }
  }, [])
  
  const handleToggle = (checked: boolean) => {
    setMaintenanceMode(checked)
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FBF7F2] to-white flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-md w-full"
      >
        <Button 
          variant="ghost" 
          className="mb-4 flex items-center text-[#6B5F53]"
          onClick={() => router.push("/")}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Home
        </Button>
        
        {!isAuthenticated ? (
          <Card className="shadow-lg border-[#C2884E]/10">
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl font-bold text-center flex items-center justify-center gap-2">
                <Lock className="h-5 w-5 text-[#C2884E]" />
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#C2884E] to-[#D1A46C]">
                  Maintenance Access
                </span>
              </CardTitle>
              <CardDescription className="text-center">
                Enter the admin password to access maintenance controls
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <input
                  id="password"
                  type="password"
                  placeholder="Enter admin password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#C2884E]/50"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleLogin()
                    }
                  }}
                />
                {error && <p className="text-red-500 text-sm">{error}</p>}
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                onClick={handleLogin}
                className="w-full bg-gradient-to-r from-[#C2884E] to-[#D1A46C] hover:opacity-90 text-white"
              >
                Login
              </Button>
            </CardFooter>
          </Card>
        ) : (
          <Card className="shadow-lg border-[#C2884E]/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-[#C2884E]" />
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#C2884E] to-[#D1A46C]">
                  Maintenance Mode
                </span>
              </CardTitle>
              <CardDescription>
                Toggle maintenance mode for the website
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between space-x-2">
                <Label htmlFor="maintenance-mode" className="flex flex-col space-y-1">
                  <span>Maintenance Mode</span>
                  <span className="font-normal text-sm text-gray-500">
                    When enabled, a maintenance notification will be shown to all users
                  </span>
                </Label>
                <Switch
                  id="maintenance-mode"
                  checked={isMaintenanceMode}
                  onCheckedChange={handleToggle}
                />
              </div>
              
              <div className={`p-4 rounded-lg ${isMaintenanceMode ? 'bg-amber-50 border border-amber-200' : 'bg-green-50 border border-green-200'}`}>
                <p className={`text-sm ${isMaintenanceMode ? 'text-amber-800' : 'text-green-800'}`}>
                  {isMaintenanceMode 
                    ? "Maintenance mode is currently ACTIVE. Users will see the maintenance notification."
                    : "Maintenance mode is currently INACTIVE. Users will have normal access to the site."}
                </p>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button 
                variant="outline" 
                onClick={() => {
                  localStorage.removeItem("maintenanceAuth")
                  setIsAuthenticated(false)
                }}
              >
                Logout
              </Button>
              <Button 
                onClick={() => router.push("/")}
                className="bg-gradient-to-r from-[#C2884E] to-[#D1A46C] hover:opacity-90 text-white"
              >
                Back to Site
              </Button>
            </CardFooter>
          </Card>
        )}
      </motion.div>
    </div>
  )
}
