import type React from "react"
import type { Viewport } from "next"
import "@/app/globals.css"
import { Toaster } from "@/components/ui/toaster"
import AppInitializer from "@/components/app-initializer"
import { LanguageProvider } from "@/lib/language-context"
import { MaintenanceProvider } from "@/lib/maintenance-context"
import { MaintenanceNotification } from "@/components/maintenance-notification"
import { buildPageMetadata } from "@/lib/seo/metadata"
import { PRODUCT_LINE_LABELS } from "@/lib/product-lines/names"
import { cookies } from "next/headers"
import { Analytics } from "@vercel/analytics/next"

export const metadata = {
  ...buildPageMetadata({
    title: "Kapioo | Asian Fusion Meal Delivery in Toronto",
    description:
      `Freshly made Asian fusion meals delivered across Toronto and the GTA. Explore ${PRODUCT_LINE_LABELS.daily.en} and ${PRODUCT_LINE_LABELS.weekly.en}, with flexible meal vouchers.`,
    path: "/",
  }),
  icons: {
    icon: [
      { url: '/kapioo-logo.png', sizes: '375x375', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-icon.png', sizes: '180x180', type: 'image/png' },
    ],
    other: [
      { rel: 'shortcut icon', url: '/kapioo-logo.png' },
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
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 10,
  themeColor: '#f8f3eb',
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
    <html lang="en">
      <body className="overflow-x-hidden">
        <LanguageProvider initialLanguage={initialLanguage}>
          <MaintenanceProvider>
            <AppInitializer>
              <MaintenanceNotification />
              {children}
              <Toaster />
            </AppInitializer>
          </MaintenanceProvider>
        </LanguageProvider>
        <Analytics />
      </body>
    </html>
  )
}
