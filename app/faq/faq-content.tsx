"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { ChevronLeft, ArrowRight, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    question: "Where do you deliver?",
    answer:
      "We deliver across the GTA. Availability depends on the plan you choose and your delivery area.",
  },
  {
    question: "What's the difference between Daily Bento Series and Weekly Meal Box Series?",
    answer: (
      <div className="space-y-4 text-[#6B5F53]">
        <div>
          <p className="font-semibold text-[#3f352b] mb-1.5">Weekly Meal Box — maximum flexibility, still fresh</p>
          <p className="leading-relaxed">
            We deliver twice a week so you can stock your fridge with multiple meals and eat whenever it fits your schedule. Best for unpredictable workdays, gym nights, late dinners, and anyone who wants fewer deliveries but steady coverage.
          </p>
        </div>
        <div>
          <p className="font-semibold text-[#3f352b] mb-1.5">Daily Delivery Bento — fresh on the days you pick</p>
          <p className="leading-relaxed">
            Fresh meals delivered around lunchtime in select areas. Redeem meal credits on the days you want delivery (minimum 2 meals per delivery). Best if you prefer “cooked today” freshness and don’t want to keep a lot in the fridge.
          </p>
        </div>
        <div className="rounded-xl border border-[#C2884E]/15 bg-[#FFFBF7] p-4 mt-4">
          <p className="font-semibold text-[#3f352b] text-sm mb-2">Quick decision guide</p>
          <ul className="space-y-1.5 text-sm leading-relaxed list-none">
            <li><span className="text-[#C2884E] font-medium">“I want meals ready anytime this week”</span> → Weekly Meal Box</li>
            <li><span className="text-[#C2884E] font-medium">“I want fresh delivery on specific days”</span> → Daily Delivery</li>
          </ul>
        </div>
      </div>
    ),
  },
  {
    question: "When is the order cutoff?",
    answer: "The cutoff is 11:59 AM the day before delivery.",
  },
  {
    question: "How long do meals stay fresh?",
    answer: "Keep meals refrigerated. They are best enjoyed within 3 days.",
  },
  {
    question: "Can I choose my meals?",
    answer:
      "Yes. You can pick from the available menu for your selected delivery day.",
  },
  {
    question: "Do you have dietary options?",
    answer:
      "We offer balanced meals and rotating menus. If you have strict allergies or restrictions, please contact us before ordering.",
  },
  {
    question: "How do payments work?",
    answer:
      "We accept e-Transfer only. After you transfer, upload your payment proof at checkout. Our team will review and approve it—once approved, credits appear in your account and you can use them to place orders.",
  },
  {
    question: "Can I pause or skip?",
    answer:
      "Yes. Credits are flexible and you can choose delivery days based on your plan rules.",
  },
  {
    question: "How do I heat the meals?",
    answer:
      "You can reheat by microwave or stovetop. Heating guidance is provided on the container or website.",
  },
  {
    question: "How do I contact support?",
    answer: (
      <>
        Contact us via{" "}
        <a
          href="https://www.instagram.com/kapioomeals/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#C2884E] font-medium underline hover:no-underline"
        >
          Instagram
        </a>{" "}
        or WeChat (kapioomeal06).
      </>
    ),
  },
];

const stagger = {
  visible: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
  hidden: {},
};
const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export function FaqContent() {
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
              href="/how-it-works"
              className="text-sm font-medium text-[#6B5F53] hover:text-[#C2884E] transition-colors"
            >
              How It Works
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
        <section className="relative overflow-hidden bg-gradient-to-b from-[#FFF6EF] via-[#FBF7F2] to-white pb-14 pt-8 md:pt-12">
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
                  <span className="px-4 py-1.5 bg-[#C2884E]/5 rounded-full text-sm font-medium text-[#C2884E] flex items-center gap-2">
                    <HelpCircle className="w-4 h-4" />
                    FAQ
                  </span>
                  <span className="h-px w-8 bg-gradient-to-l from-transparent to-[#C2884E]/40 rounded-full" />
                </motion.div>
                <motion.h1
                  variants={fadeUp}
                  className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight text-[#3f352b] leading-tight"
                >
                  <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#C2884E] to-[#D1A46C]">
                    Frequently asked
                  </span>
                  <br />
                  <span className="text-[#6B5F53]">questions</span>
                </motion.h1>
                <motion.p
                  variants={fadeUp}
                  className="mt-6 text-lg md:text-xl text-[#6B5F53]/90 max-w-xl leading-relaxed"
                >
                  Everything you need to know before ordering with Kapioo.
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
                variants={fadeUp}
                className="relative w-full lg:w-[320px] aspect-square rounded-2xl overflow-hidden shadow-xl ring-1 ring-[#C2884E]/10 flex-shrink-0"
              >
                <Image
                  src="/foodjpg/Kapioo%20product%20picture%20%231.jpeg"
                  alt="Fresh Kapioo meals"
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 320px"
                  priority
                />
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* FAQ Accordion */}
        <section className="py-16 md:py-24 px-4 bg-white/60">
          <div className="container max-w-3xl mx-auto">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-60px" }}
              variants={stagger}
            >
              <Accordion type="single" collapsible className="space-y-4">
                {faqs.map((item, index) => (
                  <motion.div key={item.question} variants={fadeUp}>
                    <AccordionItem
                      value={`item-${index}`}
                      className="rounded-2xl border border-[#C2884E]/10 !border-b-[#C2884E]/10 bg-white px-5 py-1 shadow-sm hover:shadow-md hover:border-[#C2884E]/15 transition-all duration-300 data-[state=open]:border-[#C2884E]/20 data-[state=open]:shadow-md"
                    >
                      <AccordionTrigger className="py-5 text-left text-base md:text-lg font-semibold text-[#3f352b] hover:no-underline [&[data-state=open]]:text-[#C2884E]">
                        {item.question}
                      </AccordionTrigger>
                      <AccordionContent className="text-[#6B5F53] leading-relaxed pb-5 pt-0">
                        {item.answer}
                      </AccordionContent>
                    </AccordionItem>
                    {index === 4 && (
                      <motion.div
                        key="cta-mid"
                        variants={fadeUp}
                        className="flex justify-center py-10"
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
                    )}
                  </motion.div>
                ))}
              </Accordion>
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
