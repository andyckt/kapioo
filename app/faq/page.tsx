import type { Metadata } from "next";
import Link from "next/link";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "FAQ | Kapioo Toronto Meal Delivery",
  description:
    "Frequently asked questions about Kapioo delivery areas, cutoff times, freshness, meal selection, dietary notes, and support.",
  path: "/faq",
});

const faqs = [
  {
    question: "Where do you deliver?",
    answer: "We deliver across the GTA. Availability depends on the plan you choose and your delivery area.",
  },
  {
    question: "What’s the difference between Daily Delivery and Weekly Meal Box?",
    answer:
      "Daily Delivery is weekday lunch delivery and is available in selected areas. Weekly Meal Box is bulk meal delivery twice a week with wider coverage.",
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
    answer: "Yes. You can pick from the available menu for your selected delivery day.",
  },
  {
    question: "Do you have dietary options?",
    answer:
      "We offer balanced meals and rotating menus. If you have strict allergies or restrictions, please contact us before ordering.",
  },
  {
    question: "How do payments work?",
    answer: "You can purchase meal credits or a weekly plan, depending on the product you choose.",
  },
  {
    question: "Can I pause or skip?",
    answer: "Yes. Credits are flexible and you can choose delivery days based on your plan rules.",
  },
  {
    question: "How do I heat the meals?",
    answer: "You can reheat by microwave or stovetop. Heating guidance is provided on the container or website.",
  },
  {
    question: "How do I contact support?",
    answer: "Please DM us on Instagram or email support@kapioo.com.",
  },
];

export default function FaqPage() {
  return (
    <main className="min-h-screen bg-[#fffaf5]">
      <section className="container max-w-4xl px-4 py-14 md:py-20">
        <div className="max-w-3xl">
          <h1 className="text-3xl font-bold tracking-tight text-[#3f352b] md:text-5xl">
            Frequently asked questions
          </h1>
          <p className="mt-4 text-base text-[#6b5f53] md:text-lg">
            Everything you need to know before ordering with Kapioo.
          </p>
        </div>

        <div className="mt-10 space-y-4">
          {faqs.map((item) => (
            <article key={item.question} className="rounded-xl border bg-white p-5 shadow-sm md:p-6">
              <h2 className="text-lg font-semibold text-[#3f352b]">{item.question}</h2>
              <p className="mt-2 text-sm leading-6 text-[#6b5f53] md:text-base">{item.answer}</p>
            </article>
          ))}
        </div>

        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/weekly-meal"
            className="inline-flex items-center justify-center rounded-lg bg-[#c2884e] px-5 py-3 text-sm font-medium text-white transition hover:bg-[#ad7440]"
          >
            View Weekly Meal Box
          </Link>
          <Link
            href="/daily-delivery"
            className="inline-flex items-center justify-center rounded-lg border border-[#c2884e] px-5 py-3 text-sm font-medium text-[#6b5f53] transition hover:bg-[#fff0e0]"
          >
            View Daily Delivery
          </Link>
        </div>
      </section>
    </main>
  );
}
