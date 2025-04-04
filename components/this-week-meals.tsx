"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ChevronLeft, ChevronRight, Check, Plus, CheckCircle2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { CapybaraLogo } from "./capybara-logo"
import { type WeeklyMeals } from "@/lib/utils"

interface ThisWeekMealsProps {
  meals: WeeklyMeals;
  onSelectMeal: () => void;
}

export function ThisWeekMeals({ meals, onSelectMeal }: ThisWeekMealsProps) {
  const [activeDay, setActiveDay] = useState("monday")
  const [isAutoplay, setIsAutoplay] = useState(true)
  const [selectedMeals, setSelectedMeals] = useState<Record<string, boolean>>({})
  const { toast } = useToast()

  const days = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
  const dayLabels: Record<string, string> = {
    monday: "Monday",
    tuesday: "Tuesday",
    wednesday: "Wednesday",
    thursday: "Thursday",
    friday: "Friday",
    saturday: "Saturday",
    sunday: "Sunday",
  }

  // Auto-rotate through days
  useEffect(() => {
    if (!isAutoplay) return

    const interval = setInterval(() => {
      const currentIndex = days.indexOf(activeDay)
      const nextIndex = (currentIndex + 1) % days.length
      setActiveDay(days[nextIndex])
    }, 5000)

    return () => clearInterval(interval)
  }, [activeDay, isAutoplay, days])

  // Pause autoplay when user interacts
  const handleDayChange = (day: string) => {
    setActiveDay(day)
    setIsAutoplay(false)
  }

  const handleNextDay = () => {
    const currentIndex = days.indexOf(activeDay)
    const nextIndex = (currentIndex + 1) % days.length
    setActiveDay(days[nextIndex])
    setIsAutoplay(false)
  }

  const handlePrevDay = () => {
    const currentIndex = days.indexOf(activeDay)
    const prevIndex = (currentIndex - 1 + days.length) % days.length
    setActiveDay(days[prevIndex])
    setIsAutoplay(false)
  }

  const handleSelectMeal = (day: string) => {
    setSelectedMeals({
      ...selectedMeals,
      [day]: !selectedMeals[day],
    })

    toast({
      title: selectedMeals[day] ? "Meal removed" : "Meal selected",
      description: selectedMeals[day]
        ? `${meals[day].name} removed from your selections`
        : `${meals[day].name} added to your selections`,
    })
  }

  const handleViewAll = () => {
    if (onSelectMeal) {
      onSelectMeal()
    }
  }

  const activeMeal = meals[activeDay]

  return (
    <Card className="col-span-2 overflow-hidden">
      <CardHeader className="pb-0">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-2xl font-bold">Kapioo's Weekly Menu</CardTitle>
            <CardDescription>Explore our capybara-approved meals for the week</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={handlePrevDay}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={handleNextDay}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <div className="relative mt-4 px-6">
        <div className="flex space-x-1 overflow-x-auto pb-2 scrollbar-hide">
          {days.map((day) => (
            <Button
              key={day}
              variant={activeDay === day ? "default" : "ghost"}
              className={`flex-shrink-0 rounded-full px-4 ${activeDay === day ? "" : "opacity-70"}`}
              onClick={() => handleDayChange(day)}
            >
              {dayLabels[day].substring(0, 3)}
            </Button>
          ))}
        </div>
      </div>

      <CardContent className="p-6 pt-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeDay}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="grid md:grid-cols-2 gap-6"
          >
            <motion.div
              className="relative overflow-hidden rounded-xl aspect-square w-full h-[350px] md:h-[450px] md:w-[450px] mx-auto"
              whileHover={{ scale: 1.03 }}
              transition={{ duration: 0.2 }}
            >
              <img
                src={activeMeal.image || "/placeholder.svg"}
                alt={activeMeal.name}
                className="w-full h-full object-cover rounded-xl"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex flex-col justify-end p-4">
                {/* Tags removed from here */}
              </div>
              <div className="absolute top-4 right-4">
                <Badge variant="secondary" className="bg-primary/90 text-white backdrop-blur-sm">
                  <CapybaraLogo size="small" animated={false} />
                  <span className="ml-1">Approved</span>
                </Badge>
              </div>
            </motion.div>

            <div className="flex flex-col justify-between">
              <div className="space-y-4">
                <div>
                  <h2 className="text-2xl font-bold">{activeMeal.name}</h2>
                </div>

                <div className="space-y-2">
                  {activeMeal.description.split('. ')
                    .filter(Boolean)
                    .map((sentence, index) => (
                      <div key={index} className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500 mt-1 flex-shrink-0" />
                        <p className="text-muted-foreground text-sm">{sentence.replace(/\.$/, '').trim()}</p>
                      </div>
                    ))}
                </div>

                <div className="flex flex-wrap gap-1">
                  {activeMeal.tags?.map((tag: string) => (
                    <Badge key={tag} variant="outline" className="bg-muted/50">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-3 mt-6">
                <Button
                  className="flex-1"
                  onClick={() => handleSelectMeal(activeDay)}
                  variant={selectedMeals[activeDay] ? "outline" : "default"}
                >
                  {selectedMeals[activeDay] ? (
                    <>
                      <Check className="mr-2 h-4 w-4" />
                      Selected
                    </>
                  ) : (
                    <>
                      <Plus className="mr-2 h-4 w-4" />
                      Select This Meal
                    </>
                  )}
                </Button>
                <Button variant="outline" onClick={handleViewAll}>
                  View All Meals
                </Button>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </CardContent>

      <CardFooter className="bg-muted/30 px-6 py-4">
        <div className="flex items-center justify-between w-full">
          <div className="flex -space-x-2">
            {days.map((day, index) => (
              <motion.div
                key={day}
                className={`w-10 h-10 rounded-full border-2 border-background ${
                  activeDay === day ? "ring-2 ring-primary" : ""
                } overflow-hidden cursor-pointer`}
                whileHover={{ scale: 1.1, zIndex: 10 }}
                onClick={() => handleDayChange(day)}
                style={{ zIndex: days.length - index }}
              >
                <img src={meals[day].image || "/placeholder.svg"} alt={day} className="w-full h-full object-cover" />
              </motion.div>
            ))}
          </div>
          <div className="text-sm text-muted-foreground">
            {Object.keys(selectedMeals).filter((day) => selectedMeals[day]).length} meals selected
          </div>
        </div>
      </CardFooter>
    </Card>
  )
}

