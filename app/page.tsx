"use client"

import Link from "next/link"
import Image from "next/image"
import { ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { HeroCarousel } from "@/components/hero-carousel"
import { motion } from "framer-motion"

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex gap-4 md:gap-10">
            <Link href="/" className="flex items-center gap-2 group">
              <Image 
                src="/capybara-svgrepo-com.svg" 
                alt="Kapioo Logo" 
                width={32} 
                height={32} 
                className="h-8 w-8 transition-transform duration-300 group-hover:rotate-6 group-hover:scale-110" 
              />
              <span className="inline-block font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#C2884E] to-[#D1A46C]/80 text-lg sm:text-xl transition-all duration-300 group-hover:scale-105 group-hover:tracking-wider">Kapioo</span>
            </Link>
          </div>
          <div className="flex items-center">
            <nav className="flex items-center space-x-1 sm:space-x-2">
              <Link href="/login" className="px-2 sm:px-4 py-2 text-sm font-medium transition-colors hover:text-transparent hover:bg-clip-text hover:bg-gradient-to-r hover:from-[#C2884E] hover:to-[#D1A46C] hover:scale-105 transition-transform">
                Login
              </Link>
              <Button asChild size="sm" className="bg-gradient-to-r from-[#C2884E] to-[#D1A46C] hover:scale-105 transition-transform sm:size-default">
                <Link href="/login">
                  <span className="sm:block">Get Started</span> <ArrowRight className="ml-1 h-4 w-4 hidden sm:inline-block" />
                </Link>
              </Button>
            </nav>
          </div>
        </div>
      </header>
      <main className="flex-1">
        <section className="w-full py-12 md:py-24 lg:py-32 xl:py-40 bg-[#fff6ef] relative overflow-hidden">
          {/* Background pattern for premium feel */}
          <div className="absolute inset-0 z-0 opacity-5">
            <div className="absolute inset-0 bg-[radial-gradient(#000000_1px,transparent_1px)] [background-size:20px_20px]"></div>
          </div>
          
          <div className="container px-4 md:px-6 relative z-10">
            <div className="grid gap-8 lg:grid-cols-[1fr_600px] lg:gap-12 xl:grid-cols-[1fr_700px] items-center">
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="flex flex-col justify-center space-y-4"
              >
                <div className="space-y-2">
                  <h1 className="text-3xl font-bold tracking-tighter sm:text-5xl xl:text-6xl/none bg-clip-text text-transparent bg-gradient-to-r from-[#C2884E] to-[#D1A46C]/80">
                    Delicious Meals Delivered Weekly
                  </h1>
                  <p className="max-w-[600px] text-muted-foreground md:text-xl">
                    Subscribe to Kapioo and enjoy chef-prepared meals delivered to your doorstep. Choose your meals for
                    the week and pay with your credits.
                  </p>
                </div>
                <motion.div 
                  className="flex flex-col gap-2 min-[400px]:flex-row"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.6, delay: 0.6 }}
                >
                  <Button asChild size="lg" className="hover:scale-105 transition-transform bg-gradient-to-r from-[#C2884E] to-[#D1A46C] text-white">
                    <Link href="/login">
                      Get Started <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                  <Button variant="outline" size="lg" asChild className="hover:scale-105 transition-transform">
                    <Link href="#how-it-works">How It Works</Link>
                  </Button>
                </motion.div>
              </motion.div>
              <motion.div 
                className="mx-auto w-full lg:order-last"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8 }}
              >
                {/* Premium styled carousel wrapper */}
                <div className="rounded-xl overflow-hidden shadow-2xl shadow-black/20 relative w-full">
                  <HeroCarousel />
                  <div className="absolute inset-0 pointer-events-none rounded-xl ring-1 ring-inset ring-black/10"></div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        <section id="how-it-works" className="w-full py-12 md:py-24 lg:py-32 bg-background">
          <div className="container px-4 md:px-6">
            <motion.div 
              className="flex flex-col items-center justify-center space-y-4 text-center"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <div className="space-y-2">
                <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">How It Works</h2>
                <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                  Our subscription service is simple and convenient. Here's how to get started.
                </p>
              </div>
            </motion.div>
            <div className="mx-auto grid max-w-5xl items-center gap-6 py-12 lg:grid-cols-3 lg:gap-12">
              <motion.div 
                className="flex flex-col justify-center space-y-4 rounded-lg border p-6 shadow-sm transition-all hover:shadow-md hover:-translate-y-1"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: 0.1 }}
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-r from-[#C2884E] to-[#D1A46C] text-white shadow-md transition-all duration-300 hover:scale-110 hover:shadow-lg hover:shadow-[#C2884E]/20 cursor-pointer">
                  1
                </div>
                <h3 className="text-xl font-bold">Sign Up</h3>
                <p className="text-muted-foreground">
                  Create an account and purchase credits to use for your weekly meals.
                </p>
              </motion.div>
              <motion.div 
                className="flex flex-col justify-center space-y-4 rounded-lg border p-6 shadow-sm transition-all hover:shadow-md hover:-translate-y-1"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: 0.2 }}
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-r from-[#C2884E] to-[#D1A46C] text-white shadow-md transition-all duration-300 hover:scale-110 hover:shadow-lg hover:shadow-[#C2884E]/20 cursor-pointer">
                  2
                </div>
                <h3 className="text-xl font-bold">Select Meals</h3>
                <p className="text-muted-foreground">
                  Browse our weekly menu and select the days you want meals delivered.
                </p>
              </motion.div>
              <motion.div 
                className="flex flex-col justify-center space-y-4 rounded-lg border p-6 shadow-sm transition-all hover:shadow-md hover:-translate-y-1"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: 0.3 }}
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-r from-[#C2884E] to-[#D1A46C] text-white shadow-md transition-all duration-300 hover:scale-110 hover:shadow-lg hover:shadow-[#C2884E]/20 cursor-pointer">
                  3
                </div>
                <h3 className="text-xl font-bold">Enjoy</h3>
                <p className="text-muted-foreground">
                  Receive your meals on your selected days and enjoy delicious, chef-prepared food.
                </p>
              </motion.div>
            </div>
          </div>
        </section>
      </main>
      <footer className="w-full border-t bg-background py-6 md:py-8">
        <div className="container flex flex-col items-center justify-center gap-4 md:flex-row md:gap-8">
          <p className="text-center text-sm leading-loose text-muted-foreground md:text-left">
            © 2025 Kapioo. All rights reserved.
          </p>
          <div className="flex gap-4">
            <Link href="#" className="text-sm font-medium hover:underline">
              Terms
            </Link>
            <Link href="#" className="text-sm font-medium hover:underline">
              Privacy
            </Link>
            <Link href="#" className="text-sm font-medium hover:underline">
              Contact
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}

