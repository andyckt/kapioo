import { listDailyPlans, listWeeklyPlans, getPlanById, getWeeklyDeliveryFee, buildPlanLabel } from "@/lib/plans/service";
import Day from "@/models/Day";
import Combo from "@/models/Combo";
import WeeklyDeliveryDay from "@/models/WeeklyDeliveryDay";
import { publishedArticles } from "./knowledge";

export type Preferences = { kind?: "daily" | "weekly"; meals?: number; budget?: number; area?: string; coverage?: { canDaily: boolean; canWeekly: boolean }; address?: Record<string, unknown> };
export type PlanCard = { planId: string; kind: "daily" | "weekly"; label: string; mealSubtotal: number; deliveryFee: number | null; tax: number | null; total: number | null; currency: "CAD"; pricePerMeal: number; coverageConfirmed: boolean };
const round = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export function planCard(planId: string, prefs: Preferences, language: "en" | "zh"): PlanCard | null {
  const plan = getPlanById(planId);
  if (!plan?.active) return null;
  if (prefs.coverage && !(plan.kind === "daily" ? prefs.coverage.canDaily : prefs.coverage.canWeekly)) return null;
  const deliveryFee = plan.kind === "daily" ? 0 : prefs.area ? round(getWeeklyDeliveryFee(prefs.area) * plan.weeks) : null;
  const subtotal = deliveryFee === null ? null : round(plan.basePrice + deliveryFee);
  const tax = subtotal === null ? null : round(subtotal * 0.13);
  return { planId: plan.id, kind: plan.kind, label: buildPlanLabel(plan, language), mealSubtotal: plan.basePrice, deliveryFee, tax, total: subtotal === null ? null : round(subtotal + tax!), currency: "CAD", pricePerMeal: plan.pricePerMeal, coverageConfirmed: Boolean(prefs.coverage) };
}

export function recommendPlans(prefs: Preferences, language: "en" | "zh") {
  const zh = language === "zh";
  if (!prefs.coverage) return { question: zh ? "请先选择您的配送地址，以确认可选计划。" : "First, please select your delivery address so we can check available plans.", ask: "address", cards: [] as PlanCard[] };
  if (!prefs.coverage.canDaily && !prefs.coverage.canWeekly) return { question: zh ? "目前暂未覆盖此地址。您可以联系团队了解更多。" : "We do not currently serve this address. Our team can help with any questions.", ask: "team", cards: [] as PlanCard[] };
  if (!prefs.kind) return { question: zh ? "您更喜欢新鲜午餐，还是冷藏后随时加热的餐食？" : "Would you prefer fresh lunches, or meals to refrigerate and reheat?", ask: "kind", cards: [] as PlanCard[] };
  if (!prefs.meals) return { question: zh ? "您每周大约需要多少份餐？" : "About how many meals would you like each week?", ask: "meals", cards: [] as PlanCard[] };
  if (prefs.budget === undefined) return { question: zh ? "您每餐的预算大约是多少加元？也可以跳过。" : "What is your approximate budget per meal in CAD? You can also skip this.", ask: "budget", cards: [] as PlanCard[] };
  const plans = prefs.kind === "weekly" ? listWeeklyPlans().filter(p => p.weeks === 1) : listDailyPlans().filter(p => p.credits <= 10);
  const cards = plans.map(p => planCard(p.id, prefs, language)).filter((c): c is PlanCard => Boolean(c));
  cards.sort((a, b) => {
    const pa = getPlanById(a.planId)!, pb = getPlanById(b.planId)!;
    const mealsA = pa.kind === "weekly" ? pa.mealsPerWeek : pa.credits;
    const mealsB = pb.kind === "weekly" ? pb.mealsPerWeek : pb.credits;
    const budgetPenalty = (c: PlanCard) => prefs.budget && c.pricePerMeal > prefs.budget ? 1000 : 0;
    return (budgetPenalty(a) + Math.abs(mealsA - prefs.meals!)) - (budgetPenalty(b) + Math.abs(mealsB - prefs.meals!)) || a.mealSubtotal - b.mealSubtotal;
  });
  return { question: cards.length ? (zh ? "根据您选择的配送方式和用餐数量，这些入门计划最接近您的需要。请核对总价和份数；预算比较按餐食单价计算。" : "These starter plans are closest to your delivery preference and meal count. Review the quantities and total; budget comparisons use the food price per meal.") : (zh ? "该配送方式暂不覆盖您的地址，请选择另一种方式或联系团队。" : "That delivery option is unavailable at your address. Try the other option or contact our team."), ask: null, cards: cards.slice(0, 2) };
}

export async function productInformation(topic: string, language: "en" | "zh", prefs: Preferences) {
  if (topic === "plans") return { plans: [...listDailyPlans(), ...listWeeklyPlans()].map(p => planCard(p.id, prefs, language)).filter(Boolean) };
  if (topic === "menus") {
    const days = await Day.find({ isActive: true }).select("dayId date").limit(14).lean();
    const [daily, weekly] = await Promise.all([
      Combo.find({ dayId: { $in: days.map(d => d.dayId) } }).select("name dayId descriptionZh descriptionEn allergensZh allergensEn typeA typeB calories proteinGrams").limit(30).lean(),
      WeeklyDeliveryDay.find({ active: true }).select("date options").populate({ path: "options", match: { active: true }, select: "name nameEn description descriptionEn allergens allergensEn calories proteinGrams" }).limit(6).lean(),
    ]);
    return { dailyDays: days, daily, weekly, note: "Menu dates and availability must be confirmed during ordering. Missing nutrition/allergen fields are unknown, not zero or allergen-free." };
  }
  return { articles: (await publishedArticles()).map(a => ({ slug: a.slug, ...a[language] })) };
}
