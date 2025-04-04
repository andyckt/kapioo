"use client"

import { useState, useEffect, useMemo } from "react"
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
  const [imagesLoaded, setImagesLoaded] = useState(false)
  const { toast } = useToast()

  const days = useMemo(() => ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"], [])
  const dayLabels = useMemo((): Record<string, string> => ({
    monday: "Monday",
    tuesday: "Tuesday",
    wednesday: "Wednesday",
    thursday: "Thursday",
    friday: "Friday",
    saturday: "Saturday",
    sunday: "Sunday",
  }), [])

  // Preload all meal images to prevent loading delay when switching tabs
  useEffect(() => {
    let loadedCount = 0;
    const totalImagesToLoad = days.length;
    
    days.forEach(day => {
      if (meals[day]?.image) {
        const img = new Image();
        img.onload = () => {
          loadedCount++;
          if (loadedCount === totalImagesToLoad) {
            setImagesLoaded(true);
          }
        };
        img.src = meals[day].image as string;
      } else {
        loadedCount++;
        if (loadedCount === totalImagesToLoad) {
          setImagesLoaded(true);
        }
      }
    });
  }, [days, meals]);

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

  const activeMeal = useMemo(() => meals[activeDay], [meals, activeDay]);

  return (
    <Card className="col-span-2 overflow-hidden">
      <CardHeader className="pb-0 px-4 sm:px-6">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl sm:text-2xl font-bold">Kapioo's Weekly Menu</CardTitle>
            <CardDescription>Explore our capybara-approved meals for the week</CardDescription>
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            <Button variant="outline" size="icon" onClick={handlePrevDay} className="h-8 w-8 sm:h-9 sm:w-9">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={handleNextDay} className="h-8 w-8 sm:h-9 sm:w-9">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <div className="relative mt-2 sm:mt-4 px-3 sm:px-6">
        <div className="flex space-x-1 overflow-x-auto pb-2 scrollbar-hide">
          {days.map((day) => (
            <Button
              key={day}
              variant={activeDay === day ? "default" : "ghost"}
              className={`flex-shrink-0 rounded-full text-xs sm:text-sm px-2 sm:px-3 h-8 ${activeDay === day ? "" : "opacity-70"}`}
              onClick={() => handleDayChange(day)}
            >
              {dayLabels[day].substring(0, 3)}
            </Button>
          ))}
        </div>
      </div>

      <CardContent className="p-4 sm:p-6 pt-4">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={activeDay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15, ease: "easeInOut" }}
            className="flex flex-col md:grid md:grid-cols-2 gap-4 md:gap-6"
          >
            <motion.div
              className="relative overflow-hidden rounded-xl aspect-square w-full h-[280px] sm:h-[320px] md:h-[450px] md:w-[450px] mx-auto"
              whileHover={{ scale: 1.03 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              layoutId="meal-image-container"
            >
              <img
                src={activeMeal.image || "/placeholder.svg"}
                alt={activeMeal.name}
                className="w-full h-full object-cover rounded-xl"
                loading="eager"
                style={{ 
                  willChange: "transform, opacity"
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex flex-col justify-end p-4">
                {/* Tags removed from here */}
              </div>
            </motion.div>

            <motion.div 
              className="flex flex-col justify-between mt-2 md:mt-0"
              transition={{ duration: 0.2, staggerChildren: 0.05 }}
            >
              <div className="space-y-3 md:space-y-4">
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <h2 className="text-xl md:text-2xl font-bold">{activeMeal.name}</h2>
                </motion.div>

                <motion.div 
                  className="space-y-2"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3, delay: 0.1 }}
                >
                  {activeMeal.description.split('. ')
                    .filter(Boolean)
                    .map((sentence, index) => (
                      <div key={index} className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500 mt-1 flex-shrink-0" />
                        <p className="text-muted-foreground text-sm">{sentence.replace(/\.$/, '').trim()}</p>
                      </div>
                    ))}
                </motion.div>

                <motion.div 
                  className="flex flex-wrap gap-1"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3, delay: 0.2 }}
                >
                  {activeMeal.tags?.map((tag: string) => (
                    <Badge key={tag} variant="outline" className="bg-muted/50">
                      {tag}
                    </Badge>
                  ))}
                </motion.div>
              </div>

              <div className="flex items-center gap-2 md:gap-3 mt-4 md:mt-6">
                <Button
                  className="flex-1 px-2 md:px-4"
                  onClick={() => handleSelectMeal(activeDay)}
                  variant={selectedMeals[activeDay] ? "outline" : "default"}
                  size="sm"
                  md-size="default"
                >
                  {selectedMeals[activeDay] ? (
                    <>
                      <Check className="mr-1 md:mr-2 h-4 w-4" />
                      Selected
                    </>
                  ) : (
                    <>
                      <Plus className="mr-1 md:mr-2 h-4 w-4" />
                      Select This Meal
                    </>
                  )}
                </Button>
                <Button variant="outline" onClick={handleViewAll} size="sm" md-size="default" className="px-2 md:px-4">
                  View All Meals
                </Button>
              </div>
            </motion.div>
          </motion.div>
        </AnimatePresence>
      </CardContent>

      <CardFooter className="bg-muted/30 px-4 sm:px-6 py-3 sm:py-4">
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
                <img 
                  src={meals[day].image || "/placeholder.svg"} 
                  alt={day} 
                  className="w-full h-full object-cover" 
                  loading="eager"
                />
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

