"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"

export default function LoginPage() {
  const [userId, setUserId] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    // Simulate login - in a real app, this would be an API call
    setTimeout(() => {
      setIsLoading(false)

      // For demo purposes, we'll use a simple validation
      if (userId === "user123" && password === "123456") {
        toast({
          title: "Login successful",
          description: "Welcome back to Kapioo!",
        })
        router.push("/dashboard")
      } else if (userId === "admin" && password === "123456") {
        toast({
          title: "Admin login successful",
          description: "Welcome to the admin dashboard",
        })
        router.push("/admin")
      } else {
        toast({
          title: "Login failed",
          description: "Invalid user ID or password",
          variant: "destructive",
        })
      }
    }, 1500)
  }

  return (
    <div className="flex min-h-screen flex-col">
      <div className="container flex flex-col items-center justify-center min-h-screen py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]"
        >
          <div className="flex flex-col space-y-2 text-center">
            <h1 className="text-2xl font-semibold tracking-tight">Welcome to Kapioo</h1>
            <p className="text-sm text-muted-foreground">Enter your user ID and password to access your account</p>
          </div>
          <div className="grid gap-6">
            <form onSubmit={handleLogin}>
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="userId">User ID</Label>
                  <Input
                    id="userId"
                    placeholder="user123"
                    value={userId}
                    onChange={(e) => setUserId(e.target.value)}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Logging in..." : "Sign In"}
                </Button>
              </div>
            </form>
            <div className="mt-4 text-center text-sm">
              <p>
                Demo credentials: <br />
                User: user123, Password: 123456 <br />
                Admin: admin, Password: 123456
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

