"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { useLanguage } from "@/lib/language-context"

interface SectionLink {
  id: string
  label: {
    en: string
    zh: string
  }
}

export default function SectionNavigation() {
  const [activeSection, setActiveSection] = useState<string | null>(null)
  const { language } = useLanguage()
  
  // Define the sections to link to
  const sections: SectionLink[] = [
    {
      id: "meal-plans",
      label: {
        en: "Meal Plans",
        zh: "餐食计划"
      }
    },
    {
      id: "food-gallery",
      label: {
        en: "Food Gallery",
        zh: "精选菜系"
      }
    },
    {
      id: "weekly-menu",
      label: {
        en: "Weekly Menu",
        zh: "本周菜单"
      }
    },
    {
      id: "reviews",
      label: {
        en: "Reviews",
        zh: "用户评价"
      }
    }
  ]
  
  // Handle scroll to section
  const scrollToSection = (id: string) => {
    const element = document.getElementById(id)
    if (element) {
      // Offset for header height
      const headerOffset = 80
      const elementPosition = element.getBoundingClientRect().top
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset
      
      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth"
      })
      
      setActiveSection(id)
    }
  }
  
  // Update active section based on scroll position
  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY + 200 // Add offset for better UX
      
      // Check if we're at the hero section (top of page)
      if (scrollPosition < 300) {
        setActiveSection(null) // No active section at hero
        return
      }
      
      // Find the current section in view
      for (let i = sections.length - 1; i >= 0; i--) {
        const section = document.getElementById(sections[i].id)
        if (section && scrollPosition >= section.offsetTop) {
          setActiveSection(sections[i].id)
          break
        }
      }
    }
    
    window.addEventListener("scroll", handleScroll)
    // Run once on mount to set initial state
    handleScroll()
    return () => window.removeEventListener("scroll", handleScroll)
  }, [sections])
  
  return (
    <div className="fixed left-1/2 transform -translate-x-1/2 bottom-8 z-50">
      <motion.div 
        className="bg-white/90 backdrop-blur-sm rounded-full shadow-lg border border-[#C2884E]/20 px-6 py-3 flex items-center gap-6"
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.5 }}
      >
        {sections.map((section) => (
          <button
            key={section.id}
            onClick={() => scrollToSection(section.id)}
            className={`relative text-sm font-medium px-3 py-1 rounded-full transition-all duration-300 ${
              activeSection === section.id 
                ? "text-white bg-gradient-to-r from-[#C2884E] to-[#D1A46C]" 
                : "text-[#6B5F53] hover:text-[#C2884E]"
            }`}
          >
            {language === 'en' ? section.label.en : section.label.zh}
          </button>
        ))}
      </motion.div>
    </div>
  )
}
