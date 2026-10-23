"use client"

import type { ReactNode } from "react"
import Link from "next/link"
import { CircleHelp, LogOut, Menu } from "lucide-react"

import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet"
import { useLanguage } from "@/lib/language-context"
import type { DashboardMenuItem } from "./dashboard-menu-items"
import "./dashboard.css"

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
  userName?: string
}

function PortalNav({
  items,
  activeTab,
  onTabChange,
}: {
  items: DashboardMenuItem[]
  activeTab: string
  onTabChange: (tab: string) => void
}) {
  return (
    <nav className="kp-portal-nav" aria-label="Account navigation">
      {items.map((item) => (
        <div className="kp-portal-nav-group" key={item.id}>
          {item.isHeading ? (
            <div className="kp-portal-nav-heading">{item.label}</div>
          ) : (
            <button
              type="button"
              className="kp-portal-nav-link"
              aria-current={activeTab === item.id ? "page" : undefined}
              onClick={() => onTabChange(item.id)}
            >
              <span className="kp-portal-nav-icon" aria-hidden="true">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          )}
          {item.children?.map((child) => (
            <button
              type="button"
              key={child.id}
              className="kp-portal-nav-link kp-portal-nav-child"
              aria-current={activeTab === child.id ? "page" : undefined}
              onClick={() => onTabChange(child.id)}
            >
              <span className="kp-portal-nav-icon" aria-hidden="true">{child.icon}</span>
              <span>{child.label}</span>
            </button>
          ))}
        </div>
      ))}
    </nav>
  )
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
  userName,
}: DashboardShellProps) {
  const { language, chooseLanguage } = useLanguage()
  const initial = userName?.trim().charAt(0).toUpperCase() || "K"
  const tabChange = (tab: string) => {
    onActiveTabChange(tab)
    onMobileMenuOpenChange(false)
  }

  return (
    <div className="kp-portal">
      <header className="kp-portal-header">
        <Link href="/" className="kp-portal-logo" aria-label="Kapioo home">kapioo<span>.</span></Link>
        <div className="kp-portal-header-right">
          <Link className="kp-portal-header-help" href="/support"><CircleHelp size={17} />{language === "zh" ? "帮助" : "Help"}</Link>
          <div className="kp-portal-language" aria-label={language === "zh" ? "语言" : "Language"}>
            <button type="button" aria-pressed={language === "en"} onClick={() => chooseLanguage("en")}>EN</button>
            <span aria-hidden="true">/</span>
            <button type="button" aria-pressed={language === "zh"} onClick={() => chooseLanguage("zh")}>中文</button>
          </div>
          <button className="kp-portal-account" type="button" onClick={() => onActiveTabChange("settings")} aria-label={language === "zh" ? "账户设置" : "Account settings"}>
            <span>{initial}</span>
            <span className="kp-portal-account-name">{userName?.split(" ")[0] || (language === "zh" ? "我的账户" : "Account")}</span>
          </button>
          <button className="kp-portal-menu-toggle" type="button" aria-label={language === "zh" ? "打开菜单" : "Open menu"} onClick={() => onMobileMenuOpenChange(true)}><Menu size={23} /></button>
        </div>
      </header>

      <div className="kp-portal-layout">
        <aside className="kp-portal-sidebar">
          <div className="kp-portal-sidebar-intro">
            <span>{language === "zh" ? "你的餐食空间" : "YOUR SPACE"}</span>
            <p>{language === "zh" ? "好好吃饭，轻松生活。" : "Good food, on your time."}</p>
          </div>
          <PortalNav items={menuItems} activeTab={activeTab} onTabChange={onActiveTabChange} />
          <div className="kp-portal-sidebar-footer">
            <Link href="/how-it-works">{language === "zh" ? "如何运作" : "How it works"}</Link>
            <button type="button" onClick={() => void onLogout()}><LogOut size={16} />{mobileLogoutLabel}</button>
          </div>
        </aside>
        <main className="kp-portal-main" id="portal-main">
          <div className="kp-portal-content">{children}</div>
        </main>
      </div>

      <Sheet open={isMobileMenuOpen} onOpenChange={onMobileMenuOpenChange}>
        <SheetContent side="left" className="kp-portal-sheet">
          <SheetTitle className="kp-portal-sheet-title">kapioo<span>.</span></SheetTitle>
          <p className="kp-portal-sheet-caption">{language === "zh" ? "你的餐食空间" : "YOUR SPACE"}</p>
          <PortalNav items={menuItems} activeTab={activeTab} onTabChange={tabChange} />
          <div className="kp-portal-sheet-bottom">
            <Link href="/support" onClick={() => onMobileMenuOpenChange(false)}><CircleHelp size={17} />{language === "zh" ? "帮助" : "Help"}</Link>
            <button type="button" onClick={onMobileLogout}><LogOut size={17} />{mobileLogoutLabel}</button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
