"use client";

import Link from "next/link";
import Image from "next/image";
import {
  ChevronLeft,
  CreditCard,
  UtensilsCrossed,
  Truck,
  Flame,
  Leaf,
  Clock,
  RefreshCw,
  ThermometerSun,
  Microwave,
  ArrowRight,
  MapPin,
  Globe,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DAILY_DELIVERY_AREAS, WEEKLY_ONLY_AREAS } from "@/lib/constants/areas";
import { useLanguage } from "@/lib/language-context";
import { ScrollReveal } from "@/components/scroll-reveal";
import {
  productLineChooseSeriesSentenceEn,
  productLineChooseSeriesSentenceZh,
  productLineSeriesName,
} from "@/lib/product-lines/names";

const STEP_IMAGES = [
  "/foodjpg/Ordering%20Kapioo%20meals%20on%20website.jpeg",
  "/foodjpg/Kapioo%20Meals%20in%20fridge.jpeg",
  "/foodjpg/Kapioo%20Chef.jpg.jpeg",
] as const;

const whyKapioo = [
  {
    title: "Fresh cooked meals",
    text: "Not frozen—made fresh and delivered.",
    icon: Flame,
  },
  {
    title: "Asian comfort flavors",
    text: "Balanced portions you’ll look forward to.",
    icon: Leaf,
  },
  {
    title: "Flexible Meal Credit Model",
    text: "Top up meal credits, order when you want.",
    icon: RefreshCw,
  },
  {
    title: "Reliable delivery",
    text: "Always on time, every time.",
    icon: Clock,
  },
];

const logistics = [
  {
    label: "Delivery windows",
    detail: "Daily Bento Series: 11am to 1pm (Monday to Friday & Sunday, Saturday off)\nWeekly Meal Box Series: 6pm to 10pm (Tuesday and Sunday)",
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


export function HowItWorksContent() {
  const { language, setLanguage } = useLanguage();
  const isZh = language === "zh";

  const steps = [
    {
      title: isZh ? "选择计划" : "Choose your plan",
      description: isZh ? productLineChooseSeriesSentenceZh() : productLineChooseSeriesSentenceEn(),
      icon: CreditCard,
      image: STEP_IMAGES[0],
      aspect: "3/4" as const,
    },
    {
      title: isZh ? "选择餐品" : "Pick your meals",
      description: isZh
        ? "从我们不断更新的菜单中挑选——常换常新，四季都吃不腻。"
        : "Choose from our never-repeat rotating menu—always fresh and exciting. We'll be here for you through every season of life, with meals you'll never get tired of.",
      icon: UtensilsCrossed,
      image: STEP_IMAGES[1],
      aspect: "3/4" as const,
    },
    {
      title: isZh ? "烹饪与配送" : "We cook & deliver",
      description: isZh
        ? "新鲜现做，在配送时段送抵您家。"
        : "Freshly cooked meals are delivered to your door during the delivery window.",
      icon: Truck,
      image: STEP_IMAGES[2],
      aspect: "3/4" as const,
    },
  ];

  const whyKapioo = [
    { title: isZh ? "新鲜现做" : "Fresh cooked meals", text: isZh ? "非冷冻，当日现做、当日配送。" : "Not frozen—made fresh and delivered.", icon: Flame },
    { title: isZh ? "亚洲风味" : "Asian comfort flavors", text: isZh ? "均衡份量，吃得满足。" : "Balanced portions you'll look forward to.", icon: Leaf },
    { title: isZh ? "灵活餐券制" : "Flexible Meal Credit Model", text: isZh ? "先充值餐券，想订再订。" : "Top up meal credits, order when you want.", icon: RefreshCw },
    { title: isZh ? "准时配送" : "Reliable delivery", text: isZh ? "准时送达，次次如此。" : "Always on time, every time.", icon: Clock },
  ];

  const logistics = [
    { label: isZh ? "配送时段" : "Delivery windows", detail: "", icon: Truck, isDeliveryWindows: true },
    { label: isZh ? "下单截止" : "Order cutoff", detail: isZh ? "配送日前一天上午 11:59。" : "11:59 AM the day before delivery.", icon: Clock, isDeliveryWindows: false },
    { label: isZh ? "保鲜与储存" : "Freshness & storage", detail: isZh ? "冷藏保存，建议 3 天内食用。" : "Keep refrigerated. Best enjoyed within 3 days.", icon: ThermometerSun, isDeliveryWindows: false },
    { label: isZh ? "加热方式" : "Reheating", detail: isZh ? "微波或明火加热，包装上有说明。" : "Microwave or stovetop. Instructions on each container.", icon: Microwave, isDeliveryWindows: false },
  ];

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
              <span className="hidden sm:inline">{isZh ? "返回" : "Back"}</span>
            </Link>
          </Button>
          <nav className="flex items-center gap-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="text-[#6B5F53] hover:text-[#C2884E]">
                  <Globe className="h-5 w-5" />
                  <span className="sr-only">{isZh ? "切换语言" : "Switch language"}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setLanguage("zh")} className={language === "zh" ? "bg-accent font-medium" : ""}>
                  中文
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLanguage("en")} className={language === "en" ? "bg-accent font-medium" : ""}>
                  English
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Link href="/faq" className="text-sm font-medium text-[#6B5F53] hover:text-[#C2884E] transition-colors">
              FAQ
            </Link>
            <Link
              href="/starter"
              className="text-sm font-medium text-white bg-gradient-to-r from-[#C2884E] to-[#D1A46C] hover:opacity-90 px-4 py-2 rounded-full transition-all"
            >
              {isZh ? "立即开始" : "Get Started"}
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden bg-gradient-to-b from-[#FFF6EF] via-[#FBF7F2] to-white pb-16 pt-8 md:pt-12">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-20 right-0 w-[500px] h-[500px] bg-gradient-to-bl from-[#C2884E]/10 to-transparent rounded-full blur-2xl" />
            <div className="absolute bottom-20 left-0 w-[400px] h-[400px] bg-gradient-to-tr from-[#D1A46C]/8 to-transparent rounded-full blur-xl" />
            <div className="absolute inset-0 opacity-[0.02] bg-[radial-gradient(#C2884E_1px,transparent_1px)] [background-size:24px_24px]" />
          </div>

          <div className="container relative z-10 max-w-6xl mx-auto px-4">
            <ScrollReveal rootMargin="0px 0px -20px 0px">
              <div className="flex flex-col lg:flex-row lg:items-center lg:gap-16 gap-10">
                <div className="flex-1 reveal-item">
                  <div className="inline-flex items-center gap-2 mb-6">
                  <span className="h-px w-8 bg-gradient-to-r from-transparent to-[#C2884E]/40 rounded-full" />
                  <span className="px-4 py-1.5 bg-[#C2884E]/5 rounded-full text-sm font-medium text-[#C2884E]">
                    {isZh ? "如何运作" : "How it works"}
                  </span>
                  <span className="h-px w-8 bg-gradient-to-l from-transparent to-[#C2884E]/40 rounded-full" />
                </div>
                <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight text-[#3f352b] leading-tight">
                  <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#C2884E] to-[#D1A46C]">
                    {isZh ? "亚洲轻养 comfort 餐，" : "Asian wellness comfort meals,"}
                  </span>
                  <br />
                  <span className="text-[#6B5F53]">{isZh ? "多伦多配送到家。" : "delivered in Toronto."}</span>
                </h1>
                <p className="mt-6 text-lg md:text-xl text-[#6B5F53]/90 max-w-xl leading-relaxed">
                  {isZh ? "点几下，一周的餐就搞定，省心省力。" : "A few taps, your week of meals is handled. No hassle added."}
                </p>
                <div className="mt-8">
                  <Button
                    asChild
                    size="lg"
                    className="bg-gradient-to-r from-[#C2884E] to-[#D1A46C] hover:opacity-90 text-white shadow-lg shadow-[#C2884E]/20 px-8 py-6 rounded-xl text-base font-medium transition-all hover:scale-[1.02]"
                  >
                    <Link href="/starter" className="flex items-center gap-2">
                      {isZh ? "查看菜单并下单" : "View Menu and Order"}
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </Button>
                </div>
              </div>
                <div className="relative w-full lg:w-[280px] aspect-[3/4] rounded-2xl overflow-hidden shadow-xl ring-1 ring-[#C2884E]/10 reveal-item reveal-item-delay-2">
                  <Image
                    src="/foodjpg/Kapioo%20daily%20meals%20product%20picture%20%232.JPG"
                    alt="Fresh Kapioo meals"
                    fill
                    className="object-cover"
                    sizes="(max-width: 1024px) 100vw, 280px"
                    priority
                  />
                </div>
              </div>
            </ScrollReveal>
          </div>
        </section>

        {/* 3 Steps */}
        <section className="py-16 md:py-24 px-4 bg-white/60">
          <div className="container max-w-6xl mx-auto">
            <ScrollReveal rootMargin="0px 0px -60px 0px">
              <div className="space-y-16 md:space-y-24">
                {steps.map((step, index) => {
                  const Icon = step.icon;
                  const isEven = index % 2 === 0;

                  return (
                    <article
                      key={`${step.title}-${index}`}
                      className={`flex flex-col lg:flex-row gap-10 lg:gap-16 items-center reveal-item ${
                        isEven ? "lg:flex-row" : "lg:flex-row-reverse"
                      }`}
                      style={{ transitionDelay: `${(index + 1) * 0.1}s` } as React.CSSProperties}
                    >
                    <div
                      className={`flex-1 text-center ${
                        isEven
                          ? "lg:text-left"
                          : "lg:text-right lg:pl-12"
                      }`}
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
                      <p
                        className={`text-[#6B5F53] leading-relaxed max-w-lg ${
                          !isEven ? "lg:ml-auto" : ""
                        }`}
                      >
                        {step.description}
                      </p>
                    </div>
                    <div className="flex-shrink-0 flex flex-col items-center gap-4">
                      <div className="relative group">
                        <div className={`relative rounded-2xl overflow-hidden shadow-lg ring-1 ring-[#C2884E]/10 group-hover:ring-[#C2884E]/30 transition-[transform,box-shadow] duration-300 ${
                          "aspect" in step && step.aspect === "3/4"
                            ? "w-32 aspect-[3/4]"
                            : "w-28 h-28"
                        }`}>
                          <Image
                            src={step.image}
                            alt={step.title}
                            fill
                            sizes="128px"
                            className="object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                        </div>
                        <div className="absolute -bottom-3 -right-3 w-14 h-14 rounded-xl bg-white shadow-lg flex items-center justify-center border border-[#C2884E]/10 group-hover:scale-110 transition-transform">
                          <Icon className="w-7 h-7 text-[#C2884E]" />
                        </div>
                      </div>
                    </div>
                    </article>
                  );
                })}
              </div>
              <div className="flex justify-center mt-12 md:mt-16 reveal-item reveal-item-delay-4">
              <Button
                asChild
                size="lg"
                className="bg-gradient-to-r from-[#C2884E] to-[#D1A46C] hover:opacity-90 text-white shadow-lg shadow-[#C2884E]/20 px-8 py-6 rounded-xl text-base font-medium transition-all hover:scale-[1.02]"
              >
                <Link href="/starter" className="flex items-center gap-2">
                  {isZh ? "查看菜单并下单" : "View Menu and Order"}
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </Button>
              </div>
            </ScrollReveal>
          </div>
        </section>

        {/* Why Kapioo */}
        <section className="relative py-16 md:py-24 px-4 bg-gradient-to-b from-[#FBF7F2] to-[#FFF6EF]">
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute top-1/2 left-0 w-64 h-64 bg-[#C2884E]/5 rounded-full blur-xl" />
            <div className="absolute top-1/2 right-0 w-64 h-64 bg-[#D1A46C]/5 rounded-full blur-xl" />
          </div>
          <div className="container max-w-5xl mx-auto relative z-10">
            <ScrollReveal rootMargin="0px 0px -60px 0px">
              <h2 className="text-2xl md:text-3xl font-bold text-[#3f352b] text-center mb-12 reveal-item">
                {isZh ? "为什么选 Kapioo" : "Why Kapioo"}
              </h2>
              <div className="grid sm:grid-cols-2 gap-4 md:gap-6">
                {whyKapioo.map((item, index) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.title}
                      className="flex items-start gap-4 p-5 md:p-6 rounded-2xl bg-white/80 backdrop-blur-sm border border-[#C2884E]/5 shadow-sm reveal-item transition-[transform,border-color] duration-300 hover:-translate-y-1 hover:border-[#C2884E]/15"
                      style={{ transitionDelay: `${(index + 1) * 0.08}s` } as React.CSSProperties}
                    >
                      <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-[#C2884E]/10 to-[#D1A46C]/10 flex items-center justify-center">
                        <Icon className="w-6 h-6 text-[#C2884E]" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-[#3f352b]">
                          {item.title}
                        </p>
                        <p className="text-sm text-[#6B5F53] mt-1 leading-relaxed">
                          {item.text}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-center mt-12 md:mt-16 reveal-item reveal-item-delay-4">
                <Button
                  asChild
                  size="lg"
                  className="bg-gradient-to-r from-[#C2884E] to-[#D1A46C] hover:opacity-90 text-white shadow-lg shadow-[#C2884E]/20 px-8 py-6 rounded-xl text-base font-medium transition-all hover:scale-[1.02]"
                >
                  <Link href="/starter" className="flex items-center gap-2">
                    {isZh ? "查看菜单并下单" : "View Menu and Order"}
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </Button>
              </div>
            </ScrollReveal>
          </div>
        </section>

        {/* Delivery logistics */}
        <section className="py-16 md:py-24 px-4 bg-white">
          <div className="container max-w-5xl mx-auto">
            <ScrollReveal rootMargin="0px 0px -60px 0px">
              <h2 className="text-2xl md:text-3xl font-bold text-[#3f352b] text-center mb-10 reveal-item">
                {isZh ? "配送说明" : "Delivery logistics"}
              </h2>
              <div className="grid sm:grid-cols-2 gap-4">
                {logistics.map((item, index) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.label}
                      className="flex gap-4 p-5 rounded-xl border border-[#C2884E]/5 bg-[#FFFBF7] reveal-item transition-colors duration-300 hover:border-[#C2884E]/10"
                      style={{ transitionDelay: `${(index + 1) * 0.06}s` } as React.CSSProperties}
                    >
                      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-[#C2884E]/5 flex items-center justify-center">
                        <Icon className="w-5 h-5 text-[#C2884E]" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-[#3f352b]">
                          {item.label}
                        </p>
                        {"isDeliveryWindows" in item && item.isDeliveryWindows ? (
                          <div className="mt-3 space-y-3">
                            <div>
                              <p className="text-sm font-medium text-[#3f352b]">
                                {productLineSeriesName("daily", isZh ? "zh" : "en")}
                              </p>
                              <p className="text-sm text-[#6B5F53] mt-0.5">
                                {isZh ? "11:00–13:00 · 周一至周五和周日（周六休息）" : "11am – 1pm · Monday – Friday & Sunday (Saturday off)"}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-[#3f352b]">
                                {productLineSeriesName("weekly", isZh ? "zh" : "en")}
                              </p>
                              <p className="text-sm text-[#6B5F53] mt-0.5">
                                {isZh ? "18:00–22:00 · 周二与周日" : "6pm – 10pm · Tuesday & Sunday"}
                              </p>
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm text-[#6B5F53] mt-0.5 whitespace-pre-line">
                            {item.detail}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-8 md:mt-10 reveal-item reveal-item-delay-3">
                <div className="rounded-2xl border border-[#C2884E]/10 bg-[#FFFBF7] overflow-hidden">
                  <div className="flex items-start gap-3 p-5 pb-0">
                    <div className="w-10 h-10 rounded-lg bg-[#C2884E]/10 flex items-center justify-center flex-shrink-0">
                      <MapPin className="w-5 h-5 text-[#C2884E]" />
                    </div>
                    <div>
                      <h3 className="text-lg md:text-xl font-semibold text-[#3f352b]">
                        {isZh ? "配送范围" : "Where we deliver"}
                      </h3>
                      <p className="text-sm text-[#6B5F53] mt-1">
                        {isZh ? "我们服务大多伦多地区。选择计划后即可查看您地址是否在配送范围内。" : "We serve the GTA. Choose your plan and we'll show availability for your address."}
                      </p>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-0 md:gap-6 p-5 pt-6">
                    {/* Daily Bento Series — both services */}
                    <div className="rounded-xl border border-[#C2884E]/15 bg-white p-5 md:p-6 shadow-sm">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#C2884E] flex-shrink-0" aria-hidden />
                        <h4 className="text-base font-semibold text-[#3f352b]">
                          {isZh
                            ? `${productLineSeriesName("daily", "zh")} + ${productLineSeriesName("weekly", "zh")}`
                            : `${productLineSeriesName("daily", "en")} + ${productLineSeriesName("weekly", "en")}`}
                        </h4>
                      </div>
                      <ul className="space-y-2 mt-4" role="list">
                        {DAILY_DELIVERY_AREAS.map((area) => (
                          <li
                            key={area}
                            className="flex items-center gap-2 text-[#6B5F53] text-sm"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-[#C2884E]/60 flex-shrink-0" aria-hidden />
                            {area}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Weekly Meal Box Series only */}
                    <div className="rounded-xl border border-[#C2884E]/10 bg-white/80 p-5 md:p-6 mt-4 md:mt-0 shadow-sm">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#A58D74] flex-shrink-0" aria-hidden />
                        <h4 className="text-base font-semibold text-[#3f352b]">
                          {isZh ? `仅${productLineSeriesName("weekly", "zh")}` : `${productLineSeriesName("weekly", "en")} (Only)`}
                        </h4>
                      </div>
                      <ul className="space-y-2 mt-4" role="list">
                        {WEEKLY_ONLY_AREAS.map((area) => (
                          <li
                            key={area}
                            className="flex items-center gap-2 text-[#6B5F53] text-sm"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-[#A58D74]/60 flex-shrink-0" aria-hidden />
                            {area}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <p className="text-xs text-[#8A7968] px-5 pb-5 pt-2">
                    {isZh ? "不确定自己属于哪种计划？" : "Not sure which plan you're in?"} <Link href="/starter" className="text-[#C2884E] font-medium hover:underline">{isZh ? "查看菜单并下单" : "View menu and order"}</Link> — {isZh ? "我们会根据您的地址显示可选方案。" : "we'll show options for your location."}
                  </p>
                </div>
              </div>
              <div className="flex justify-center mt-12 md:mt-16 reveal-item reveal-item-delay-4">
                <Button
                  asChild
                  size="lg"
                  className="bg-gradient-to-r from-[#C2884E] to-[#D1A46C] hover:opacity-90 text-white shadow-lg shadow-[#C2884E]/20 px-8 py-6 rounded-xl text-base font-medium transition-all hover:scale-[1.02]"
                >
                  <Link href="/starter" className="flex items-center gap-2">
                    {isZh ? "查看菜单并下单" : "View Menu and Order"}
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </Button>
              </div>
            </ScrollReveal>
          </div>
        </section>

        {/* CTA */}
        <section className="py-16 md:py-24 px-4 bg-gradient-to-b from-[#FFF6EF] to-[#FBF7F2]">
          <div className="container max-w-3xl mx-auto text-center">
            <ScrollReveal rootMargin="0px 0px -80px 0px">
              <div className="space-y-8">
                <h2 className="text-2xl md:text-3xl font-bold text-[#3f352b] reveal-item">
                  {isZh ? "准备好开始了吗？" : "Ready to get started?"}
                </h2>
                <div className="flex justify-center reveal-item reveal-item-delay-2">
                <Button
                  asChild
                  size="lg"
                  className="bg-gradient-to-r from-[#C2884E] to-[#D1A46C] hover:opacity-90 text-white shadow-lg shadow-[#C2884E]/20 px-8 py-6 rounded-xl text-base font-medium transition-all hover:scale-[1.02]"
                >
                  <Link href="/starter" className="flex items-center gap-2">
                    {isZh ? "查看菜单并下单" : "View Menu and Order"}
                    <ArrowRight className="w-4 h-4" />
                </Link>
              </Button>
                </div>
              </div>
            </ScrollReveal>
          </div>
        </section>
      </main>
    </div>
  );
}
