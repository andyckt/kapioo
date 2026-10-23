import { z } from "zod";
import { SupportArticle } from "@/models/Support";
import { getChangeCutoff } from "@/lib/self-service/service";
import { formatDailyCoverageList, formatWeeklyOnlyCoverageList } from "@/lib/zones/coverage-copy";

const translation = z.object({ question: z.string().trim().min(1).max(180), answer: z.string().trim().min(1).max(2000) });
export const articleContentSchema = z.object({ en: translation, zh: translation }).strict();
export type ArticleContent = z.infer<typeof articleContentSchema>;
export type HelpArticle = ArticleContent & { slug: string };

export const SEED_ARTICLES: HelpArticle[] = [
  { slug: "plans", en: { question: "Daily Bento or Weekly Meal Box?", answer: "Daily Bento is freshly cooked lunch delivered on the days you choose, with at least two meals per delivery. Weekly Meal Box arrives twice weekly for you to refrigerate and reheat. Check your address to see which options are available." }, zh: { question: "每日 Bento 和周次 Meal Box 有什么区别？", answer: "每日 Bento 为您在指定日期配送现做午餐，每次至少两份。周次 Meal Box 每周配送两次，方便冷藏后加热享用。请先查询地址可选的配送方式。" } },
  { slug: "menus", en: { question: "Can I choose my meals?", answer: "Yes. Choose from the available menu for your delivery day. Menus rotate; view the current menu before choosing." }, zh: { question: "可以自选餐食吗？", answer: "可以。从所选配送日的可用菜单中选择，菜单定期更新，请以当前菜单为准。" } },
  { slug: "payment", en: { question: "How do I pay?", answer: "Pay by e-Transfer through checkout and submit the requested payment details. Vouchers are available after payment approval; you can then redeem them to place meal orders. Submitting payment details does not itself mean payment has been approved." }, zh: { question: "如何付款？", answer: "在结账页面按指引完成 e-Transfer，并提交所需付款资料。付款审核通过后餐券到账，即可兑换餐食。提交付款资料并不代表付款已获确认。" } },
  { slug: "storage", en: { question: "How do I store and reheat meals?", answer: "Keep meals refrigerated and enjoy within three days. Follow the heating guidance on the packaging; the website also describes microwave or stovetop reheating." }, zh: { question: "餐食如何保存和加热？", answer: "请冷藏保存，建议三天内食用。请遵循包装上的加热指引；网站也提供微波或明火加热说明。" } },
  { slug: "dietary", en: { question: "What about allergies or dietary restrictions?", answer: "Please speak to our team before ordering if you have allergies or strict dietary restrictions. Listed ingredients or nutrition information do not guarantee suitability or absence of cross-contact." }, zh: { question: "有过敏或特殊饮食要求怎么办？", answer: "如有过敏或严格饮食限制，请先联系团队。已列出的食材和营养资料不代表适合您的情况，也不能保证没有交叉接触。" } },
  { slug: "cancel", en: { question: "How do I cancel an order?", answer: "Open My Orders and select Cancel order. Weekly orders must be cancelled as an entire group. Eligible cancellations return the original vouchers or credits. Review the affected deliveries and refund before confirming. If the option is unavailable, contact support." }, zh: { question: "如何取消订单？", answer: "进入「我的订单」选择「取消订单」。周次订单必须整组取消。符合条件的取消会退回原本使用的餐券或积分。确认前请核对配送日期和退回数量。如无法操作，请联系团队。" } },
  { slug: "address", en: { question: "How do I change a delivery address?", answer: "In My Orders, choose Change address, select the deliveries to update and select your new address from the suggestions. Review the changes before confirming. Saving the new address for future orders is optional." }, zh: { question: "如何修改配送地址？", answer: "在「我的订单」选择「修改地址」，勾选需要修改的配送订单，并从地址建议中选择新地址。确认前请核对。您也可以选择将新地址保存用于以后下单。" } },
  { slug: "status", en: { question: "Where is my order?", answer: "Open My Orders to view your delivery status and available delivery updates. For a missing, late, or damaged delivery, contact our team and select the relevant order." }, zh: { question: "我的订单到哪里了？", answer: "进入「我的订单」查看配送状态及已有配送动态。如遇未收到、延迟或餐食损坏，请联系团队并选择相关订单。" } },
];

export async function publishedArticles(): Promise<HelpArticle[]> {
  const [records, cutoff] = await Promise.all([SupportArticle.find({ published: { $exists: true } }).limit(100).lean(), getChangeCutoff()]);
  const map = new Map(SEED_ARTICLES.map(a => [a.slug, a]));
  for (const record of records) {
    const result = articleContentSchema.safeParse(record.published);
    if (result.success) map.set(record.slug, { slug: record.slug, ...result.data });
  }
  const time = `${String(cutoff.hour).padStart(2, "0")}:${String(cutoff.minute).padStart(2, "0")}`;
  // Operational facts cannot be overridden by editorial text.
  map.set("cutoff", { slug: "cutoff", en: { question: "What is the order/change deadline?", answer: `The cutoff is ${time} Toronto time the day before delivery. Self-service changes must also be before dispatch. For weekly group cancellations, every delivery in the group must still qualify.` }, zh: { question: "下单和修改的截止时间？", answer: `截止时间为配送前一天多伦多时间 ${time}，自助修改也必须在出配送前完成。取消周次整组订单时，组内每次配送都必须符合条件。` } });
  map.set("coverage", { slug: "coverage", en: { question: "Where do you deliver?", answer: `Daily coverage: ${formatDailyCoverageList("en")}. Weekly-only areas also include ${formatWeeklyOnlyCoverageList("en")}. Confirm availability using your exact address.` }, zh: { question: "配送覆盖哪些地区？", answer: `每日配送：${formatDailyCoverageList("zh")}。周次配送另覆盖：${formatWeeklyOnlyCoverageList("zh")}。请以详细地址查询结果为准。` } });
  return [...map.values()];
}
