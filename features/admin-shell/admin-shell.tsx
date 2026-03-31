"use client"

import type { ReactNode } from "react"

import { motion } from "framer-motion"
import { LogOut, Menu, ShoppingCart } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"

import type { AdminSidebarMenuItem } from "./admin-menu-items"

interface AdminNavProps {
  items: AdminSidebarMenuItem[]
  activeTab: string
  onTabChange: (tab: string) => void
  closeAfterSelect?: boolean
}

function AdminNav({ items, activeTab, onTabChange, closeAfterSelect = false }: AdminNavProps) {
  return (
    <>
      {items.map((item) => (
        <div key={item.id}>
          {item.isHeading ? (
            <div className="px-3 py-2 text-sm font-medium flex items-center gap-2 min-w-0">
              {item.icon}
              <span className="ml-2 min-w-0 flex-1 break-words text-left">{item.label}</span>
            </div>
          ) : (
            <Button
              variant={activeTab === item.id ? "default" : "ghost"}
              className="justify-start w-full whitespace-normal text-left min-w-0"
              onClick={() => onTabChange(item.id)}
            >
              {item.icon}
              <span className="ml-2 min-w-0 flex-1 break-words">{item.label}</span>
            </Button>
          )}

          {item.children && item.children.length > 0 && (
            <div
              className={
                closeAfterSelect
                  ? "pl-6 mt-1 border-l-2 border-muted ml-2 min-w-0"
                  : "pl-4 mt-1 border-l-2 border-muted ml-2 space-y-1"
              }
            >
              {item.children.map((child) => (
                <Button
                  key={child.id}
                  variant={activeTab === child.id ? "default" : "ghost"}
                  className={
                    closeAfterSelect
                      ? "justify-start w-full text-sm whitespace-normal text-left min-w-0"
                      : "justify-start w-full h-auto py-2 px-2 text-xs"
                  }
                  onClick={() => onTabChange(child.id)}
                >
                  <div className="flex items-center gap-2 w-full">
                    {child.icon}
                    <span className="text-xs leading-tight text-left flex-1">{child.label}</span>
                  </div>
                </Button>
              ))}
            </div>
          )}
        </div>
      ))}
    </>
  )
}

interface AdminShellProps {
  children: ReactNode
  sidebarMenuItems: AdminSidebarMenuItem[]
  activeTab: string
  mobileMenuOpen: boolean
  onMobileMenuOpenChange: (open: boolean) => void
  onTabChange: (tab: string) => void
  onLogout: () => void | Promise<void>
}

export function AdminShell({
  children,
  sidebarMenuItems,
  activeTab,
  mobileMenuOpen,
  onMobileMenuOpenChange,
  onTabChange,
  onLogout,
}: AdminShellProps) {
  const handleMobileTabChange = (tab: string) => {
    onTabChange(tab)
    onMobileMenuOpenChange(false)
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b bg-background">
        <div className="container flex h-16 items-center justify-between py-4">
          <div className="flex items-center gap-2">
            <Sheet open={mobileMenuOpen} onOpenChange={onMobileMenuOpenChange}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Toggle menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[min(320px,90vw)] flex flex-col overflow-hidden">
                <SheetHeader className="flex-shrink-0">
                  <SheetTitle className="flex items-center space-x-2">
                    <ShoppingCart className="h-6 w-6" />
                    <span>Kapioo Admin</span>
                  </SheetTitle>
                </SheetHeader>
                <nav className="mt-6 flex flex-col gap-2 flex-1 min-h-0 overflow-y-auto overflow-x-hidden pr-1 [-webkit-overflow-scrolling:touch]">
                  <AdminNav
                    items={sidebarMenuItems}
                    activeTab={activeTab}
                    onTabChange={handleMobileTabChange}
                    closeAfterSelect
                  />
                </nav>
              </SheetContent>
            </Sheet>

            <ShoppingCart className="h-6 w-6" />
            <span className="font-bold text-xl">Kapioo Admin</span>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              className="text-red-500 hover:text-red-600 hover:bg-red-100"
              onClick={() => void onLogout()}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <div className="container grid flex-1 gap-12 md:grid-cols-[240px_1fr] pt-6">
        <aside className="hidden w-[240px] flex-col md:flex">
          <motion.nav
            className="grid items-start gap-2"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
          >
            <AdminNav items={sidebarMenuItems} activeTab={activeTab} onTabChange={onTabChange} />
          </motion.nav>
        </aside>
        <main className="flex w-full flex-1 flex-col overflow-hidden">{children}</main>
      </div>
    </div>
  )
}
