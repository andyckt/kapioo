"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ChevronDown,
  ChevronUp,
  Globe,
  CheckCircle2,
  UtensilsCrossed,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { StarRating } from "@/components/star-rating";
import { useLanguage } from "@/lib/language-context";

interface RatingDish {
  _id: string;
  name: string;
  nameEn?: string;
  sortOrder: number;
  active: boolean;
}

type DishRatingState = Record<string, number>;
type DishCommentState = Record<string, string>;

export function MealRatingContent() {
  const { language, setLanguage } = useLanguage();
  const isZh = language === "zh";

  const [deliveryDate, setDeliveryDate] = useState<string | null>(null);
  const [overallRating, setOverallRating] = useState(0);
  const [overallComment, setOverallComment] = useState("");
  const [dishRatings, setDishRatings] = useState<DishRatingState>({});
  const [dishComments, setDishComments] = useState<DishCommentState>({});
  const [dishCommentOpen, setDishCommentOpen] = useState<Record<string, boolean>>({});
  const [dishes, setDishes] = useState<RatingDish[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync language from logged-in user's profile
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const userStr = localStorage.getItem("user");
      if (userStr) {
        const user = JSON.parse(userStr);
        if (user?.languagePreference === "zh" || user?.languagePreference === "en") {
          setLanguage(user.languagePreference);
        }
      }
    } catch {
      // ignore
    }
  }, [setLanguage]);

  useEffect(() => {
    const ac = new AbortController();
    const timeout = setTimeout(() => ac.abort(), 15000);

    fetch("/api/meal-rating/active-date", { signal: ac.signal })
      .then((res) => res.json())
      .then((data) => {
        const d = data?.date;
        if (d && /^\d{4}-\d{2}-\d{2}$/.test(d)) {
          setDeliveryDate(d);
        } else {
          const today = new Date();
          setDeliveryDate(
            `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`
          );
        }
      })
      .catch(() => {
        const today = new Date();
        setDeliveryDate(
          `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`
        );
      })
      .finally(() => clearTimeout(timeout));

    return () => {
      clearTimeout(timeout);
      ac.abort();
    };
  }, []);

  useEffect(() => {
    const ac = new AbortController();
    const timeout = setTimeout(() => ac.abort(), 15000);

    fetch("/api/meal-rating/dishes", { signal: ac.signal })
      .then((res) => res.json())
      .then((data) => setDishes(Array.isArray(data) ? data : []))
      .catch(() => setDishes([]))
      .finally(() => {
        clearTimeout(timeout);
        setLoading(false);
      });

    return () => {
      clearTimeout(timeout);
      ac.abort();
    };
  }, []);

  const setDishRating = (dishId: string, value: number) => {
    setDishRatings((prev) => ({ ...prev, [dishId]: value }));
  };

  const setDishComment = (dishId: string, value: string) => {
    setDishComments((prev) => ({ ...prev, [dishId]: value }));
  };

  const toggleDishComment = (dishId: string) => {
    setDishCommentOpen((prev) => ({ ...prev, [dishId]: !prev[dishId] }));
  };

  const handleSubmit = async () => {
    if (!deliveryDate) {
      setError(isZh ? "无法获取评分日期，请稍后再试" : "Could not load rating date. Please try again later.");
      return;
    }
    if (!overallRating || overallRating < 1) {
      setError(isZh ? "请给整体体验评分" : "Please rate your overall experience");
      return;
    }

    setError(null);
    setSubmitting(true);

    const dishRatingsPayload = dishes
      .filter((d) => {
        const r = dishRatings[d._id];
        return typeof r === "number" && r >= 1 && r <= 5;
      })
      .map((d) => ({
        dishId: d._id,
        dishName: isZh ? d.name : d.nameEn || d.name,
        rating: dishRatings[d._id] as number,
        comment: dishComments[d._id]?.trim() || undefined,
      }));

    let userEmail: string | undefined;
    try {
      const isAuthenticated = localStorage.getItem("isAuthenticated") === "true";
      const userStr = localStorage.getItem("user");
      if (isAuthenticated && userStr) {
        const user = JSON.parse(userStr);
        const raw = user?.email;
        if (typeof raw === "string") {
          const trimmed = raw.trim();
          const EMAIL_MAX = 254;
          const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (trimmed && trimmed.length <= EMAIL_MAX && EMAIL_REGEX.test(trimmed)) {
            userEmail = trimmed;
          }
        }
      }
    } catch {
      // ignore
    }

    try {
      const res = await fetch("/api/meal-rating", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deliveryDate,
          overallRating,
          dishRatings: dishRatingsPayload,
          comment: overallComment.trim() || undefined,
          userEmail: userEmail || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setSubmitted(true);
    } catch (err) {
      setError(
        isZh
          ? "提交失败，请重试"
          : "Something went wrong. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex flex-col bg-[#FFF6EF]">
        <header className="sticky top-0 z-50 w-full border-b bg-white/80 backdrop-blur-md">
          <div className="container flex h-14 items-center px-4">
            <Link href="/" className="flex items-center gap-2 group">
              <Image
                src="/未命名設計.png"
                alt="Kapioo Logo"
                width={32}
                height={32}
                className="h-8 w-8 transition-transform duration-300 group-hover:rotate-6 group-hover:scale-110"
              />
              <span className="inline-block font-bold text-[#C2884E] text-lg sm:text-xl transition-all duration-300 group-hover:scale-105 group-hover:tracking-wider">Kapioo</span>
            </Link>
          </div>
        </header>
        <main className="flex-1 flex flex-col items-center justify-center px-4 py-16">
          <div className="max-w-md w-full text-center space-y-6">
            <div className="flex justify-center">
              <div className="w-20 h-20 rounded-full bg-[#C2884E]/10 flex items-center justify-center">
                <CheckCircle2 className="h-12 w-12 text-[#C2884E]" />
              </div>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-[#3f352b]">
              {isZh ? "感谢您的反馈！" : "Thanks for your feedback!"}
            </h1>
            <p className="text-[#6B5F53]">
              {isZh
                ? "您的评价已成功提交，帮助我们做得更好。"
                : "Your feedback has been submitted and helps us improve."}
            </p>
            <Button asChild size="lg" variant="outline" className="mt-4">
              <Link href="/dashboard">
                {isZh ? "点一下今天运气+88pt" : "Tap for today's luck +88pt"}
              </Link>
            </Button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#FFF6EF]">
      <header className="sticky top-0 z-50 w-full border-b bg-white/80 backdrop-blur-md supports-[backdrop-filter]:bg-white/90">
        <div className="container flex h-16 items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2 group">
            <Image
              src="/未命名設計.png"
              alt="Kapioo Logo"
              width={32}
              height={32}
              className="h-8 w-8 transition-transform duration-300 group-hover:rotate-6 group-hover:scale-110"
            />
            <span className="inline-block font-bold text-[#C2884E] text-lg sm:text-xl transition-all duration-300 group-hover:scale-105 group-hover:tracking-wider">Kapioo</span>
          </Link>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="text-[#6B5F53]">
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
        </div>
      </header>

      <main className="flex-1 container max-w-2xl mx-auto px-4 py-8">
        <div className="space-y-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-[#3f352b]">
              {isZh ? "为今天的餐食打分" : "Rate today's meal"}
            </h1>
            <p className="mt-2 text-[#6B5F53]">
              {isZh ? "约 30 秒完成，您的反馈帮助我们进步。" : "Takes ~30 seconds. Your feedback helps us improve."}
            </p>
          </div>

          {/* Step 1: Date (read-only, admin-selected) */}
          <div className="rounded-2xl border border-[#C2884E]/10 bg-white p-5 shadow-sm">
            <Label className="text-[#3f352b] font-medium">
              {isZh ? "配送日期" : "Delivery date"}
            </Label>
            <p className="mt-2 text-lg text-[#3f352b]">
              {deliveryDate
                ? (() => {
                    const d = new Date(deliveryDate + "T12:00:00");
                    const weekday = isZh
                      ? ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"][d.getDay()]
                      : ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][d.getDay()];
                    return `${deliveryDate} ${weekday}`;
                  })()
                : isZh
                  ? "加载中…"
                  : "Loading…"}
            </p>
          </div>

          {/* Step 2: Overall experience + comment */}
          <div className="rounded-2xl border border-[#C2884E]/10 bg-white p-5 shadow-sm">
            <p className="text-[#3f352b] font-medium">
              {isZh ? "整体用餐体验如何？" : "How was your overall meal experience?"}
            </p>
            <p className="text-sm text-[#6B5F53] mt-0.5">
              {isZh ? "必填" : "Required"}
            </p>
            <div className="mt-4">
              <StarRating
                value={overallRating}
                onChange={setOverallRating}
                size="lg"
              />
            </div>
            <div className="mt-4">
              <Label htmlFor="overall-comment" className="text-sm text-[#6B5F53]">
                {isZh ? "关于整体体验，我想说...（可选）" : "About the overall experience, I want to say... (optional)"}
              </Label>
              <Textarea
                id="overall-comment"
                value={overallComment}
                onChange={(e) => setOverallComment(e.target.value)}
                placeholder={
                  isZh
                    ? "分享您的想法或表扬…"
                    : "Share your thoughts or praise…"
                }
                rows={3}
                className="mt-2 resize-none border-[#C2884E]/20 focus:border-[#C2884E] focus:ring-2 focus:ring-[#C2884E]/20"
              />
            </div>
          </div>

          {/* Step 3: Dishes */}
          {loading ? (
            <div className="rounded-2xl border border-[#C2884E]/10 bg-white p-8 text-center text-[#6B5F53]">
              {isZh ? "加载中…" : "Loading…"}
            </div>
          ) : dishes.length > 0 ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <UtensilsCrossed className="h-5 w-5 text-[#C2884E]" />
                <h2 className="text-lg font-semibold text-[#3f352b]">
                  {isZh ? "每道菜评分（可选）" : "Rate each dish (optional)"}
                </h2>
              </div>
              {dishes.map((dish) => (
                <div
                  key={dish._id}
                  className="rounded-2xl border border-[#C2884E]/10 bg-white p-5 shadow-sm"
                >
                  <p className="font-medium text-[#3f352b]">
                    {isZh ? dish.name : dish.nameEn || dish.name}
                  </p>
                  <div className="mt-3">
                    <StarRating
                      value={typeof dishRatings[dish._id] === "number" ? dishRatings[dish._id] : 0}
                      onChange={(v) => setDishRating(dish._id, v)}
                      size="md"
                    />
                  </div>
                  <div className="mt-3">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-[#C2884E] hover:bg-[#C2884E]/10"
                      onClick={() => toggleDishComment(dish._id)}
                    >
                      {isZh ? "加个评论" : "Add a comment"}
                      {dishCommentOpen[dish._id] ? (
                        <ChevronUp className="h-4 w-4 ml-1" />
                      ) : (
                        <ChevronDown className="h-4 w-4 ml-1" />
                      )}
                    </Button>
                    {dishCommentOpen[dish._id] && (
                      <div className="mt-2">
                        <p className="text-sm text-[#6B5F53] mb-1">
                          {isZh ? "关于这个菜，我想说..." : "About this dish, I want to say..."}
                        </p>
                        <Textarea
                          value={dishComments[dish._id] ?? ""}
                          onChange={(e) => setDishComment(dish._id, e.target.value)}
                          placeholder={
                            isZh
                              ? "分享您对这道菜的评价…"
                              : "Share your thoughts on this dish…"
                          }
                          rows={2}
                          className="resize-none border-[#C2884E]/20 focus:border-[#C2884E] focus:ring-2 focus:ring-[#C2884E]/20"
                        />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          {error && (
            <p className="text-sm text-red-600 text-center">{error}</p>
          )}

          <Button
            size="lg"
            className="w-full bg-gradient-to-r from-[#C2884E] to-[#D1A46C] hover:opacity-90 text-white shadow-lg shadow-[#C2884E]/20 py-6 rounded-xl text-base font-medium"
            onClick={handleSubmit}
            disabled={submitting || !deliveryDate}
          >
            {submitting
              ? isZh
                ? "提交中…"
                : "Submitting…"
              : isZh
                ? "提交反馈"
                : "Submit Feedback"}
          </Button>
        </div>
      </main>
    </div>
  );
}
