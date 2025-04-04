"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { ChevronLeft, ChevronRight } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export function MealCalendar({ selectedMeals, meals }) {
  const [currentWeek, setCurrentWeek] = useState(0)
  const weeks = ["This Week", "Next Week", "In Two Weeks", "In Three Weeks"]

  const nextWeek = () => {
    if (currentWeek < weeks.length - 1) {
      setCurrentWeek(currentWeek + 1)
    }
  }

  const prevWeek = () => {
    if (currentWeek > 0) {
      setCurrentWeek(currentWeek - 1)
    }
  }

  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Meal Calendar</CardTitle>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="icon" onClick={prevWeek} disabled={currentWeek === 0}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium">{weeks[currentWeek]}</span>
            <Button variant="outline" size="icon" onClick={nextWeek} disabled={currentWeek === weeks.length - 1}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <CardDescription>View your upcoming meals</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-2">
          {days.map((day, index) => (
            <div key={day} className="text-center">
              <div className="text-xs font-medium mb-1">{day.substring(0, 3)}</div>
              <motion.div
                className={`aspect-square rounded-md border overflow-hidden ${
                  currentWeek === 0 && selectedMeals[day.toLowerCase()] ? "border-primary" : ""
                }`}
                whileHover={{ scale: 1.05 }}
                transition={{ duration: 0.2 }}
              >
                {currentWeek === 0 && selectedMeals[day.toLowerCase()] ? (
                  <div className="h-full w-full relative">
                    <img
                      src={meals[day.toLowerCase()].image || "/placeholder.svg"}
                      alt={meals[day.toLowerCase()].name}
                      className="object-cover h-full w-full"
                    />
                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                      <span className="text-white text-xs font-medium px-1">Ordered</span>
                    </div>
                  </div>
                ) : (
                  <div className="h-full w-full bg-muted flex items-center justify-center">
                    <span className="text-xs text-muted-foreground">
                      {currentWeek === 0 ? "Available" : "Coming Soon"}
                    </span>
                  </div>
                )}
              </motion.div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

