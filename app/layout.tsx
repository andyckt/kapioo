import type React from "react"
import "@/app/globals.css"
import { Inter } from "next/font/google"
import { Toaster } from "@/components/ui/toaster"
import AppInitializer from "@/components/app-initializer"
import { LanguageProvider } from "@/lib/language-context"
import { MaintenanceProvider } from "@/lib/maintenance-context"
import { MaintenanceNotification } from "@/components/maintenance-notification"
import { LanguagePreferenceDialog } from "@/components/language-preference-dialog"

const inter = Inter({ subsets: ["latin"] })

export const metadata = {
  title: "Kapioo - Dietitian-Approved Chinese Fusion Meals, Delivered Fresh Daily in Toronto",
  description: "A subscription-based food meal service with capybara-approved quality",
  generator: 'v0.dev',
  icons: {
    icon: [
      { url: '/xiaohongshu.png', sizes: 'any' },
    ],
    apple: [
      { url: '/apple-icon.png', sizes: '180x180', type: 'image/png' },
    ],
    other: [
      { rel: 'mask-icon', url: '/xiaohongshu.png', color: '#C2884E' },
      { rel: 'shortcut icon', url: '/xiaohongshu.png' },
      { rel: 'android-chrome', url: '/android-chrome-192x192.png', sizes: '192x192' },
      { rel: 'android-chrome', url: '/android-chrome-512x512.png', sizes: '512x512' },
    ],
  },
  manifest: '/site.webmanifest',
  applicationName: 'Kapioo',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Kapioo',
  },
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
  },
  themeColor: '#C2884E',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh" className="overflow-x-hidden">
      <body className={`${inter.className} overflow-x-hidden`}>
        <LanguageProvider>
          <MaintenanceProvider>
            <AppInitializer />
            <LanguagePreferenceDialog />
            <MaintenanceNotification />
            {children}
            <Toaster />
          </MaintenanceProvider>
        </LanguageProvider>
      </body>
    </html>
  )
}