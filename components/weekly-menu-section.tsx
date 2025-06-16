"use client"

import { useEffect, useRef, useState } from "react"
import { ChefHat, Sparkles, Leaf, Shield, Zap, Heart, Flame, Apple } from "lucide-react"
import { useLanguage } from "@/lib/language-context"

// Add interface definitions for better type safety
interface Meal {
  name: string;
  calories: number;
  hasIcon: boolean;
  description?: string;
}

interface Tag {
  name: string;
  icon: any;
}

interface DayMenu {
  day: string;
  dayZh: string;
  meals: Meal[];
  totalCalories: number;
  tags: Tag[];
  color: string;
  accent: string;
  gradient: string;
  date?: string;
}

export default function WeeklyMenuSection() {
  const [isVisible, setIsVisible] = useState(false)
  const [hoveredCard, setHoveredCard] = useState<number | null>(null)
  const sectionRef = useRef<HTMLDivElement>(null)
  const { t, language } = useLanguage();

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
        }
      },
      { threshold: 0.1 },
    )

    if (sectionRef.current) {
      observer.observe(sectionRef.current)
    }

    return () => observer.disconnect()
  }, [])

  const menuData = [
    {
      day: language === 'en' ? "Mon" : "Mon",
      dayZh: t('monday'),
      date: "June 16",
      meals: [
        { name: "番茄炖虾滑魔芋丝", calories: 128, hasIcon: true, description: "" },
        { name: "手撕鸡", calories: 175, hasIcon: true, description: "" },
        { name: "孜然烤菜花", calories: 95, hasIcon: true, description: "" },
        { name: "补血紫米饭", calories: 117, hasIcon: true, description: "" },
      ],
      totalCalories: 515,
      tags: [
        { name: "清爽营养", icon: Shield },
        { name: "低热量高饱腹", icon: Leaf },
      ],
      color: "from-[#FBF7F2] to-[#F5EDE4]",
      accent: "brown1",
      gradient: "from-[#C2884E] to-[#D1A46C]",
    },
    {
      day: language === 'en' ? "Tue" : "Tue",
      dayZh: t('tuesday'),
      date: "June 17",
      meals: [
        { name: "意式肉酱", calories: 180, hasIcon: true, description: "" },
        { name: "三彩豆炒虾仁", calories: 125, hasIcon: true, description: "" },
        { name: "香烤芦笋", calories: 78, hasIcon: true, description: "" },
        { name: "意大利面", calories: 155, hasIcon: true, description: "" },
      ],
      totalCalories: 538,
      tags: [
        { name: "护心养颜", icon: Heart },
        { name: "排毒清肠", icon: Zap },
      ],
      color: "from-[#F5EDE4] to-[#FBF7F2]",
      accent: "brown2",
      gradient: "from-[#D1A46C] to-[#C2884E]",
    },
    {
      day: language === 'en' ? "Wed" : "Wed",
      dayZh: t('wednesday'),
      date: "June 18",
      meals: [
        { name: "彩椒香菇鸡煲", calories: 168, hasIcon: true, description: "" },
        { name: "韩式什锦粉丝", calories: 148, hasIcon: true, description: "" },
        { name: "酸辣娃娃菜", calories: 87, hasIcon: true, description: "" },
        { name: "补血紫米饭 + 玉米粒", calories: 137, hasIcon: true, description: "" },
      ],
      totalCalories: 540,
      tags: [
        { name: "补气补血", icon: Shield },
        { name: "亚洲风味", icon: Flame },
      ],
      color: "from-[#FBF7F2] to-[#F5EDE4]",
      accent: "brown1",
      gradient: "from-[#C2884E] to-[#D1A46C]",
    },
    {
      day: language === 'en' ? "Thu" : "Thu",
      dayZh: t('thursday'),
      date: "June 19",
      meals: [
        { name: "番茄鲜虾咖喱", calories: 178, hasIcon: true, description: "" },
        { name: "蘑菇炒蛋", calories: 105, hasIcon: true, description: "" },
        { name: "蒜蓉奶白菜", calories: 85, hasIcon: true, description: "" },
        { name: "补血紫米饭 + 烤红薯", calories: 137, hasIcon: true, description: "" },
      ],
      totalCalories: 505,
      tags: [
        { name: "优质蛋白组合", icon: Zap },
        { name: "膳食纤维", icon: Leaf },
      ],
      color: "from-[#F5EDE4] to-[#FBF7F2]",
      accent: "brown2",
      gradient: "from-[#D1A46C] to-[#C2884E]",
    },
    {
      day: language === 'en' ? "Fri" : "Fri",
      dayZh: t('friday'),
      date: "June 20",
      meals: [
        { name: "风味烤鱼锅（辣）", calories: 215, hasIcon: true, description: "" },
        { name: "虾皮冬瓜", calories: 95, hasIcon: true, description: "" },
        { name: "西兰花炒蘑菇", calories: 102, hasIcon: true, description: "" },
        { name: "补血紫米饭", calories: 117, hasIcon: true, description: "" },
      ],
      totalCalories: 529,
      tags: [
        { name: "天然钙质", icon: Shield },
        { name: "利水消肿", icon: Heart },
      ],
      color: "from-[#FBF7F2] to-[#F5EDE4]",
      accent: "brown1",
      gradient: "from-[#C2884E] to-[#D1A46C]",
    },
    {
      day: language === 'en' ? "Sun" : "Sun",
      dayZh: "周日",
      date: "June 22",
      meals: [
        { name: "番茄牛肉锅", calories: 172, hasIcon: true, description: "" },
        { name: "烤鸡腿肉", calories: 152, hasIcon: true, description: "" },
        { name: "意式烤时令时蔬", calories: 105, hasIcon: true, description: "" },
        { name: "补血紫米饭 + 烤南瓜", calories: 128, hasIcon: true, description: "" },
      ],
      totalCalories: 557,
      tags: [
        { name: "低脂高蛋白", icon: Shield },
        { name: "抗氧化", icon: Leaf },
      ],
      color: "from-[#FBF7F2] to-[#F5EDE4]",
      accent: "brown1",
      gradient: "from-[#C2884E] to-[#D1A46C]",
    }
  ]

  const getAccentColors = (accent: string) => {
    const colors = {
      brown1: { 
        bg: "bg-[#C2884E]/10", 
        border: "border-[#C2884E]/20", 
        text: "text-[#C2884E]", 
        dot: "bg-[#C2884E]" 
      },
      brown2: { 
        bg: "bg-[#D1A46C]/10", 
        border: "border-[#D1A46C]/20", 
        text: "text-[#D1A46C]", 
        dot: "bg-[#D1A46C]" 
      }
    }
    return colors[accent as keyof typeof colors] || colors.brown1
  }

  return (
    <section ref={sectionRef} className="py-32 px-4 bg-gradient-to-b from-white to-[#FBF7F2] relative overflow-hidden">
      {/* Enhanced Background Pattern */}
      <div className="absolute inset-0">
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, #C2884E 1px, transparent 0)`,
            backgroundSize: "24px 24px",
          }}
        ></div>
        <div className="absolute top-0 left-0 right-0 h-64 bg-gradient-to-b from-[#FBF7F2]/50 to-transparent opacity-50"></div>
        <div className="absolute bottom-0 left-0 right-0 h-64 bg-gradient-to-t from-[#FBF7F2]/50 to-transparent opacity-50"></div>
      </div>

      {/* Decorative Elements */}
      <div className="absolute top-20 left-10 w-64 h-64 bg-[#C2884E]/5 rounded-full blur-3xl"></div>
      <div className="absolute bottom-20 right-10 w-80 h-80 bg-[#D1A46C]/5 rounded-full blur-3xl"></div>

      <div className="max-w-7xl mx-auto relative">
        {/* Header */}
        <div className="text-center mb-20">
          <div
            className={`transition-all duration-1200 ease-out ${
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12"
            }`}
          >
            <div className="inline-flex items-center justify-center mb-4">
              <div className="h-px w-10 bg-gradient-to-r from-transparent to-[#C2884E]/40 rounded-full"></div>
              <div className="px-4 py-1 mx-3 bg-[#C2884E]/5 rounded-full">
                <span className="text-sm font-medium text-[#C2884E]">{t('weeklyMenuTag')}</span>
              </div>
              <div className="h-px w-10 bg-gradient-to-l from-transparent to-[#C2884E]/40 rounded-full"></div>
            </div>
            
            <h2 className="text-4xl md:text-5xl font-light mb-6 tracking-tight">
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#C2884E] to-[#D1A46C]">
                {t('weeklyMenuTitle')}
              </span>
            </h2>
            <div className="flex items-center justify-center gap-2 mt-3 mb-2">
              <div className="h-px w-5 bg-gradient-to-r from-transparent to-[#C2884E]/40 rounded-full"></div>
              <span className="text-sm text-[#6B5F53]/70 font-light">{t('weeklyMenuWeekDates')}</span>
              <div className="h-px w-5 bg-gradient-to-l from-transparent to-[#C2884E]/40 rounded-full"></div>
            </div>
            <div className="w-16 h-0.5 bg-gradient-to-r from-[#C2884E]/20 to-[#D1A46C]/60 mx-auto"></div>
          </div>
        </div>

        {/* Menu Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {menuData.length === 5 ? (
            <>
              {/* First row: 3 cards */}
              {menuData.slice(0, 3).map((dayMenu, index) => {
                const accentColors = getAccentColors(dayMenu.accent)
                const isHovered = hoveredCard === index
                
                return (
                  <div
                    key={dayMenu.day}
                    className={`group transition-all duration-1000 ease-out ${
                      isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-16"
                    }`}
                    style={{ transitionDelay: isVisible ? `${index * 150}ms` : "0ms" }}
                    onMouseEnter={() => setHoveredCard(index)}
                    onMouseLeave={() => setHoveredCard(null)}
                  >
                    <div
                      className={`relative h-full transition-all duration-700 ease-out ${
                        isHovered ? "scale-105 -translate-y-4" : "scale-100 translate-y-0"
                      }`}
                    >
                      {/* Card content - same as before */}
                      <div
                        className={`
                        relative backdrop-blur-xl bg-gradient-to-br ${dayMenu.color} 
                        rounded-3xl p-8 border border-[#C2884E]/10 shadow-xl
                        transition-all duration-700 ease-out
                        ${isHovered ? "shadow-2xl shadow-[#C2884E]/10" : "shadow-lg shadow-[#C2884E]/5"}
                        before:absolute before:inset-0 before:rounded-3xl before:bg-white/40 before:opacity-0 before:transition-opacity before:duration-500
                        ${isHovered ? "before:opacity-100" : "before:opacity-0"}
                      `}
                      >
                        {/* Floating Day Header */}
                        <div className="text-center mb-8 relative">
                          <div
                            className={`inline-block transition-all duration-500 ${isHovered ? "scale-110" : "scale-100"}`}
                          >
                            <div className="flex flex-col items-center">
                              <h3 className="text-3xl font-extralight text-[#6B5F53] mb-0.5 tracking-wide">
                                {dayMenu.day}
                              </h3>
                              
                              <div className="flex items-center justify-center gap-1.5 mb-1">
                                <p className="text-xs text-[#6B5F53]/60 font-light tracking-wider uppercase">{dayMenu.dayZh}</p>
                                {dayMenu.date && (
                                  <>
                                    <span className="inline-block w-0.5 h-0.5 rounded-full bg-[#C2884E]/40"></span>
                                    <p className={`text-xs text-[#C2884E]/80 font-medium tracking-wide ${isHovered ? 'opacity-100' : 'opacity-70'}`}>
                                      {dayMenu.date}
                                    </p>
                                  </>
                                )}
                              </div>
                            </div>
                            
                            <div
                              className={`w-8 h-px ${accentColors.bg} mx-auto transition-all duration-500 ${
                                isHovered ? "w-12" : "w-8"
                              }`}
                            ></div>
                          </div>
                        </div>

                        {/* Meals List with Staggered Animation */}
                        <div className="space-y-4 mb-8">
                          {dayMenu.meals.map((meal, mealIndex) => (
                            <div
                              key={mealIndex}
                              className={`flex flex-col group/meal transition-all duration-500 ${
                                isHovered ? "translate-x-2" : "translate-x-0"
                              }`}
                              style={{ transitionDelay: isHovered ? `${mealIndex * 50}ms` : "0ms" }}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3 flex-1">
                                  <span className="text-sm text-[#6B5F53] leading-relaxed font-light">{meal.name}</span>
                                </div>
                                <span className="text-xs text-[#6B5F53]/60 font-medium ml-4 tabular-nums">
                                  {meal.calories}{t('totalCalories').toLowerCase()}
                                </span>
                              </div>
                              
                              {/* Meal description if available */}
                              {meal.description && (
                                <div 
                                  className={`
                                    mt-1 ml-3 mb-1 overflow-hidden max-h-0 opacity-0 
                                    transition-all duration-500 ease-in-out
                                    ${isHovered ? "max-h-20 opacity-100" : ""}
                                  `}
                                >
                                  <div className={`
                                    text-xs italic text-[#6B5F53]/70 
                                    border-l-2 ${accentColors.border}
                                    pl-2 py-0.5 mt-0.5
                                    relative
                                    after:absolute after:bottom-0 after:left-0 after:right-0 
                                    after:h-full after:bg-gradient-to-r after:from-[#C2884E]/5 after:to-transparent after:rounded-r-md
                                    after:-z-10
                                  `}>
                                    <span className="flex flex-wrap gap-1.5">
                                      {meal.description.split('、').map((ingredient, i) => (
                                        <span 
                                          key={i} 
                                          className={`
                                            inline-flex items-center rounded-full px-2 py-0.5 
                                            bg-white/50 backdrop-blur-sm text-[10px] font-medium 
                                            border border-[#C2884E]/10 shadow-sm
                                            transition-all duration-300
                                            hover:scale-105 hover:shadow-md hover:border-[#C2884E]/20
                                            transform opacity-0
                                            ${isHovered ? 'opacity-100 translate-x-0' : 'translate-x-1'}
                                          `}
                                          style={{ 
                                            transitionDelay: `${i * 100 + 100}ms`,
                                            animationDelay: `${i * 100 + 100}ms` 
                                          }}
                                        >
                                          {ingredient}
                                        </span>
                                      ))}
                                    </span>
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>

                        {/* Floating Total Calories */}
                        <div className="text-center mb-8">
                          <div
                            className={`inline-block transition-all duration-500 ${
                              isHovered ? "scale-110 -translate-y-1" : "scale-100 translate-y-0"
                            }`}
                          >
                            <div
                              className={`px-6 py-3 ${accentColors.bg} ${accentColors.border} border rounded-full backdrop-blur-sm`}
                            >
                              <span className={`text-sm font-medium ${accentColors.text} tabular-nums`}>
                                = {dayMenu.totalCalories}{t('totalCalories')}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Enhanced Nutrient Tags */}
                        <div className="flex flex-wrap gap-3 justify-center mt-6">
                          {dayMenu.tags.map((tag, tagIndex) => {
                            const TagIcon = tag.icon
                            return (
                              <div
                                key={tagIndex}
                                className={`
                                  relative group/tag
                                  transition-all duration-500 
                                  ${isHovered ? "translate-y-0 opacity-100" : "translate-y-1 opacity-90"}
                                `}
                                style={{ transitionDelay: isHovered ? `${tagIndex * 100}ms` : "0ms" }}
                              >
                                {/* Enhanced Tag with Icon */}
                                <div
                                  className={`
                                    relative overflow-hidden
                                    px-5 py-2.5 rounded-full 
                                    flex items-center gap-2
                                    bg-gradient-to-r ${dayMenu.gradient} 
                                    text-white shadow-lg
                                    hover:shadow-xl hover:scale-105 transition-all duration-300
                                  `}
                                >
                                  <TagIcon className="w-3.5 h-3.5" />
                                  <span className="text-xs font-medium tracking-wide">{tag.name}</span>

                                  {/* Subtle shine effect */}
                                  <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 opacity-0 group-hover/tag:opacity-100 transition-opacity duration-700 -translate-x-full group-hover/tag:translate-x-full"></div>
                                </div>

                                {/* Subtle glow effect */}
                                <div className="absolute inset-0 rounded-full bg-gradient-to-r from-white/10 to-white/5 blur-md -z-10"></div>
                              </div>
                            )
                          })}
                        </div>

                        {/* Subtle Glow Effect */}
                        <div
                          className={`absolute inset-0 rounded-3xl transition-opacity duration-700 ${
                            isHovered ? "opacity-100" : "opacity-0"
                          }`}
                        >
                          <div
                            className={`absolute inset-0 rounded-3xl bg-gradient-to-br ${dayMenu.color} opacity-20 blur-xl`}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
              
              {/* Second row: 2 cards, centered */}
              <div className="lg:col-span-3 flex flex-col md:flex-row justify-center gap-8 w-full">
                {menuData.slice(3, 5).map((dayMenu, index) => {
                  const accentColors = getAccentColors(dayMenu.accent)
                  const actualIndex = index + 3 // For hover state tracking
                  const isHovered = hoveredCard === actualIndex
                  
                  return (
                    <div
                      key={dayMenu.day}
                      className={`group transition-all duration-1000 ease-out ${
                        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-16"
                      } w-full md:w-1/2 lg:w-1/3`}
                      style={{ transitionDelay: isVisible ? `${actualIndex * 150}ms` : "0ms" }}
                      onMouseEnter={() => setHoveredCard(actualIndex)}
                      onMouseLeave={() => setHoveredCard(null)}
                    >
                      <div
                        className={`relative h-full transition-all duration-700 ease-out ${
                          isHovered ? "scale-105 -translate-y-4" : "scale-100 translate-y-0"
                        }`}
                      >
                        {/* Card content - same as before */}
                        <div
                          className={`
                          relative backdrop-blur-xl bg-gradient-to-br ${dayMenu.color} 
                          rounded-3xl p-8 border border-[#C2884E]/10 shadow-xl
                          transition-all duration-700 ease-out
                          ${isHovered ? "shadow-2xl shadow-[#C2884E]/10" : "shadow-lg shadow-[#C2884E]/5"}
                          before:absolute before:inset-0 before:rounded-3xl before:bg-white/40 before:opacity-0 before:transition-opacity before:duration-500
                          ${isHovered ? "before:opacity-100" : "before:opacity-0"}
                        `}
                        >
                          {/* Rest of card content */}
                          {/* Floating Day Header */}
                          <div className="text-center mb-8 relative">
                            <div
                              className={`inline-block transition-all duration-500 ${isHovered ? "scale-110" : "scale-100"}`}
                            >
                              <div className="flex flex-col items-center">
                                <h3 className="text-3xl font-extralight text-[#6B5F53] mb-0.5 tracking-wide">
                                  {dayMenu.day}
                                </h3>
                                
                                <div className="flex items-center justify-center gap-1.5 mb-1">
                                  <p className="text-xs text-[#6B5F53]/60 font-light tracking-wider uppercase">{dayMenu.dayZh}</p>
                                  {dayMenu.date && (
                                    <>
                                      <span className="inline-block w-0.5 h-0.5 rounded-full bg-[#C2884E]/40"></span>
                                      <p className={`text-xs text-[#C2884E]/80 font-medium tracking-wide ${isHovered ? 'opacity-100' : 'opacity-70'}`}>
                                        {dayMenu.date}
                                      </p>
                                    </>
                                  )}
                                </div>
                              </div>
                              
                              <div
                                className={`w-8 h-px ${accentColors.bg} mx-auto transition-all duration-500 ${
                                  isHovered ? "w-12" : "w-8"
                                }`}
                              ></div>
                            </div>
                          </div>

                          {/* Meals List with Staggered Animation */}
                          <div className="space-y-4 mb-8">
                            {dayMenu.meals.map((meal, mealIndex) => (
                              <div
                                key={mealIndex}
                                className={`flex flex-col group/meal transition-all duration-500 ${
                                  isHovered ? "translate-x-2" : "translate-x-0"
                                }`}
                                style={{ transitionDelay: isHovered ? `${mealIndex * 50}ms` : "0ms" }}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3 flex-1">
                                    <span className="text-sm text-[#6B5F53] leading-relaxed font-light">{meal.name}</span>
                                  </div>
                                  <span className="text-xs text-[#6B5F53]/60 font-medium ml-4 tabular-nums">
                                    {meal.calories}{t('totalCalories').toLowerCase()}
                                  </span>
                                </div>
                                
                                {/* Meal description if available */}
                                {meal.description && (
                                  <div 
                                    className={`
                                      mt-1 ml-3 mb-1 overflow-hidden max-h-0 opacity-0 
                                      transition-all duration-500 ease-in-out
                                      ${isHovered ? "max-h-20 opacity-100" : ""}
                                    `}
                                  >
                                    <div className={`
                                      text-xs italic text-[#6B5F53]/70 
                                      border-l-2 ${accentColors.border}
                                      pl-2 py-0.5 mt-0.5
                                      relative
                                      after:absolute after:bottom-0 after:left-0 after:right-0 
                                      after:h-full after:bg-gradient-to-r after:from-[#C2884E]/5 after:to-transparent after:rounded-r-md
                                      after:-z-10
                                    `}>
                                      <span className="flex flex-wrap gap-1.5">
                                        {meal.description.split('、').map((ingredient, i) => (
                                          <span 
                                            key={i} 
                                            className={`
                                              inline-flex items-center rounded-full px-2 py-0.5 
                                              bg-white/50 backdrop-blur-sm text-[10px] font-medium 
                                              border border-[#C2884E]/10 shadow-sm
                                              transition-all duration-300
                                              hover:scale-105 hover:shadow-md hover:border-[#C2884E]/20
                                              transform opacity-0
                                              ${isHovered ? 'opacity-100 translate-x-0' : 'translate-x-1'}
                                            `}
                                            style={{ 
                                              transitionDelay: `${i * 100 + 100}ms`,
                                              animationDelay: `${i * 100 + 100}ms` 
                                            }}
                                          >
                                            {ingredient}
                                          </span>
                                        ))}
                                      </span>
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>

                          {/* Floating Total Calories */}
                          <div className="text-center mb-8">
                            <div
                              className={`inline-block transition-all duration-500 ${
                                isHovered ? "scale-110 -translate-y-1" : "scale-100 translate-y-0"
                              }`}
                            >
                              <div
                                className={`px-6 py-3 ${accentColors.bg} ${accentColors.border} border rounded-full backdrop-blur-sm`}
                              >
                                <span className={`text-sm font-medium ${accentColors.text} tabular-nums`}>
                                  = {dayMenu.totalCalories}{t('totalCalories')}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Enhanced Nutrient Tags */}
                          <div className="flex flex-wrap gap-3 justify-center mt-6">
                            {dayMenu.tags.map((tag, tagIndex) => {
                              const TagIcon = tag.icon
                              return (
                                <div
                                  key={tagIndex}
                                  className={`
                                    relative group/tag
                                    transition-all duration-500 
                                    ${isHovered ? "translate-y-0 opacity-100" : "translate-y-1 opacity-90"}
                                  `}
                                  style={{ transitionDelay: isHovered ? `${tagIndex * 100}ms` : "0ms" }}
                                >
                                  {/* Enhanced Tag with Icon */}
                                  <div
                                    className={`
                                      relative overflow-hidden
                                      px-5 py-2.5 rounded-full 
                                      flex items-center gap-2
                                      bg-gradient-to-r ${dayMenu.gradient} 
                                      text-white shadow-lg
                                      hover:shadow-xl hover:scale-105 transition-all duration-300
                                    `}
                                  >
                                    <TagIcon className="w-3.5 h-3.5" />
                                    <span className="text-xs font-medium tracking-wide">{tag.name}</span>

                                    {/* Subtle shine effect */}
                                    <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 opacity-0 group-hover/tag:opacity-100 transition-opacity duration-700 -translate-x-full group-hover/tag:translate-x-full"></div>
                                  </div>

                                  {/* Subtle glow effect */}
                                  <div className="absolute inset-0 rounded-full bg-gradient-to-r from-white/10 to-white/5 blur-md -z-10"></div>
                                </div>
                              )
                            })}
                          </div>

                          {/* Subtle Glow Effect */}
                          <div
                            className={`absolute inset-0 rounded-3xl transition-opacity duration-700 ${
                              isHovered ? "opacity-100" : "opacity-0"
                            }`}
                          >
                            <div
                              className={`absolute inset-0 rounded-3xl bg-gradient-to-br ${dayMenu.color} opacity-20 blur-xl`}
                            ></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          ) : (
            // Original layout for non-5 cards case
            menuData.map((dayMenu, index) => {
              const accentColors = getAccentColors(dayMenu.accent)
              const isHovered = hoveredCard === index

              return (
                <div
                  key={dayMenu.day}
                  className={`group transition-all duration-1000 ease-out ${
                    isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-16"
                  }`}
                  style={{ transitionDelay: isVisible ? `${index * 150}ms` : "0ms" }}
                  onMouseEnter={() => setHoveredCard(index)}
                  onMouseLeave={() => setHoveredCard(null)}
                >
                  <div
                    className={`relative h-full transition-all duration-700 ease-out ${
                      isHovered ? "scale-105 -translate-y-4" : "scale-100 translate-y-0"
                    }`}
                  >
                    {/* Card content here - existing code */}
                    <div
                      className={`
                      relative backdrop-blur-xl bg-gradient-to-br ${dayMenu.color} 
                      rounded-3xl p-8 border border-[#C2884E]/10 shadow-xl
                      transition-all duration-700 ease-out
                      ${isHovered ? "shadow-2xl shadow-[#C2884E]/10" : "shadow-lg shadow-[#C2884E]/5"}
                      before:absolute before:inset-0 before:rounded-3xl before:bg-white/40 before:opacity-0 before:transition-opacity before:duration-500
                      ${isHovered ? "before:opacity-100" : "before:opacity-0"}
                    `}
                    >
                      {/* Rest of existing code for cards */}
                      {/* Floating Day Header */}
                      <div className="text-center mb-8 relative">
                        <div
                          className={`inline-block transition-all duration-500 ${isHovered ? "scale-110" : "scale-100"}`}
                        >
                          <div className="flex flex-col items-center">
                            <h3 className="text-3xl font-extralight text-[#6B5F53] mb-0.5 tracking-wide">
                              {dayMenu.day}
                            </h3>
                            
                            <div className="flex items-center justify-center gap-1.5 mb-1">
                              <p className="text-xs text-[#6B5F53]/60 font-light tracking-wider uppercase">{dayMenu.dayZh}</p>
                              {dayMenu.date && (
                                <>
                                  <span className="inline-block w-0.5 h-0.5 rounded-full bg-[#C2884E]/40"></span>
                                  <p className={`text-xs text-[#C2884E]/80 font-medium tracking-wide ${isHovered ? 'opacity-100' : 'opacity-70'}`}>
                                    {dayMenu.date}
                                  </p>
                                </>
                              )}
                            </div>
                          </div>
                          
                          <div
                            className={`w-8 h-px ${accentColors.bg} mx-auto transition-all duration-500 ${
                              isHovered ? "w-12" : "w-8"
                            }`}
                          ></div>
                        </div>
                      </div>

                      {/* Meals List with Staggered Animation */}
                      <div className="space-y-4 mb-8">
                        {dayMenu.meals.map((meal, mealIndex) => (
                          <div
                            key={mealIndex}
                            className={`flex flex-col group/meal transition-all duration-500 ${
                              isHovered ? "translate-x-2" : "translate-x-0"
                            }`}
                            style={{ transitionDelay: isHovered ? `${mealIndex * 50}ms` : "0ms" }}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3 flex-1">
                                <span className="text-sm text-[#6B5F53] leading-relaxed font-light">{meal.name}</span>
                              </div>
                              <span className="text-xs text-[#6B5F53]/60 font-medium ml-4 tabular-nums">
                                {meal.calories}{t('totalCalories').toLowerCase()}
                              </span>
                            </div>
                            
                            {/* Meal description if available */}
                            {meal.description && (
                              <div 
                                className={`
                                  mt-1 ml-3 mb-1 overflow-hidden max-h-0 opacity-0 
                                  transition-all duration-500 ease-in-out
                                  ${isHovered ? "max-h-20 opacity-100" : ""}
                                `}
                              >
                                <div className={`
                                  text-xs italic text-[#6B5F53]/70 
                                  border-l-2 ${accentColors.border}
                                  pl-2 py-0.5 mt-0.5
                                  relative
                                  after:absolute after:bottom-0 after:left-0 after:right-0 
                                  after:h-full after:bg-gradient-to-r after:from-[#C2884E]/5 after:to-transparent after:rounded-r-md
                                  after:-z-10
                                `}>
                                  <span className="flex flex-wrap gap-1.5">
                                    {meal.description.split('、').map((ingredient, i) => (
                                      <span 
                                        key={i} 
                                        className={`
                                          inline-flex items-center rounded-full px-2 py-0.5 
                                          bg-white/50 backdrop-blur-sm text-[10px] font-medium 
                                          border border-[#C2884E]/10 shadow-sm
                                          transition-all duration-300
                                          hover:scale-105 hover:shadow-md hover:border-[#C2884E]/20
                                          transform opacity-0
                                          ${isHovered ? 'opacity-100 translate-x-0' : 'translate-x-1'}
                                        `}
                                        style={{ 
                                          transitionDelay: `${i * 100 + 100}ms`,
                                          animationDelay: `${i * 100 + 100}ms` 
                                        }}
                                      >
                                        {ingredient}
                                      </span>
                                    ))}
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Floating Total Calories */}
                      <div className="text-center mb-8">
                        <div
                          className={`inline-block transition-all duration-500 ${
                            isHovered ? "scale-110 -translate-y-1" : "scale-100 translate-y-0"
                          }`}
                        >
                          <div
                            className={`px-6 py-3 ${accentColors.bg} ${accentColors.border} border rounded-full backdrop-blur-sm`}
                          >
                            <span className={`text-sm font-medium ${accentColors.text} tabular-nums`}>
                              = {dayMenu.totalCalories}{t('totalCalories')}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Enhanced Nutrient Tags */}
                      <div className="flex flex-wrap gap-3 justify-center mt-6">
                        {dayMenu.tags.map((tag, tagIndex) => {
                          const TagIcon = tag.icon
                          return (
                            <div
                              key={tagIndex}
                              className={`
                                relative group/tag
                                transition-all duration-500 
                                ${isHovered ? "translate-y-0 opacity-100" : "translate-y-1 opacity-90"}
                              `}
                              style={{ transitionDelay: isHovered ? `${tagIndex * 100}ms` : "0ms" }}
                            >
                              {/* Enhanced Tag with Icon */}
                              <div
                                className={`
                                  relative overflow-hidden
                                  px-5 py-2.5 rounded-full 
                                  flex items-center gap-2
                                  bg-gradient-to-r ${dayMenu.gradient} 
                                  text-white shadow-lg
                                  hover:shadow-xl hover:scale-105 transition-all duration-300
                                `}
                              >
                                <TagIcon className="w-3.5 h-3.5" />
                                <span className="text-xs font-medium tracking-wide">{tag.name}</span>

                                {/* Subtle shine effect */}
                                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 opacity-0 group-hover/tag:opacity-100 transition-opacity duration-700 -translate-x-full group-hover/tag:translate-x-full"></div>
                              </div>

                              {/* Subtle glow effect */}
                              <div className="absolute inset-0 rounded-full bg-gradient-to-r from-white/10 to-white/5 blur-md -z-10"></div>
                            </div>
                          )
                        })}
                      </div>

                      {/* Subtle Glow Effect */}
                      <div
                        className={`absolute inset-0 rounded-3xl transition-opacity duration-700 ${
                          isHovered ? "opacity-100" : "opacity-0"
                        }`}
                      >
                        <div
                          className={`absolute inset-0 rounded-3xl bg-gradient-to-br ${dayMenu.color} opacity-20 blur-xl`}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </section>
  )
} 