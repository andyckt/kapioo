"use client"

import { useState, useEffect, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ChevronLeft, ChevronRight, Check, Plus, CheckCircle2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { useLanguage } from "@/lib/language-context"
import { CapybaraLogo } from "./capybara-logo"
import { type WeeklyMeals } from "@/lib/utils"

interface ThisWeekMealsProps {
  meals: WeeklyMeals;
  onSelectMeal: () => void;
  onCheckout?: (selectedMeals: Record<string, { selected: boolean, date: string }>) => void;
  isLoading?: boolean;
}

export function ThisWeekMeals({ meals, onSelectMeal, onCheckout, isLoading = false }: ThisWeekMealsProps) {
  const [activeDay, setActiveDay] = useState("monday")
  const [isAutoplay, setIsAutoplay] = useState(true)
  const [selectedMeals, setSelectedMeals] = useState<Record<string, { selected: boolean, date: string }>>({
    monday: { selected: false, date: '' },
    tuesday: { selected: false, date: '' },
    wednesday: { selected: false, date: '' },
    thursday: { selected: false, date: '' },
    friday: { selected: false, date: '' },
    saturday: { selected: false, date: '' },
    sunday: { selected: false, date: '' },
  });
  const [imagesLoaded, setImagesLoaded] = useState(false)
  const [today, setToday] = useState<string>("")
  const { toast } = useToast()
  const { t, language } = useLanguage()

  const days = useMemo(() => ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"], [])
  const dayLabels = useMemo((): Record<string, string> => {
    if (language === 'en') {
      return {
        monday: "Monday",
        tuesday: "Tuesday",
        wednesday: "Wednesday",
        thursday: "Thursday",
        friday: "Friday",
        saturday: "Saturday",
        sunday: "Sunday",
      };
    } else {
      return {
        monday: "星期一",
        tuesday: "星期二",
        wednesday: "星期三",
        thursday: "星期四",
        friday: "星期五",
        saturday: "星期六",
        sunday: "星期日",
      };
    }
  }, [language]);

  // Filter to get only days that have active meals
  const activeDays = useMemo(() => {
    const filtered = days.filter(day => meals[day]);
    console.log('[ThisWeekMeals] Active days filtered:', {
      original: days,
      filtered,
      mealKeys: Object.keys(meals)
    });
    return filtered;
  }, [days, meals]);

  // Check if a day is in the past or today after ordering cutoff time
  const isDayUnavailable = (day: string): { unavailable: boolean, reason: string } => {
    try {
      // Get current date and time in Toronto timezone
      const torontoOptions = { timeZone: 'America/Toronto' };
      const now = new Date();
      
      // Format the Toronto time as a string to work with
      const torontoDateString = now.toLocaleString('en-US', torontoOptions);
      const torontoDate = new Date(torontoDateString);
      
      // Get today's day of the week
      const todayIndex = torontoDate.getDay(); // 0 = Sunday, 1 = Monday, ...
      const daysOfWeek = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
      const today = daysOfWeek[todayIndex];
      
      // Get the current hour in Toronto
      const currentHour = torontoDate.getHours();
      
      // Check if we have a date for this meal
      const mealDate = meals[day]?.date;

      // Convert day string to index (0-6)
      const dayIndex = daysOfWeek.indexOf(day.toLowerCase());
      
      // Debug logging to understand what's happening
      console.log(`Day comparison for ${day}:`, {
        day,
        dayIndex,
        today,
        todayIndex,
        currentHour,
        mealDate
      });
      
      // If we have a specific date string, parse it for additional validation
      if (mealDate) {
        try {
          // Parse the date (expected format like "April 1" or "April 10")
          const parts = mealDate.split(' ');
          
          // Handle formats like "April 1" or "April 10"
          if (parts.length === 2) {
            const monthStr = parts[0];
            const dayStr = parts[1];
            
            // Get month index (0-11)
            const months = ["January", "February", "March", "April", "May", "June", 
                             "July", "August", "September", "October", "November", "December"];
            const monthIndex = months.findIndex(m => 
              monthStr.toLowerCase() === m.toLowerCase());
            
            // Parse day number (remove dot if present)
            const dayNum = parseInt(dayStr.replace(',', '').replace('.', ''));
            
            console.log(`Date parsing for ${mealDate}:`, {
              monthStr,
              monthIndex,
              dayStr,
              dayNum
            });
            
            if (monthIndex !== -1 && !isNaN(dayNum)) {
              // Create a date for the meal's specific date (use current year)
              const mealSpecificDate = new Date(
                torontoDate.getFullYear(), 
                monthIndex, 
                dayNum
              );
              
              // Compare with today's date
              const todayYMD = new Date(
                torontoDate.getFullYear(), 
                torontoDate.getMonth(), 
                torontoDate.getDate()
              );
              
              console.log(`Date comparison:`, {
                mealSpecificDate: mealSpecificDate.toDateString(),
                todayYMD: todayYMD.toDateString(),
                isBeforeToday: mealSpecificDate < todayYMD,
                isToday: mealSpecificDate.getTime() === todayYMD.getTime()
              });
              
              // If meal date is before today
              if (mealSpecificDate < todayYMD) {
                return { 
                  unavailable: true, 
                  reason: "This specific date has already passed" 
                };
              }
              
              // If it's today and after 10am
              if (mealSpecificDate.getTime() === todayYMD.getTime() && currentHour >= 10) {
                return { 
                  unavailable: true, 
                  reason: "Orders for today must be placed before 10am Toronto time" 
                };
              }
              
              // If we have a specific date and it's valid, return available
              return { unavailable: false, reason: "" };
            }
          }
        } catch (error) {
          console.error('Error parsing meal date:', error);
        }
      } else {
        // Only proceed with day comparison if we have valid indices and no specific date
        if (dayIndex !== -1 && todayIndex !== -1) {
          // Correct logic for day comparison accounting for week wraparound
          // Assume all days are for the current week
          // If today is Saturday (6) or Sunday (0), then Monday (1) through Friday (5) 
          // are for next week and shouldn't be marked as "passed"
          
          if (todayIndex === 6) { // Saturday
            // No days should be unavailable, as we're at the end of the week
            // and all meals shown are for the next week
          } else if (todayIndex === 0) { // Sunday
            // Only Sunday can be unavailable
            if (dayIndex === 0 && currentHour >= 10) {
              return {
                unavailable: true,
                reason: "Orders for today must be placed before 10am Toronto time"
              };
            }
          } else {
            // For other days, only days before today are unavailable
            if (dayIndex < todayIndex) {
              return { 
                unavailable: true, 
                reason: "This day has already passed" 
              };
            }
            
            // Check if it's today and after 10am
            if (dayIndex === todayIndex && currentHour >= 10) {
              return { 
                unavailable: true, 
                reason: "Orders for today must be placed before 10am Toronto time" 
              };
            }
          }
        } else {
          console.log(`Invalid day index for ${day}: ${dayIndex}`);
        }
      }
      
      // If we get here, the day is available
      return { unavailable: false, reason: "" };
    } catch (error) {
      console.error('Error in isDayUnavailable:', error);
      return { unavailable: false, reason: "" }; // Default to available on error
    }
  };

  // Preload all meal images to prevent loading delay when switching tabs
  useEffect(() => {
    // Check if meals object is populated first
    if (!meals || Object.keys(meals).length === 0) {
      console.log('[ThisWeekMeals] No meals available to load');
      setImagesLoaded(false);
      return;
    }
    
    console.log('[ThisWeekMeals] Loading meals:', {
      count: Object.keys(meals).length,
      days: Object.keys(meals)
    });
    
    let loadedCount = 0;
    const totalImagesToLoad = Object.keys(meals).length;
    
    // If no meals, set images as loaded
    if (totalImagesToLoad === 0) {
      setImagesLoaded(true);
      return;
    }
    
    Object.keys(meals).forEach(day => {
      if (meals[day]?.image) {
        const img = new Image();
        img.onload = () => {
          loadedCount++;
          if (loadedCount === totalImagesToLoad) {
            setImagesLoaded(true);
          }
        };
        img.onerror = () => {
          // Count failed loads too
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
  }, [meals]);

  // Only set active day if meals exist
  useEffect(() => {
    if (meals && Object.keys(meals).length > 0) {
      // Find first available day that has meal data
      const availableDays = activeDays;
      if (availableDays.length > 0 && !meals[activeDay]) {
        setActiveDay(availableDays[0]);
      }
    }
  }, [meals, activeDays, activeDay]);

  // Auto-rotate through days
  useEffect(() => {
    if (!isAutoplay) return

    const interval = setInterval(() => {
      const currentIndex = activeDays.indexOf(activeDay)
      const nextIndex = (currentIndex + 1) % activeDays.length
      setActiveDay(activeDays[nextIndex])
    }, 5000)

    return () => clearInterval(interval)
  }, [activeDay, isAutoplay, activeDays])

  // Pause autoplay when user interacts
  const handleDayChange = (day: string) => {
    setActiveDay(day)
    setIsAutoplay(false)
  }

  const handleNextDay = () => {
    const currentIndex = activeDays.indexOf(activeDay)
    const nextIndex = (currentIndex + 1) % activeDays.length
    setActiveDay(activeDays[nextIndex])
    setIsAutoplay(false)
  }

  const handlePrevDay = () => {
    const currentIndex = activeDays.indexOf(activeDay)
    const nextIndex = (currentIndex - 1 + activeDays.length) % activeDays.length
    setActiveDay(activeDays[nextIndex])
    setIsAutoplay(false)
  }

  // Load selected meals from localStorage
  useEffect(() => {
    const savedSelections = localStorage.getItem('selectedMeals');
    if (savedSelections) {
      try {
        const parsedSelections = JSON.parse(savedSelections);
        // Handle both old and new structure
        if (typeof parsedSelections.monday === 'boolean') {
          // Convert old structure to new structure
          const newStructure: Record<string, { selected: boolean, date: string }> = {};
          Object.keys(parsedSelections).forEach(day => {
            newStructure[day] = { 
              selected: !!parsedSelections[day], 
              date: meals[day]?.date || '' 
            };
          });
          setSelectedMeals({
            ...selectedMeals,
            ...newStructure
          });
        } else {
          // New structure with dates
          setSelectedMeals({
            ...selectedMeals,
            ...parsedSelections
          });
        }
      } catch (error) {
        console.error('Error parsing saved meal selections:', error);
      }
    }
  }, [meals]);

  const handleSelectMeal = (day: string) => {
    // Check if the day is unavailable before selecting
    const { unavailable, reason } = isDayUnavailable(day);
    
    if (unavailable) {
      toast({
        title: language === 'en' ? "Cannot select this meal" : "无法选择此餐点",
        description: isDayUnavailable(activeDay).reason === "This day has already passed" ? 
          (language === 'en' ? "This day has already passed" : "此日期已过") : 
          (language === 'en' ? "Orders for today must be placed before 10am Toronto time" : "今日订单必须在多伦多时间上午10点前下单"),
        variant: "destructive"
      });
      return;
    }
    
    // Get date information from the meals object
    const dateValue = meals[day]?.date || '';
    
    // Update selected meals
    const updatedSelections = {
      ...selectedMeals,
      [day]: { 
        selected: !selectedMeals[day]?.selected, 
        date: dateValue
      }
    };
    
    // Save to localStorage
    localStorage.setItem('selectedMeals', JSON.stringify(updatedSelections));
    
    // Update state
    setSelectedMeals(updatedSelections);
    
    // If the meal was just selected (not deselected), move to the next day
    if (!selectedMeals[day]?.selected) {
      // Find the next available day
      const currentIndex = activeDays.indexOf(day);
      const nextIndex = (currentIndex + 1) % activeDays.length;
      
      // Use a short timeout to allow the selection to be visually registered first
      setTimeout(() => {
        setActiveDay(activeDays[nextIndex]);
      }, 300);
    }
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
            <CardTitle className="text-xl sm:text-2xl font-bold">{t('weeklyMenu')}</CardTitle>
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
          {activeDays.map((day) => (
            <Button
              key={day}
              variant={activeDay === day ? "default" : "ghost"}
              className={`flex-shrink-0 rounded-full text-xs sm:text-sm px-2 sm:px-3 h-8 ${activeDay === day ? "" : "opacity-70"}`}
              onClick={() => handleDayChange(day)}
            >
              <div className="flex flex-col items-center">
                <span>{dayLabels[day].substring(0, 3)}</span>
              </div>
            </Button>
          ))}
        </div>
      </div>

      <CardContent className="p-4 sm:p-6 pt-4">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={activeDay}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col md:grid md:grid-cols-2 gap-4 md:gap-6"
          >
            {!isLoading && activeMeal ? (
              <>
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
                </motion.div>

                <motion.div 
                  className="flex flex-col justify-between mt-2 md:mt-0"
                  transition={{ duration: 0.2, staggerChildren: 0.05 }}
                >
                  <div className="space-y-3 md:space-y-4">
                    <motion.div 
                      className="space-y-2"
                      initial={{ y: 5 }}
                      animate={{ y: 0 }}
                      transition={{ duration: 0.3, delay: 0.1 }}
                    >
                      {activeMeal.description?.split('. ')
                        .filter(Boolean)
                        .map((sentence, index) => (
                          <div key={index} className="flex items-start gap-3">
                            <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                            <p className="text-base md:text-lg">{sentence.replace(/\.$/, '').trim()}</p>
                          </div>
                        ))}
                    </motion.div>

                    <motion.div
                      initial={{ y: 5 }}
                      animate={{ y: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <div className="flex items-center text-muted-foreground">
                        <span className="capitalize">{activeDay}</span>
                        {activeMeal.date && (
                          <span className="text-muted-foreground ml-2">
                            {activeMeal.date}
                          </span>
                        )}
                      </div>
                      
                      {isDayUnavailable(activeDay).unavailable && (
                        <div className="mt-2 text-sm text-muted-foreground">
                          <strong>{language === 'en' ? 'Note:' : '注意：'}</strong> {isDayUnavailable(activeDay).reason === "This day has already passed" ? 
                            (language === 'en' ? "This day has already passed" : "此日期已过") : 
                            (language === 'en' ? "Orders for today must be placed before 10am Toronto time" : "今日订单必须在多伦多时间上午10点前下单")}
                        </div>
                      )}
                    </motion.div>
                  </div>

                  <div className="flex items-center gap-2 md:gap-3 mt-4 md:mt-6">
                    <Button
                      className="flex-1 px-2 md:px-4"
                      onClick={() => handleSelectMeal(activeDay)}
                      variant={selectedMeals[activeDay]?.selected ? "outline" : "default"}
                      size="sm"
                      md-size="default"
                      disabled={isDayUnavailable(activeDay).unavailable}
                    >
                      {selectedMeals[activeDay]?.selected ? (
                        <>
                          <Check className="mr-1 md:mr-2 h-4 w-4" />
                          {language === 'en' ? 'Selected' : '已选择'}
                        </>
                      ) : isDayUnavailable(activeDay).unavailable ? (
                        <>
                          {language === 'en' ? "Can't order" : '无法订购'}
                        </>
                      ) : (
                        <>
                          <Plus className="mr-1 md:mr-2 h-4 w-4" />
                          {language === 'en' ? 'Select This Meal' : '选择此餐点'}
                        </>
                      )}
                    </Button>
                    <Button variant="outline" onClick={handleViewAll} size="sm" md-size="default" className="px-2 md:px-4">
                      {language === 'en' ? 'View All Meals' : '查看所有餐点'}
                    </Button>
                  </div>
                </motion.div>
              </>
            ) : (
              <div className="col-span-2 flex justify-center items-center h-[400px]">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                  <p>{language === 'en' ? 'Loading meal information...' : '正在加载餐点信息...'}</p>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </CardContent>

      <CardFooter className="bg-muted/30 px-4 sm:px-6 py-3 sm:py-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between w-full gap-3">
          <div className="flex -space-x-2">
            {activeDays.map((day, index) => (
              meals[day] && (
                <motion.div
                  key={day}
                  className={`w-10 h-10 rounded-full border-2 border-background ${
                    activeDay === day ? "ring-2 ring-primary" : ""
                  } overflow-hidden cursor-pointer relative`}
                  whileHover={{ scale: 1.1, zIndex: 10 }}
                  onClick={() => handleDayChange(day)}
                  style={{ zIndex: activeDays.length - index }}
                >
                  <img 
                    src={meals[day]?.image || "/placeholder.svg"} 
                    alt={day} 
                    className="w-full h-full object-cover" 
                    loading="eager"
                  />
                </motion.div>
              )
            ))}
          </div>
          <div className="sm:flex sm:items-center sm:gap-3">
            <div className="text-sm text-muted-foreground mb-2 sm:mb-0">
              {(() => {
                const mealCount = Object.keys(selectedMeals).filter((day) => selectedMeals[day].selected).length;
                return language === 'en' 
                  ? `${mealCount} meal${mealCount !== 1 ? 's' : ''} selected`
                  : `已选择 ${mealCount} 个餐点`;
              })()}
            </div>
            <Button 
              onClick={() => onCheckout && onCheckout(selectedMeals)} 
              disabled={!Object.values(selectedMeals).some(m => m.selected)}
              className="w-full sm:w-auto sm:ml-auto"
            >
              {language === 'en' ? 'Checkout' : '结账'}
            </Button>
          </div>
        </div>
      </CardFooter>
    </Card>
  )
}

