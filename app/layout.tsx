import type React from "react"
import "@/app/globals.css"
import { Inter } from "next/font/google"
import { Toaster } from "@/components/ui/toaster"
import AppInitializer from "@/components/app-initializer"
import { LanguageProvider } from "@/lib/language-context"
import { MaintenanceProvider } from "@/lib/maintenance-context"
import { MaintenanceNotification } from "@/components/maintenance-notification"
import { LanguagePreferenceDialog } from "@/components/language-preference-dialog"
import { buildPageMetadata } from "@/lib/seo/metadata"
import { cookies } from "next/headers"

const inter = Inter({ subsets: ["latin"] })

export const metadata = {
  ...buildPageMetadata({
    title: "Kapioo | Healthy Asian Comfort Meals in Toronto",
    description:
      "Freshly cooked Asian comfort meals delivered across Toronto and the GTA. Choose Daily Delivery or Weekly Meal Box with clear logistics.",
    path: "/",
  }),
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

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const cookieStore = await cookies()
  const preferredLanguage = cookieStore.get("preferredLanguage")?.value
  const initialLanguage = preferredLanguage === "zh" || preferredLanguage === "en"
    ? preferredLanguage
    : "en"

  return (
    <html lang="en" className="overflow-x-hidden">
      <body className={`${inter.className} overflow-x-hidden`}>
        <LanguageProvider initialLanguage={initialLanguage}>
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