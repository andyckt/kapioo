"use client"

import type { ReactNode } from "react"

import Image from "next/image"
import { AnimatePresence, motion } from "framer-motion"
import { LogOut, Menu, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { LanguageSwitcher } from "@/components/language-switcher"
import { MainNav } from "@/components/main-nav"
import { UserNav } from "@/components/user-nav"

import type { DashboardMenuItem } from "./dashboard-menu-items"

interface DashboardNavProps {
  items: DashboardMenuItem[]
  activeTab: string
  onTabChange: (tab: string) => void
  compact?: boolean
}

function DashboardNav({ items, activeTab, onTabChange, compact = false }: DashboardNavProps) {
  return (
    <>
      {items.map((item) => (
        <div key={item.id}>
          {item.isHeading ? (
            <div className="px-3 py-2 text-sm font-medium flex items-center gap-2">
              {item.icon}
              {item.label}
            </div>
          ) : (
            <Button
              variant={activeTab === item.id ? "default" : "ghost"}
              className={`justify-start gap-2 w-full ${
                activeTab === item.id
                  ? "bg-gradient-to-r from-[#C2884E] to-[#D1A46C] hover:from-[#C2884E] hover:to-[#D1A46C] text-white"
                  : ""
              } ${compact ? "text-sm" : ""}`}
              onClick={() => onTabChange(item.id)}
            >
              {item.icon}
              {item.label}
            </Button>
          )}

          {item.children && item.children.length > 0 && (
            <div className={compact ? "pl-6 mt-1 border-l-2 border-muted ml-2" : "pl-6 mt-1 border-l-2 border-muted ml-2"}>
              {item.children.map((child) => (
                <Button
                  key={child.id}
                  variant={activeTab === child.id ? "default" : "ghost"}
                  className={`justify-start gap-2 w-full text-sm ${
                    activeTab === child.id
                      ? "bg-gradient-to-r from-[#C2884E] to-[#D1A46C] hover:from-[#C2884E] hover:to-[#D1A46C] text-white"
                      : ""
                  }`}
                  onClick={() => onTabChange(child.id)}
                >
                  {child.icon}
                  {child.label}
                </Button>
              ))}
            </div>
          )}
        </div>
      ))}
    </>
  )
}

interface DashboardShellProps {
  children: ReactNode
  menuItems: DashboardMenuItem[]
  activeTab: string
  isMobileMenuOpen: boolean
  onActiveTabChange: (tab: string) => void
  onMobileMenuOpenChange: (open: boolean) => void
  onLogout: () => void | Promise<void>
  onMobileLogout: () => void
  mobileLogoutLabel: string
}

export function DashboardShell({
  children,
  menuItems,
  activeTab,
  isMobileMenuOpen,
  onActiveTabChange,
  onMobileMenuOpenChange,
  onLogout,
  onMobileLogout,
  mobileLogoutLabel,
}: DashboardShellProps) {
  const handleMobileTabChange = (tab: string, shouldClose = true) => {
    onActiveTabChange(tab)
    if (shouldClose) {
      setTimeout(() => onMobileMenuOpenChange(false), 150)
    }
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <header className="bg-background sticky top-0 z-50 w-full border-b flex-shrink-0">
        <div className="container flex h-16 items-center justify-between px-4">
          <MainNav />

          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <UserNav setActiveTab={onActiveTabChange} />

            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => onMobileMenuOpenChange(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>
      </header>

      <AnimatePresence mode="wait">
        {isMobileMenuOpen && (
          <motion.div
            className="fixed inset-0 z-40 bg-background/90 backdrop-blur-md md:hidden overflow-hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            <motion.div
              className="absolute top-0 right-0 left-0 h-1 bg-primary"
              initial={{ scaleX: 0, transformOrigin: "left" }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.5, delay: 0.2, ease: "easeOut" }}
            />

            <motion.button
              className="absolute top-4 right-4 p-2 rounded-full bg-muted/80 backdrop-blur-sm text-foreground hover:bg-muted/90 focus:outline-none focus:ring-2 focus:ring-primary"
              initial={{ opacity: 0, rotate: -90 }}
              animate={{ opacity: 1, rotate: 0 }}
              transition={{ duration: 0.2, delay: 0.1 }}
              onClick={() => onMobileMenuOpenChange(false)}
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </motion.button>

            <motion.div
              className="container p-6 pt-20"
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
            >
              <nav className="flex flex-col gap-4">
                {menuItems.map((item, index) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{
                      duration: 0.35,
                      delay: 0.05 + index * 0.05,
                      ease: [0.25, 1, 0.5, 1],
                    }}
                  >
                    {item.isHeading ? (
                      <div className="px-3 py-2 text-sm font-medium flex items-center gap-2">
                        <motion.span initial={{ scale: 1 }}>{item.icon}</motion.span>
                        {item.label}
                      </div>
                    ) : (
                      <Button
                        variant={activeTab === item.id ? "default" : "ghost"}
                        className={`justify-start gap-2 text-base w-full ${
                          activeTab === item.id
                            ? "relative overflow-hidden group bg-gradient-to-r from-[#C2884E] to-[#D1A46C] hover:from-[#C2884E] hover:to-[#D1A46C] text-white"
                            : ""
                        }`}
                        onClick={() => handleMobileTabChange(item.id, !item.children || item.children.length === 0)}
                      >
                        <motion.span initial={{ scale: 1 }} whileTap={{ scale: 0.9 }}>
                          {item.icon}
                        </motion.span>
                        {item.label}
                        {activeTab === item.id && (
                          <div className="absolute bottom-0 left-0 h-0.5 bg-white/30 w-full transition-opacity duration-200" />
                        )}
                      </Button>
                    )}

                    {item.children && item.children.length > 0 && (
                      <div className="pl-6 mt-2 border-l-2 border-muted/50 ml-3">
                        {item.children.map((child, childIndex) => (
                          <motion.div
                            key={child.id}
                            initial={{ opacity: 0, x: -8 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{
                              duration: 0.25,
                              delay: 0.05 + (index + 1) * 0.05 + childIndex * 0.05,
                              ease: [0.25, 1, 0.5, 1],
                            }}
                          >
                            <Button
                              variant={activeTab === child.id ? "default" : "ghost"}
                              className={`justify-start gap-2 text-sm w-full mt-1 ${
                                activeTab === child.id
                                  ? "relative overflow-hidden group bg-gradient-to-r from-[#C2884E] to-[#D1A46C] hover:from-[#C2884E] hover:to-[#D1A46C] text-white"
                                  : ""
                              }`}
                              onClick={() => handleMobileTabChange(child.id)}
                            >
                              <motion.span initial={{ scale: 1 }} whileTap={{ scale: 0.9 }}>
                                {child.icon}
                              </motion.span>
                              {child.label}
                              {activeTab === child.id && (
                                <div className="absolute bottom-0 left-0 h-0.5 bg-white/30 w-full transition-opacity duration-200" />
                              )}
                            </Button>
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </motion.div>
                ))}

                <motion.div
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{
                    duration: 0.35,
                    delay: 0.05 + menuItems.length * 0.05,
                    ease: [0.25, 1, 0.5, 1],
                  }}
                >
                  <Button
                    variant="ghost"
                    className="justify-start gap-2 text-base text-destructive w-full"
                    onClick={onMobileLogout}
                  >
                    <motion.span initial={{ scale: 1 }} whileTap={{ scale: 0.9 }}>
                      <LogOut className="h-4 w-4" />
                    </motion.span>
                    {mobileLogoutLabel}
                  </Button>
                </motion.div>
              </nav>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative z-10">
        <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
          <div className="absolute -bottom-10 -right-10 w-[320px] h-[320px] sm:w-[450px] sm:h-[450px] md:w-[550px] md:h-[550px] opacity-[0.025]">
            <Image
              src="/未命名設計.png"
              alt="Kapioo Logo Background"
              fill
              className="object-contain"
              priority={false}
            />
          </div>

          <div className="absolute -top-5 -left-5 w-[230px] h-[230px] sm:w-[280px] sm:h-[280px] md:w-[320px] md:h-[320px] opacity-[0.02] rotate-12">
            <Image
              src="/未命名設計.png"
              alt="Kapioo Logo Background"
              fill
              className="object-contain"
              priority={false}
            />
          </div>

          <div
            className="absolute inset-0 opacity-[0.01] sm:opacity-[0.015]"
            style={{
              backgroundImage: "radial-gradient(circle at 1px 1px, #C2884E 1px, transparent 0)",
              backgroundSize: "16px 16px",
            }}
          />
        </div>

        <aside className="w-full md:w-64 border-r bg-background p-4 hidden md:block">
          <nav className="grid gap-2">
            <DashboardNav items={menuItems} activeTab={activeTab} onTabChange={onActiveTabChange} compact />
          </nav>
        </aside>

        <main className="flex-1 pt-2 md:pt-6 px-4 pb-12 overflow-y-auto overflow-x-hidden">
          <div className="mx-auto max-w-5xl space-y-4">{children}</div>
        </main>
      </div>
    </div>
  )
}
