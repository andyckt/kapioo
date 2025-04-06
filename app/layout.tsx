import type React from "react"
import "@/app/globals.css"
import { Inter } from "next/font/google"
import { Toaster } from "@/components/ui/toaster"
import AppInitializer from "@/components/app-initializer"
import { LanguageProvider } from "@/lib/language-context"

const inter = Inter({ subsets: ["latin"] })

export const metadata = {
  title: "Kapioo - Capybara-Approved Meal Service",
  description: "A subscription-based food meal service with capybara-approved quality",
  generator: 'v0.dev'
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