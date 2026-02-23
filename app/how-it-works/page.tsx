import type { Metadata } from "next";
import Link from "next/link";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "How Kapioo Works | Toronto Meal Delivery",
  description:
    "See how Kapioo works in 3 simple steps. Choose your plan, pick meals, and get healthy Asian comfort meals delivered across Toronto and the GTA.",
  path: "/how-it-works",
});

const steps = [
  {
    title: "Choose your plan",
    description: "Pick Daily Delivery or Weekly Meal Box depending on your schedule.",
  },
  {
    title: "Pick your meals",
    description: "Select Combo A or B from rotating menus. Cutoff is 11:59 AM the day before delivery.",
  },
  {
    title: "We cook & deliver",
    description: "Freshly cooked meals are delivered to your door during the delivery window.",
  },
];

const whyKapioo = [
  "Fresh cooked meals (not frozen)",
  "Asian comfort flavors with balanced portions",
  "Reliable delivery with clear cutoff times",
  "Easy reordering with credits or plans",
];

export default function HowItWorksPage() {
  return (
    <main className="min-h-screen bg-[#fffaf5]">
      <section className="container max-w-5xl px-4 py-14 md:py-20">
        <div className="max-w-3xl">
          <h1 className="text-3xl font-bold tracking-tight text-[#3f352b] md:text-5xl">
            Healthy Asian comfort meals, delivered in Toronto.
          </h1>
          <p className="mt-4 text-base text-[#6b5f53] md:text-lg">
            Simple ordering, clear logistics, and dependable delivery for busy weekdays.
          </p>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {steps.map((step, index) => (
            <article key={step.title} className="rounded-xl border bg-white p-6 shadow-sm">
              <p className="text-sm font-semibold text-[#c2884e]">Step {index + 1}</p>
              <h2 className="mt-2 text-xl font-semibold text-[#3f352b]">{step.title}</h2>
              <p className="mt-3 text-sm leading-6 text-[#6b5f53]">{step.description}</p>
            </article>
          ))}
        </div>

        <section className="mt-12 rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-semibold text-[#3f352b]">Why Kapioo</h2>
          <ul className="mt-4 list-disc space-y-2 pl-5 text-[#6b5f53]">
            {whyKapioo.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>

        <section className="mt-8 rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-semibold text-[#3f352b]">Delivery logistics</h2>
          <div className="mt-4 space-y-3 text-[#6b5f53]">
            <p>
              <strong className="text-[#3f352b]">Delivery windows:</strong> Timing varies by area and plan type.
              You will see available windows during ordering.
            </p>
            <p>
              <strong className="text-[#3f352b]">Order cutoff:</strong> 11:59 AM the day before delivery.
            </p>
            <p>
              <strong className="text-[#3f352b]">Freshness and storage:</strong> Keep meals refrigerated. Best
              enjoyed within 3 days.
            </p>
            <p>
              <strong className="text-[#3f352b]">Reheating:</strong> Microwave or stovetop. Follow instructions on
              the container.
            </p>
          </div>
        </section>

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
