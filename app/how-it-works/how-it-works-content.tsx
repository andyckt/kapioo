"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  ChevronLeft,
  CreditCard,
  UtensilsCrossed,
  Truck,
  Flame,
  Leaf,
  Clock,
  RefreshCw,
  Package,
  ThermometerSun,
  Microwave,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const steps = [
  {
    title: "Choose your plan",
    description:
      "Pick Daily Delivery or Weekly Meal Box depending on your schedule and area.",
    icon: CreditCard,
    image: "/foodjpg/charlesdeluvio-wrfO9SWykdE-unsplash.jpg",
  },
  {
    title: "Pick your meals",
    description:
      "Select Combo A or B from our rotating menus. Cutoff is 11:59 AM the day before delivery.",
    icon: UtensilsCrossed,
    image: "/foodjpg/anh-nguyen-kcA-c3f_3FE-unsplash.jpg",
  },
  {
    title: "We cook & deliver",
    description:
      "Freshly cooked meals are delivered to your door during the delivery window.",
    icon: Truck,
    image: "/foodjpg/omkar-jadhav-o5XB6XwTb1I-unsplash.jpg",
  },
];

const whyKapioo = [
  {
    text: "Fresh cooked meals (not frozen)",
    icon: Flame,
  },
  {
    text: "Asian comfort flavors with balanced portions",
    icon: Leaf,
  },
  {
    text: "Reliable delivery with clear cutoff times",
    icon: Clock,
  },
  {
    text: "Easy reordering with credits or plans",
    icon: RefreshCw,
  },
];

const logistics = [
  {
    label: "Delivery windows",
    detail: "Timing varies by area and plan. You'll see available windows during ordering.",
    icon: Truck,
  },
  {
    label: "Order cutoff",
    detail: "11:59 AM the day before delivery.",
    icon: Clock,
  },
  {
    label: "Freshness & storage",
    detail: "Keep refrigerated. Best enjoyed within 3 days.",
    icon: ThermometerSun,
  },
  {
    label: "Reheating",
    detail: "Microwave or stovetop. Instructions on each container.",
    icon: Microwave,
  },
];

const stagger = {
  visible: { transition: { staggerChildren: 0.12, delayChildren: 0.08 } },
  hidden: {},
};
const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0 },
};
const fadeIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

export function HowItWorksContent() {
  return (
    <div className="min-h-screen flex flex-col bg-[#FFF6EF]">
      {/* Back + minimal nav */}
      <header className="sticky top-0 z-50 w-full border-b bg-white/80 backdrop-blur-md supports-[backdrop-filter]:bg-white/90">
        <div className="container flex h-16 items-center justify-between px-4">
          <Button
            variant="ghost"
            size="sm"
            className="flex items-center gap-1 text-[#6B5F53] hover:text-[#C2884E] transition-colors rounded-full"
            asChild
          >
            <Link href="/">
              <ChevronLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Back</span>
            </Link>
          </Button>
          <nav className="flex items-center gap-4">
            <Link
              href="/faq"
              className="text-sm font-medium text-[#6B5F53] hover:text-[#C2884E] transition-colors"
            >
              FAQ
            </Link>
            <Link
              href="/starter"
              className="text-sm font-medium text-white bg-gradient-to-r from-[#C2884E] to-[#D1A46C] hover:opacity-90 px-4 py-2 rounded-full transition-all"
            >
              Get Started
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden bg-gradient-to-b from-[#FFF6EF] via-[#FBF7F2] to-white pb-16 pt-8 md:pt-12">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-20 right-0 w-[500px] h-[500px] bg-gradient-to-bl from-[#C2884E]/10 to-transparent rounded-full blur-[100px]" />
            <div className="absolute bottom-20 left-0 w-[400px] h-[400px] bg-gradient-to-tr from-[#D1A46C]/8 to-transparent rounded-full blur-[80px]" />
            <div className="absolute inset-0 opacity-[0.02] bg-[radial-gradient(#C2884E_1px,transparent_1px)] [background-size:24px_24px]" />
          </div>

          <div className="container relative z-10 max-w-6xl mx-auto px-4">
            <motion.div
              initial="hidden"
              animate="visible"
              variants={stagger}
              className="flex flex-col lg:flex-row lg:items-center lg:gap-16 gap-10"
            >
              <div className="flex-1">
                <motion.div
                  variants={fadeUp}
                  className="inline-flex items-center gap-2 mb-6"
                >
                  <span className="h-px w-8 bg-gradient-to-r from-transparent to-[#C2884E]/40 rounded-full" />
                  <span className="px-4 py-1.5 bg-[#C2884E]/5 rounded-full text-sm font-medium text-[#C2884E]">
                    How it works
                  </span>
                  <span className="h-px w-8 bg-gradient-to-l from-transparent to-[#C2884E]/40 rounded-full" />
                </motion.div>
                <motion.h1
                  variants={fadeUp}
                  className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight text-[#3f352b] leading-tight"
                >
                  <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#C2884E] to-[#D1A46C]">
                    Healthy Asian comfort meals,
                  </span>
                  <br />
                  <span className="text-[#6B5F53]">delivered in Toronto.</span>
                </motion.h1>
                <motion.p
                  variants={fadeUp}
                  className="mt-6 text-lg md:text-xl text-[#6B5F53]/90 max-w-xl leading-relaxed"
                >
                  Simple ordering, clear logistics, and dependable delivery for
                  busy weekdays.
                </motion.p>
                <motion.div variants={fadeUp} className="mt-8">
                  <Button
                    asChild
                    size="lg"
                    className="bg-gradient-to-r from-[#C2884E] to-[#D1A46C] hover:opacity-90 text-white shadow-lg shadow-[#C2884E]/20 px-8 py-6 rounded-xl text-base font-medium transition-all hover:scale-[1.02]"
                  >
                    <Link href="/starter" className="flex items-center gap-2">
                      View Menu and Order
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </Button>
                </motion.div>
              </div>
              <motion.div
                variants={fadeIn}
                className="relative w-full lg:w-[380px] aspect-[4/3] rounded-2xl overflow-hidden shadow-xl ring-1 ring-[#C2884E]/10"
              >
                <Image
                  src="/images/_MG_E2616.jpg"
                  alt="Fresh Kapioo meals"
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 380px"
                  priority
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* 3 Steps */}
        <section className="py-16 md:py-24 px-4 bg-white/60">
          <div className="container max-w-6xl mx-auto">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-80px" }}
              variants={stagger}
              className="space-y-16 md:space-y-24"
            >
              {steps.map((step, index) => {
                const Icon = step.icon;
                const isEven = index % 2 === 0;

                return (
                  <motion.article
                    key={step.title}
                    variants={fadeUp}
                    className={`flex flex-col lg:flex-row gap-10 lg:gap-16 items-center ${
                      isEven ? "lg:flex-row" : "lg:flex-row-reverse"
                    }`}
                  >
                    <div
                      className={`flex-1 ${
                        isEven ? "lg:text-left" : "lg:text-right"
                      } text-center lg:text-left`}
                    >
                      <div
                        className={`flex items-center gap-3 mb-4 justify-center ${
                          isEven ? "lg:justify-start" : "lg:justify-end"
                        }`}
                      >
                        <span className="text-5xl font-extralight text-[#C2884E]/20">
                          0{index + 1}
                        </span>
                        <div className="w-px h-10 bg-[#C2884E]/20 rounded-full" />
                      </div>
                      <h2 className="text-2xl md:text-3xl font-semibold text-[#3f352b] mb-3">
                        {step.title}
                      </h2>
                      <p className="text-[#6B5F53] leading-relaxed max-w-lg">
                        {step.description}
                      </p>
                    </div>
                    <div className="flex-shrink-0 flex flex-col items-center gap-4">
                      <div className="relative group">
                        <div className="w-28 h-28 rounded-2xl overflow-hidden shadow-lg ring-1 ring-[#C2884E]/10 group-hover:ring-[#C2884E]/30 transition-all duration-300">
                          <Image
                            src={step.image}
                            alt={step.title}
                            width={112}
                            height={112}
                            className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                        </div>
                        <div className="absolute -bottom-3 -right-3 w-14 h-14 rounded-xl bg-white shadow-lg flex items-center justify-center border border-[#C2884E]/10 group-hover:scale-110 transition-transform">
                          <Icon className="w-7 h-7 text-[#C2884E]" />
                        </div>
                      </div>
                    </div>
                  </motion.article>
                );
              })}
            </motion.div>
            <motion.div
              variants={fadeUp}
              className="flex justify-center mt-12 md:mt-16"
            >
              <Button
                asChild
                size="lg"
                className="bg-gradient-to-r from-[#C2884E] to-[#D1A46C] hover:opacity-90 text-white shadow-lg shadow-[#C2884E]/20 px-8 py-6 rounded-xl text-base font-medium transition-all hover:scale-[1.02]"
              >
                <Link href="/starter" className="flex items-center gap-2">
                  View Menu and Order
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </Button>
            </motion.div>
          </div>
        </section>

        {/* Why Kapioo */}
        <section className="relative py-16 md:py-24 px-4 bg-gradient-to-b from-[#FBF7F2] to-[#FFF6EF]">
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute top-1/2 left-0 w-64 h-64 bg-[#C2884E]/5 rounded-full blur-[60px]" />
            <div className="absolute top-1/2 right-0 w-64 h-64 bg-[#D1A46C]/5 rounded-full blur-[60px]" />
          </div>
          <div className="container max-w-5xl mx-auto relative z-10">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-60px" }}
              variants={stagger}
            >
              <motion.h2
                variants={fadeUp}
                className="text-2xl md:text-3xl font-bold text-[#3f352b] text-center mb-12"
              >
                Why Kapioo
              </motion.h2>
              <div className="grid sm:grid-cols-2 gap-4 md:gap-6">
                {whyKapioo.map((item) => {
                  const Icon = item.icon;
                  return (
                    <motion.div
                      key={item.text}
                      variants={fadeUp}
                      className="flex items-start gap-4 p-5 rounded-2xl bg-white/80 backdrop-blur-sm border border-[#C2884E]/5 shadow-sm hover:shadow-md hover:border-[#C2884E]/15 transition-all duration-300"
                    >
                      <div className="flex-shrink-0 w-11 h-11 rounded-xl bg-gradient-to-br from-[#C2884E]/10 to-[#D1A46C]/10 flex items-center justify-center">
                        <Icon className="w-5 h-5 text-[#C2884E]" />
                      </div>
                      <p className="text-[#6B5F53] font-medium pt-1.5">
                        {item.text}
                      </p>
                    </motion.div>
                  );
                })}
              </div>
              <motion.div
                variants={fadeUp}
                className="flex justify-center mt-12 md:mt-16"
              >
                <Button
                  asChild
                  size="lg"
                  className="bg-gradient-to-r from-[#C2884E] to-[#D1A46C] hover:opacity-90 text-white shadow-lg shadow-[#C2884E]/20 px-8 py-6 rounded-xl text-base font-medium transition-all hover:scale-[1.02]"
                >
                  <Link href="/starter" className="flex items-center gap-2">
                    View Menu and Order
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </Button>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* Delivery logistics */}
        <section className="py-16 md:py-24 px-4 bg-white">
          <div className="container max-w-5xl mx-auto">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-60px" }}
              variants={stagger}
            >
              <motion.h2
                variants={fadeUp}
                className="text-2xl md:text-3xl font-bold text-[#3f352b] text-center mb-10"
              >
                Delivery logistics
              </motion.h2>
              <div className="grid sm:grid-cols-2 gap-4">
                {logistics.map((item) => {
                  const Icon = item.icon;
                  return (
                    <motion.div
                      key={item.label}
                      variants={fadeUp}
                      className="flex gap-4 p-5 rounded-xl border border-[#C2884E]/5 bg-[#FFFBF7] hover:border-[#C2884E]/10 transition-colors"
                    >
                      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-[#C2884E]/5 flex items-center justify-center">
                        <Icon className="w-5 h-5 text-[#C2884E]" />
                      </div>
                      <div>
                        <p className="font-semibold text-[#3f352b]">
                          {item.label}
                        </p>
                        <p className="text-sm text-[#6B5F53] mt-0.5">
                          {item.detail}
                        </p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
              <motion.div
                variants={fadeUp}
                className="flex justify-center mt-12 md:mt-16"
              >
                <Button
                  asChild
                  size="lg"
                  className="bg-gradient-to-r from-[#C2884E] to-[#D1A46C] hover:opacity-90 text-white shadow-lg shadow-[#C2884E]/20 px-8 py-6 rounded-xl text-base font-medium transition-all hover:scale-[1.02]"
                >
                  <Link href="/starter" className="flex items-center gap-2">
                    View Menu and Order
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </Button>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-16 md:py-24 px-4 bg-gradient-to-b from-[#FFF6EF] to-[#FBF7F2]">
          <div className="container max-w-3xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="space-y-8"
            >
              <h2 className="text-2xl md:text-3xl font-bold text-[#3f352b]">
                Ready to get started?
              </h2>
              <div className="flex justify-center">
                <Button
                  asChild
                  size="lg"
                  className="bg-gradient-to-r from-[#C2884E] to-[#D1A46C] hover:opacity-90 text-white shadow-lg shadow-[#C2884E]/20 px-8 py-6 rounded-xl text-base font-medium transition-all hover:scale-[1.02]"
                >
                  <Link href="/starter" className="flex items-center gap-2">
                    View Menu and Order
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </Button>
              </div>
            </motion.div>
          </div>
        </section>
      </main>
    </div>
  );
}
