"use client";

import { useState, useRef, useCallback } from "react";
import { Star, Quote, ChevronLeft, ChevronRight, Award } from "lucide-react";
import { motion } from "framer-motion";

const reviews = [
  {
    text: "The meals are always fresh and portioned perfectly. Such a game-changer for busy weekdays.",
    location: "Toronto",
  },
  {
    text: "Love the variety — Asian comfort food done right. My whole family is hooked.",
    location: "GTA",
  },
  {
    text: "I get the Weekly Meal Box and it's perfect for meal prep. Reheats so well and the combos never get boring.",
    location: "Markham",
  },
  {
    text: "Daily Delivery to my office is a lifesaver. Lunch actually tastes like real food, not sad desk salads.",
    location: "Downtown Toronto",
  },
  {
    text: "The rotating menu keeps things interesting. Combo A and B both hit different — we switch every week.",
    location: "North York",
  },
  {
    text: "Cutoff the day before is easy to remember, and they actually show up on time. Rare for meal delivery.",
    location: "Richmond Hill",
  },
  {
    text: "Portions are satisfying without being huge. Feels like proper home cooking, not diet food.",
    location: "Thornhill",
  },
  {
    text: "My kids actually eat the rice and stir-fry. Finally a meal service that works for the whole family.",
    location: "Vaughan",
  },
  {
    text: "Tried a few meal prep services — Kapioo's taste and consistency are the best. Stuck with them for 6 months now.",
    location: "Hamilton",
  },
];

const REVIEWS_PER_PAGE = 3;
const TOTAL_PAGES = Math.ceil(reviews.length / REVIEWS_PER_PAGE);

const stagger = {
  visible: { transition: { staggerChildren: 0.06, delayChildren: 0.04 } },
  hidden: {},
};
const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0 },
};

export function EnglishReviewSection() {
  const [page, setPage] = useState(0);
  const touchStartX = useRef<number | null>(null);

  const goNext = useCallback(() => {
    setPage((p) => (p + 1) % TOTAL_PAGES);
  }, []);

  const goPrev = useCallback(() => {
    setPage((p) => (p - 1 + TOTAL_PAGES) % TOTAL_PAGES);
  }, []);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const delta = touchStartX.current - e.changedTouches[0].clientX;
    touchStartX.current = null;
    if (Math.abs(delta) > 50) delta > 0 ? goNext() : goPrev();
  };

  return (
    <section className="relative py-20 md:py-28 px-4 overflow-hidden bg-gradient-to-b from-white via-[#FFFBF7] to-[#FBF7F2]">
      {/* Decorative elements */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-20 right-[5%] w-[500px] h-[500px] bg-gradient-to-bl from-[#C2884E]/10 to-transparent rounded-full blur-2xl" />
        <div className="absolute bottom-20 left-[5%] w-[400px] h-[400px] bg-gradient-to-tr from-[#D1A46C]/8 to-transparent rounded-full blur-xl" />
        <div className="absolute inset-0 opacity-[0.02] bg-[radial-gradient(#C2884E_1px,transparent_1px)] [background-size:24px_24px]" />
      </div>

      <div className="container max-w-6xl mx-auto relative z-10">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={stagger}
        >
          {/* Header */}
          <div className="text-center mb-10">
            <motion.div
              variants={fadeUp}
              className="inline-flex items-center gap-2 mb-6"
            >
              <span className="h-px w-8 bg-gradient-to-r from-transparent to-[#C2884E]/40 rounded-full" />
              <span className="px-4 py-1.5 bg-[#C2884E]/5 rounded-full text-sm font-medium text-[#C2884E]">
                Real reviews
              </span>
              <span className="h-px w-8 bg-gradient-to-l from-transparent to-[#C2884E]/40 rounded-full" />
            </motion.div>
            <motion.h2
              variants={fadeUp}
              className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight text-[#3f352b]"
            >
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#C2884E] to-[#D1A46C]">
                Loved by Toronto
              </span>
              <br />
              <span className="text-[#6B5F53]">and the GTA</span>
            </motion.h2>
            <motion.p
              variants={fadeUp}
              className="mt-4 text-lg text-[#6B5F53]/90 max-w-2xl mx-auto"
            >
              Real feedback from real customers. See why hundreds trust Kapioo for
              fresh, balanced meals.
            </motion.p>
          </div>

          {/* Metrics - new copy */}
          <motion.div
            variants={fadeUp}
            className="flex flex-col sm:flex-row flex-wrap justify-center items-center gap-6 sm:gap-10 md:gap-16 mb-14"
          >
            <div className="text-center px-6 py-4 rounded-2xl bg-white/60 border border-[#C2884E]/5 shadow-sm">
              <div className="text-2xl md:text-3xl font-bold text-[#C2884E]">
                800K+
              </div>
              <div className="text-sm text-[#6B5F53] font-medium">
                meals delivered
              </div>
            </div>
            <div className="flex items-center gap-1.5 px-6 py-4 rounded-2xl bg-white/60 border border-[#C2884E]/5 shadow-sm">
              <div className="flex gap-0.5 items-center">
                {[...Array(5)].map((_, i) => (
                  i < 4 ? (
                    <Star
                      key={i}
                      className="w-5 h-5 fill-[#C2884E] text-[#C2884E]"
                    />
                  ) : (
                    <span key={i} className="relative inline-block w-5 h-5">
                      <Star className="absolute inset-0 w-5 h-5 text-[#C2884E]/30" />
                      <span
                        className="absolute inset-0 overflow-hidden"
                        style={{ width: "80%" }}
                      >
                        <Star className="w-5 h-5 fill-[#C2884E] text-[#C2884E]" />
                      </span>
                    </span>
                  )
                ))}
              </div>
              <span className="text-xl font-bold text-[#3f352b] ml-1">4.8</span>
            </div>
            <div className="flex items-center gap-2 px-6 py-4 rounded-2xl bg-white/60 border border-[#C2884E]/5 shadow-sm">
              <Award className="w-6 h-6 text-[#C2884E] flex-shrink-0" />
              <div className="text-left">
                <div className="text-sm font-bold text-[#3f352b]">
                  Ranked #1
                </div>
                <div className="text-xs text-[#6B5F53]">
                  Asian Meal Prep in Canada
                </div>
              </div>
            </div>
          </motion.div>

          {/* Review carousel - 3 at a time, translate-based for smoothness */}
          <div className="relative">
            {/* Nav buttons - outside overflow so hover scale is not clipped */}
            <div className="flex justify-end gap-2 mb-6 overflow-visible">
              <button
                onClick={goPrev}
                aria-label="Previous reviews"
                className="w-10 h-10 rounded-full border border-[#C2884E]/20 bg-white/90 hover:bg-white hover:border-[#C2884E]/40 shadow-sm flex items-center justify-center transition-colors duration-200"
              >
                <ChevronLeft className="w-5 h-5 text-[#C2884E]" />
              </button>
              <button
                onClick={goNext}
                aria-label="Next reviews"
                className="w-10 h-10 rounded-full border border-[#C2884E]/20 bg-white/90 hover:bg-white hover:border-[#C2884E]/40 shadow-sm flex items-center justify-center transition-colors duration-200"
              >
                <ChevronRight className="w-5 h-5 text-[#C2884E]" />
              </button>
            </div>

            <div
              className="w-full"
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
            >
              <motion.div
                key={page}
                initial={{ opacity: 0.6 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.2 }}
                className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6"
              >
                {reviews
                  .slice(
                    page * REVIEWS_PER_PAGE,
                    page * REVIEWS_PER_PAGE + REVIEWS_PER_PAGE
                  )
                  .map((review, i) => (
                    <article
                      key={`${page}-${i}`}
                      className="rounded-2xl border border-[#C2884E]/10 bg-white/90 backdrop-blur-sm p-5 md:p-6 shadow-md hover:shadow-lg hover:border-[#C2884E]/15 transition-shadow duration-200 flex flex-col"
                    >
                      <Quote className="w-8 h-8 text-[#C2884E]/20 mb-3 flex-shrink-0" />
                      <p className="text-[#6B5F53] leading-relaxed text-sm md:text-base flex-1">
                        &ldquo;{review.text}&rdquo;
                      </p>
                      <p className="mt-4 text-xs text-[#C2884E]/80 font-medium">
                        — Customer, {review.location}
                      </p>
                    </article>
                  ))}
              </motion.div>
            </div>

            {/* Dots */}
            <div className="flex justify-center gap-2 mt-8">
              {Array.from({ length: TOTAL_PAGES }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => setPage(i)}
                  aria-label={`Go to review set ${i + 1}`}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    i === page
                      ? "w-8 bg-gradient-to-r from-[#C2884E] to-[#D1A46C]"
                      : "w-2 bg-[#C2884E]/20 hover:bg-[#C2884E]/40"
                  }`}
                />
              ))}
            </div>
          </div>

          <motion.p
            variants={fadeUp}
            className="text-[#6B5F53]/70 text-sm text-center mt-8"
          >
            Reviews from Instagram, Google, and our community.
          </motion.p>
        </motion.div>
      </div>
    </section>
  );
}
