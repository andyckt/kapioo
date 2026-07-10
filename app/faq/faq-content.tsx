"use client";

import Link from "next/link";
import Image from "next/image";
import { ChevronLeft, ArrowRight, HelpCircle, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useLanguage } from "@/lib/language-context";
import { ScrollReveal } from "@/components/scroll-reveal";
import { PRODUCT_LINE_LABELS, productLineSeriesName } from "@/lib/product-lines/names";
import { formatDailyCoverageList, formatWeeklyOnlyCoverageList } from "@/lib/zones/coverage-copy";

function getFaqs(isZh: boolean) {
  const contactAnswer = (
    <>
      {isZh ? "通过 " : "Contact us via "}
      <a
        href="https://www.instagram.com/kapioomeals/"
        target="_blank"
        rel="noopener noreferrer"
        className="text-[#C2884E] font-medium underline hover:no-underline"
      >
        Instagram
      </a>
      {isZh ? " 或微信 (kapioomeal06) 联系我们。" : " or WeChat (kapioomeal06)."}
    </>
  );

  const differenceAnswer = (
    <div className="space-y-4 text-[#6B5F53]">
      <div>
        <p className="font-semibold text-[#3f352b] mb-1.5">
          {isZh ? `${PRODUCT_LINE_LABELS.weekly.zh} — 灵活省心，一样新鲜` : `${PRODUCT_LINE_LABELS.weekly.en} — maximum flexibility, still fresh`}
        </p>
        <p className="leading-relaxed">
          {isZh
            ? "每周配送两次，冰箱囤好一周的餐，想什么时候吃就什么时候吃。适合工作不定时、健身日晚餐、夜宵党，以及希望少收几次货但不断粮的你。"
            : "We deliver twice a week so you can stock your fridge with multiple meals and eat whenever it fits your schedule. Best for unpredictable workdays, gym nights, late dinners, and anyone who wants fewer deliveries but steady coverage."}
        </p>
      </div>
      <div>
        <p className="font-semibold text-[#3f352b] mb-1.5">
          {isZh ? `${PRODUCT_LINE_LABELS.daily.zh} — 指定日期，当日新鲜送达` : `${PRODUCT_LINE_LABELS.daily.en} — fresh on the days you pick`}
        </p>
        <p className="leading-relaxed">
          {isZh
            ? "选定区域午间送达。在您想要配送的日期用餐券兑换（每次至少 2 份）。适合想要「当天现做」新鲜度、不想在冰箱囤太多的人。"
            : "Fresh meals delivered around lunchtime in select areas. Redeem meal credits on the days you want delivery (minimum 2 meals per delivery). Best if you prefer \"cooked today\" freshness and don't want to keep a lot in the fridge."}
        </p>
      </div>
      <div className="rounded-xl border border-[#C2884E]/15 bg-[#FFFBF7] p-4 mt-4">
        <p className="font-semibold text-[#3f352b] text-sm mb-2">
          {isZh ? "快速选择" : "Quick decision guide"}
        </p>
        <ul className="space-y-1.5 text-sm leading-relaxed list-none">
          <li>
            <span className="text-[#C2884E] font-medium">
              {isZh ? "「我这周随时想吃就有」" : "\"I want meals ready anytime this week\""}
            </span> → {productLineSeriesName("weekly", isZh ? "zh" : "en")}
          </li>
          <li>
            <span className="text-[#C2884E] font-medium">
              {isZh ? "「我要指定某几天送新鲜」" : "\"I want fresh delivery on specific days\""}
            </span> → {productLineSeriesName("daily", isZh ? "zh" : "en")}
          </li>
        </ul>
      </div>
    </div>
  );

  return [
    {
      question: isZh ? "你们配送哪些区域？" : "Where do you deliver?",
      answer: isZh
        ? `每日配送 (${PRODUCT_LINE_LABELS.daily.zh}) 目前覆盖：${formatDailyCoverageList("zh")}。周次配送 (${PRODUCT_LINE_LABELS.weekly.zh}) 另额外服务：${formatWeeklyOnlyCoverageList("zh")}。输入您的详细地址即可确认是否可达。`
        : `Daily delivery (${PRODUCT_LINE_LABELS.daily.en}) is available in: ${formatDailyCoverageList("en")}. Weekly meal box (${PRODUCT_LINE_LABELS.weekly.en}) also covers: ${formatWeeklyOnlyCoverageList("en")}. Enter your exact address to confirm coverage.`,
    },
    {
      question: isZh
        ? `${productLineSeriesName("daily", "zh")}和${productLineSeriesName("weekly", "zh")}有什么区别？`
        : "What's the difference between Daily Bento Series and Weekly Meal Box Series?",
      answer: differenceAnswer,
    },
    {
      question: isZh ? "下单截止时间是几点？" : "When is the order cutoff?",
      answer: isZh ? "配送日前一天上午 11:59 截止。" : "The cutoff is 11:59 AM the day before delivery.",
    },
    {
      question: isZh ? "餐食可以保存多久？" : "How long do meals stay fresh?",
      answer: isZh ? "请冷藏保存，建议 3 天内食用。" : "Keep meals refrigerated. They are best enjoyed within 3 days.",
    },
    {
      question: isZh ? "可以自选餐品吗？" : "Can I choose my meals?",
      answer: isZh
        ? "可以。您可以在所选配送日的可选菜单中挑选。"
        : "Yes. You can pick from the available menu for your selected delivery day.",
    },
    {
      question: isZh ? "有忌口或特殊饮食选项吗？" : "Do you have dietary options?",
      answer: isZh
        ? "我们提供均衡餐品与轮换菜单。如有严重过敏或饮食限制，请在下单前联系我们。"
        : "We offer balanced meals and rotating menus. If you have strict allergies or restrictions, please contact us before ordering.",
    },
    {
      question: isZh ? "付款方式是什么？" : "How do payments work?",
      answer: isZh
        ? "我们目前仅支持 e-Transfer。您转账后，在结账页面上传付款凭证。我们会审核通过后把餐券充入您的账户，即可用餐券下单。"
        : "We accept e-Transfer only. After you transfer, upload your payment proof at checkout. Our team will review and approve it—once approved, credits appear in your account and you can use them to place orders.",
    },
    {
      question: isZh ? "可以暂停或跳过配送吗？" : "Can I pause or skip?",
      answer: isZh
        ? "可以。餐券灵活使用，您可根据计划规则选择配送日。"
        : "Yes. Credits are flexible and you can choose delivery days based on your plan rules.",
    },
    {
      question: isZh ? "如何加热餐食？" : "How do I heat the meals?",
      answer: isZh
        ? "微波或明火加热均可，包装或网站上有说明。"
        : "You can reheat by microwave or stovetop. Heating guidance is provided on the container or website.",
    },
    {
      question: isZh ? "如何联系客服？" : "How do I contact support?",
      answer: contactAnswer,
    },
  ];
}


export function FaqContent() {
  const { language, setLanguage } = useLanguage();
  const isZh = language === "zh";
  const faqs = getFaqs(isZh);

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
            <Link href="/how-it-works" className="text-sm font-medium text-[#6B5F53] hover:text-[#C2884E] transition-colors">
              {isZh ? "如何运作" : "How It Works"}
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
        <section className="relative overflow-hidden bg-gradient-to-b from-[#FFF6EF] via-[#FBF7F2] to-white pb-14 pt-8 md:pt-12">
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
                  <span className="px-4 py-1.5 bg-[#C2884E]/5 rounded-full text-sm font-medium text-[#C2884E] flex items-center gap-2">
                    <HelpCircle className="w-4 h-4" />
                    FAQ
                  </span>
                  <span className="h-px w-8 bg-gradient-to-l from-transparent to-[#C2884E]/40 rounded-full" />
                </div>
                <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight text-[#3f352b] leading-tight">
                  <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#C2884E] to-[#D1A46C]">
                    {isZh ? "常见问题" : "Frequently asked questions"}
                  </span>
                </h1>
                <p className="mt-6 text-lg md:text-xl text-[#6B5F53]/90 max-w-xl leading-relaxed">
                  {isZh ? "下单前您需要了解的一切。" : "Everything you need to know before ordering with Kapioo."}
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
                <div className="relative w-full lg:w-[320px] aspect-square rounded-2xl overflow-hidden shadow-xl ring-1 ring-[#C2884E]/10 flex-shrink-0 reveal-item reveal-item-delay-2">
                  <Image
                    src="/foodjpg/Kapioo%20product%20picture%20holding%20meals.jpeg"
                    alt="Fresh Kapioo meals"
                    fill
                    className="object-cover"
                    sizes="(max-width: 1024px) 100vw, 320px"
                    priority
                  />
                </div>
              </div>
            </ScrollReveal>
          </div>
        </section>

        {/* FAQ Accordion */}
        <section className="py-16 md:py-24 px-4 bg-white/60">
          <div className="container max-w-3xl mx-auto">
            <ScrollReveal rootMargin="0px 0px -60px 0px">
              <Accordion type="single" collapsible className="space-y-4">
                {faqs.map((item, index) => (
                  <div key={item.question} className="reveal-item" style={{ transitionDelay: `${index * 0.05}s` } as React.CSSProperties}>
                    <AccordionItem
                      value={`item-${index}`}
                      className="rounded-2xl border border-[#C2884E]/10 !border-b-[#C2884E]/10 bg-white px-5 py-1 shadow-sm transition-[transform,border-color] duration-300 hover:-translate-y-0.5 hover:border-[#C2884E]/15 data-[state=open]:border-[#C2884E]/20 data-[state=open]:shadow-md"
                    >
                      <AccordionTrigger className="py-5 text-left text-base md:text-lg font-semibold text-[#3f352b] hover:no-underline [&[data-state=open]]:text-[#C2884E]">
                        {item.question}
                      </AccordionTrigger>
                      <AccordionContent className="text-[#6B5F53] leading-relaxed pb-5 pt-0">
                        {item.answer}
                      </AccordionContent>
                    </AccordionItem>
                    {index === 4 && (
                      <div key="cta-mid" className="flex justify-center py-10 reveal-item reveal-item-delay-3">
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
                    )}
                  </div>
                ))}
              </Accordion>
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
