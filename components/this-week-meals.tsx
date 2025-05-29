"use client"

import { useState, useEffect, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ChevronLeft, ChevronRight, Check, Plus, Calendar, Gem, Leaf, Shield, Zap, Heart, Flame, Apple, ChefHat, Sparkles, Clock, CalendarDays } from "lucide-react"

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
      
      // Get the current hour in Toronto
      const currentHour = torontoDate.getHours();
      
      // Check if we have a date for this meal
      const mealDate = meals[day]?.date;

      // If no specific date is provided, mark as unavailable
      if (!mealDate) {
        return { 
          unavailable: true, 
          reason: "Date not available for this meal" 
        };
      }
      
      // Debug logging for day and date info
      console.log(`Day comparison for ${day}:`, {
        day,
        currentHour,
        mealDate
      });

      // Parse the date (expected format like "April 1" or "April 10")
      try {
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
          
          // Parse day number (remove dot or comma if present)
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
            
            // If we have a valid date and it's in the future or today before 10am, it's available
            return { unavailable: false, reason: "" };
          }
        }
        
        // If we couldn't parse the date properly
        return { 
          unavailable: true, 
          reason: "Invalid date format" 
        };
      } catch (error) {
        console.error('Error parsing meal date:', error);
        return { 
          unavailable: true, 
          reason: "Error parsing date" 
        };
      }
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

  // Helper function to get accent colors based on index
  const getAccentColors = (index: number) => {
    const accentType = index % 2 === 0 ? 'brown1' : 'brown2';
    return {
      brown1: { 
        bg: "bg-[#F5EFE7]", 
        border: "border-[#D8C4B6]/20", 
        text: "text-[#4F4A45]", 
        dot: "bg-[#4F4A45]",
        gradient: "from-[#D8C4B6] to-[#F5EFE7]",
        cardColor: "from-[#F5EFE7]/70 to-[#F8F6F4]/90"
      },
      brown2: { 
        bg: "bg-[#D8C4B6]/20", 
        border: "border-[#4F4A45]/10", 
        text: "text-[#4F4A45]", 
        dot: "bg-[#4F4A45]",
        gradient: "from-[#F5EFE7] to-[#D8C4B6]",
        cardColor: "from-[#F8F6F4]/90 to-[#F5EFE7]/70"
      }
    }[accentType];
  };

  // Helper function to match tag names to icons
  const getIconForTag = (tag: string): string => {
    const iconMap: Record<string, string> = {
      'High Protein': 'Zap',
      'Omega-3': 'Heart',
      'Gluten-Free': 'Shield',
      'Quick': 'Flame',
      'Family Favorite': 'Heart',
      'Comfort Food': 'Heart',
      'Italian': 'ChefHat',
      'Creamy': 'Sparkles',
      'Vegetarian': 'Leaf',
      'Spicy': 'Flame',
      'Indian': 'ChefHat',
      'Healthy': 'Heart',
      'Seafood': 'Shield',
      'Mexican': 'ChefHat',
      'Fresh': 'Leaf'
    };
    
    return iconMap[tag] || 'Sparkles';
  };

  // Helper function to render icon components
  const TagIcon = ({ type, className }: { type: string; className?: string }) => {
    const icons = {
      Sparkles: <motion.div whileHover={{ rotate: 15 }}><Sparkles className={className} /></motion.div>,
      Leaf: <motion.div whileHover={{ rotate: 15 }}><Leaf className={className} /></motion.div>,
      Shield: <motion.div whileHover={{ rotate: 15 }}><Shield className={className} /></motion.div>,
      Zap: <motion.div whileHover={{ rotate: 15 }}><Zap className={className} /></motion.div>,
      Heart: <motion.div whileHover={{ scale: 1.2 }}><Heart className={className} /></motion.div>,
      Flame: <motion.div whileHover={{ y: -2 }}><Flame className={className} /></motion.div>,
      Apple: <motion.div whileHover={{ rotate: 15 }}><Apple className={className} /></motion.div>,
      ChefHat: <motion.div whileHover={{ y: -2 }}><ChefHat className={className} /></motion.div>
    };
    
    return icons[type as keyof typeof icons] || <Sparkles className={className} />;
  };

  return (
    <div className="space-y-6 w-full">
      {/* Enhanced Header with Weekly Calendar UI */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-primary/20 to-primary/10 p-2.5 rounded-full shadow-sm">
            <CalendarDays className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">{t('weeklyMenu')}</h2>
            <p className="text-sm text-muted-foreground hidden sm:block">
              {language === 'en' ? "Select your meals for the week" : "选择您本周的餐点"}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button 
            onClick={() => onCheckout && onCheckout(selectedMeals)} 
            disabled={!Object.values(selectedMeals).some(m => m.selected)}
            size="sm"
            className="rounded-full bg-gradient-to-r from-primary/90 to-primary hover:from-primary hover:to-primary/90 shadow-sm gap-1.5 transition-all duration-300 pr-2.5 pl-4"
          >
            <span>{language === 'en' ? 'Checkout' : '结账'}</span>
            <span className="bg-white/20 flex items-center gap-1 py-0.5 px-2 rounded-full text-xs ml-1">
              <Gem className="h-3 w-3" />
              <span className="font-medium">{Object.values(selectedMeals).filter(m => m.selected).length}</span>
            </span>
          </Button>
        </div>
      </div>

      {/* Enhanced Calendar Day Selector */}
      <div className="relative mt-2">
        <motion.div 
          className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-2 z-10"
          whileHover={{ scale: 1.1, x: -10 }}
          whileTap={{ scale: 0.95 }}
        >
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={handlePrevDay} 
            className="h-8 w-8 rounded-full bg-background/80 shadow-sm hover:shadow-md transition-shadow"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </motion.div>
        
        <div className="overflow-hidden mx-6">
          <motion.div 
            className="flex justify-between items-center"
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.1}
            onDragEnd={(e, { offset, velocity }) => {
              const swipe = Math.abs(offset.x) * velocity.x;
              if (swipe < -50) {
                handleNextDay();
              } else if (swipe > 50) {
                handlePrevDay();
              }
            }}
          >
            {activeDays.map((day, idx) => {
              const isActive = activeDay === day;
              const dayDate = meals[day]?.date || '';
              const { unavailable } = isDayUnavailable(day);
              const isSelected = selectedMeals[day]?.selected;
              
              return (
                <motion.div 
                  key={day}
                  className={`
                    relative cursor-pointer select-none mx-1
                    ${isActive ? "z-10" : "z-0"}
                  `}
                  onClick={() => handleDayChange(day)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ type: "spring", stiffness: 400, damping: 17 }}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <div className={`
                    flex flex-col items-center justify-center 
                    w-14 h-18 rounded-lg transition-all duration-300
                    ${isActive 
                      ? "bg-gradient-to-b from-primary to-primary/90 text-primary-foreground shadow-md shadow-primary/20" 
                      : unavailable 
                        ? "bg-muted/60 text-muted-foreground"
                        : isSelected
                          ? "bg-primary/10 text-primary border border-primary/30"
                          : "bg-card hover:bg-accent text-card-foreground border border-border/50 hover:border-border"
                    }
                    ${unavailable ? "opacity-60" : "opacity-100"}
                  `}>
                    <span className="text-xs font-medium uppercase mt-2">
                      {dayLabels[day].substring(0, 3)}
                    </span>
                    <span className={`
                      text-lg font-bold my-1
                      ${isActive ? "text-primary-foreground" : ""}
                    `}>
                      {dayDate ? dayDate.split(' ')[1].replace(',', '') : idx + 1}
                    </span>
                    
                    {isSelected && (
                      <div className={`
                        h-1.5 w-8 rounded-full mb-1.5
                        ${isActive ? "bg-white/60" : "bg-primary/60"}
                      `} />
                    )}
                    {!isSelected && <div className="h-1.5 mb-1.5" />}
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
        
        <motion.div 
          className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-2 z-10"
          whileHover={{ scale: 1.1, x: 10 }}
          whileTap={{ scale: 0.95 }}
        >
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={handleNextDay} 
            className="h-8 w-8 rounded-full bg-background/80 shadow-sm hover:shadow-md transition-shadow"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </motion.div>
      </div>

      {/* Enhanced Content Area */}
      <AnimatePresence mode="wait">
        {!isLoading && meals[activeDay] ? (
          <motion.div
            key={activeDay}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25 }}
            className="w-full"
          >
            {(() => {
              const meal = meals[activeDay];
              const isSelected = selectedMeals[activeDay]?.selected;
              const { unavailable, reason } = isDayUnavailable(activeDay);
              
              // Parse description to create meal items
              const mealItems = meal?.description 
                ? meal.description.split('. ').filter(Boolean).map(item => ({
                    name: item.replace(/\.$/, '').trim()
                  }))
                : [
                    { name: "Fresh ingredients prepared daily" },
                    { name: "Nutritious balanced meal" },
                    { name: "Eco-friendly packaging" },
                    { name: "Professionally prepared" }
                  ];
              
              // Use meal calories from database or default
              const totalCalories = meal?.calories || 500; 
              
              // Generate tags based on meal properties or defaults
              const tags = meal?.tags?.map(tag => ({
                name: tag,
                icon: getIconForTag(tag)
              })) || [
                { name: "Balanced Meal", icon: "Sparkles" },
                { name: "Fresh Ingredients", icon: "Leaf" }
              ];

              return (
                <div className="space-y-5">
                  {/* Meal Header with Date */}
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <h3 className="text-lg font-medium capitalize flex items-center gap-2">
                        {activeDay}
                        {isSelected && (
                          <motion.span 
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="bg-primary/10 text-primary text-xs font-semibold px-2 py-0.5 rounded-full flex items-center gap-1"
                          >
                            <Check className="h-3 w-3" />
                            <span>{language === 'en' ? "Selected" : "已选择"}</span>
                          </motion.span>
                        )}
                      </h3>
                      {meal?.date && (
                        <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-1">
                          <Calendar className="h-3.5 w-3.5" />
                          <span>{meal.date}</span>
                        </p>
                      )}
                    </div>
                    
                    {unavailable && (
                      <Badge variant="outline" className="text-destructive border-destructive/30 bg-destructive/5 gap-1.5 px-3 py-1">
                        <Clock className="h-3.5 w-3.5" />
                        <span>{language === 'en' ? "Unavailable" : "不可用"}</span>
                      </Badge>
                    )}
                  </div>
                  
                  {/* Main Content Card */}
                  <motion.div 
                    className={`
                      relative overflow-hidden rounded-xl border
                      transition-all duration-300 ease-out group
                      ${unavailable ? "opacity-90" : "opacity-100"}
                      ${isSelected 
                        ? "bg-primary/5 border-primary/20 shadow-lg shadow-primary/5" 
                        : "bg-card border-border/50 hover:border-border hover:shadow-md"
                      }
                    `}
                    whileHover={{ y: -2 }}
                    transition={{ type: "spring", stiffness: 400, damping: 17 }}
                  >
                    {/* Top Accent Line */}
                    <div className={`h-1 w-full ${isSelected ? "bg-primary" : "bg-gradient-to-r from-transparent via-border to-transparent"}`}></div>
                    
                    {/* Meal Content */}
                    <div className="p-5">
                      {/* Meal Items */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
                        {mealItems.map((item, index) => (
                          <motion.div
                            key={index}
                            initial={{ opacity: 0, x: -5 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.1, duration: 0.2 }}
                            className="flex items-start gap-2.5 group/item"
                            whileHover={{ x: 3 }}
                          >
                            <div className={`
                              w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5
                              ${isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}
                              group-hover/item:scale-110 transition-transform duration-200
                            `}>
                              <span className="text-xs font-medium">{index + 1}</span>
                            </div>
                            <p className="text-sm leading-tight">{item.name}</p>
                          </motion.div>
                        ))}
                      </div>
                      
                      {/* Info Badges Row */}
                      <div className="flex flex-wrap gap-2 justify-between items-center mb-5 border-t border-border/50 pt-4">
                        <div className="flex items-center gap-2 flex-wrap">
                          {/* Tags */}
                          {tags.slice(0, 3).map((tag, index) => (
                            <motion.div
                              key={index}
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.98 }}
                            >
                              <Badge 
                                variant="secondary" 
                                className="rounded-md gap-1 h-7 border border-border/50 hover:border-primary/20 transition-colors"
                              >
                                <TagIcon type={tag.icon} className="h-3.5 w-3.5 text-primary" />
                                <span>{tag.name}</span>
                              </Badge>
                            </motion.div>
                          ))}
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {/* Calorie Badge */}
                          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.98 }}>
                            <div className="bg-orange-500/10 text-orange-600 px-2.5 py-1 rounded-md text-xs font-medium flex items-center gap-1.5 border border-orange-200/20">
                              <Flame className="h-3.5 w-3.5" />
                              <span>{totalCalories} kcal</span>
                            </div>
                          </motion.div>
                          
                          {/* Credit Badge */}
                          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.98 }}>
                            <div className="bg-primary/10 text-primary px-2.5 py-1 rounded-md text-xs font-medium flex items-center gap-1.5 border border-primary/20">
                              <Gem className="h-3.5 w-3.5" />
                              <span>1 {t('credits')}</span>
                            </div>
                          </motion.div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Action Footer */}
                    <div className={`
                      border-t p-4 flex justify-between items-center
                      ${isSelected ? "bg-primary/10 border-primary/20" : "bg-muted/20 border-border/50"}
                      transition-colors duration-300
                    `}>
                      <div className="text-sm">
                        {isSelected ? (
                          <motion.span 
                            className="flex items-center gap-1.5 text-primary font-medium"
                            initial={{ opacity: 0, x: -5 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.2 }}
                          >
                            <Check className="h-4 w-4" />
                            {language === 'en' ? "Selected for delivery" : "已选择配送"}
                          </motion.span>
                        ) : (
                          <span className="text-muted-foreground">
                            {language === 'en' ? "Nutritious, chef-prepared meal" : "营养丰富，厨师精心准备的餐点"}
                          </span>
                        )}
                      </div>
                      
                      <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.98 }}>
                        <Button
                          onClick={() => handleSelectMeal(activeDay)}
                          disabled={unavailable}
                          size="sm"
                          variant={isSelected ? "outline" : "default"}
                          className={`
                            gap-1.5 rounded-md
                            ${isSelected 
                              ? "border-primary text-primary hover:bg-primary/5" 
                              : "bg-primary hover:bg-primary/90"
                            }
                            transition-all duration-200
                          `}
                        >
                          {isSelected ? (
                            <>
                              <Check className="h-3.5 w-3.5" />
                              <span>{language === 'en' ? 'Selected' : '已选择'}</span>
                            </>
                          ) : unavailable ? (
                            <>{language === 'en' ? "Can't order" : '无法订购'}</>
                          ) : (
                            <>
                              <Plus className="h-3.5 w-3.5" />
                              <span>{language === 'en' ? 'Select This Meal' : '选择此餐点'}</span>
                            </>
                          )}
                        </Button>
                      </motion.div>
                    </div>
                    
                    {/* Unavailable Overlay */}
                    {unavailable && (
                      <>
                        <div className="absolute inset-0 bg-background/30 backdrop-blur-[1px] pointer-events-none"></div>
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          <motion.div 
                            className="bg-background/90 text-foreground text-sm font-medium rounded-lg px-4 py-2 text-center max-w-[85%] shadow-lg border border-border transform scale-95 group-hover:scale-100 transition-transform duration-300"
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ delay: 0.1 }}
                          >
                            {reason}
                          </motion.div>
                        </div>
                      </>
                    )}
                  </motion.div>
                </div>
              );
            })()}
          </motion.div>
        ) : (
          <div className="flex justify-center items-center h-[300px]">
            <div className="text-center">
              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                className="rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"
              />
              <p className="text-muted-foreground">
                {language === 'en' ? 'Loading meal information...' : '正在加载餐点信息...'}
              </p>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* Enhanced Footer Actions */}
      <div className="border-t pt-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <Badge 
            variant="outline" 
            className="gap-1.5 h-7 px-3 rounded-md bg-primary/5 border-primary/20"
          >
            <Calendar className="h-3.5 w-3.5 text-primary" />
            <span>
              {(() => {
                const mealCount = Object.keys(selectedMeals).filter((day) => selectedMeals[day].selected).length;
                return language === 'en' 
                  ? `${mealCount} meal${mealCount !== 1 ? 's' : ''} selected`
                  : `已选择 ${mealCount} 个餐点`;
              })()}
            </span>
          </Badge>
        </div>
        
        <motion.div 
          whileHover={{ scale: 1.02 }} 
          whileTap={{ scale: 0.98 }}
          className="w-full sm:w-auto"
        >
          <Button 
            variant="outline" 
            onClick={handleViewAll}
            className="sm:w-auto w-full rounded-md border-primary/30 hover:border-primary hover:bg-primary/5 text-sm gap-1.5 transition-all duration-200"
          >
            <CalendarDays className="h-4 w-4" />
            {language === 'en' ? 'View All Meals' : '查看所有餐点'}
          </Button>
        </motion.div>
      </div>
    </div>
  )
}

