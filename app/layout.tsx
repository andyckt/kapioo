import type React from "react"
import "@/app/globals.css"
import { Inter } from "next/font/google"
import { Toaster } from "@/components/ui/toaster"
import AppInitializer from "@/components/app-initializer"
import { LanguageProvider } from "@/lib/language-context"

const inter = Inter({ subsets: ["latin"] })

export const metadata = {
  title: "Kapioo - Dietitian-Approved Chinese Fusion Meals, Delivered Fresh Daily in Toronto",
  description: "A subscription-based food meal service with capybara-approved quality",
  generator: 'v0.dev',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
    ],
    apple: [
      { url: '/apple-icon.png', sizes: '180x180', type: 'image/png' },
    ],
    other: [
      { rel: 'mask-icon', url: '/favicon.ico', color: '#C2884E' },
      { rel: 'shortcut icon', url: '/favicon.ico' },
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
    <html lang="zh">
      <body className={inter.className}>
        <LanguageProvider>
          <AppInitializer />
          {children}
          <Toaster />
        </LanguageProvider>
      </body>
    </html>
  )
}