import { productInformation, type Preferences } from "./products";

function normalize(text: string) {
  return text.trim().toLowerCase().replace(/[.!?。！？]+$/u, "").trim();
}

// Only route recognizable, general questions to approved FAQ text. Specific
// requests and ambiguous/multiple topics continue to the assistant or fallback.
const topics: Array<[string, RegExp]> = [
  ["plans", /^(?:what (?:meal )?plans (?:do you (?:have|offer)|are available)|what do you (?:offer|sell)|(?:tell me about |what is the difference between )?(?:your )?(?:meal plans|daily bento(?: and| or)? weekly meal box))$|^(?:有(?:什么|什麼|哪些)套餐|你们有什么套餐|你們有什麼套餐|每日.*(?:和|与|與).*周次.*(?:区别|區別))/u],
  ["menus", /^(?:(?:show me |can i see |what(?:'s| is) (?:on )?)?(?:your |the |today's )?menus?|can i choose my (?:meals|food))$|^(?:菜单|菜單|可以自选餐食吗|可以自選餐食嗎|今天(?:有什[么麼]菜|吃什么))$/u],
  ["coverage", /^(?:where do you deliver|what (?:areas|cities) do you (?:deliver to|cover)|(?:what is your )?delivery (?:coverage|area))$|^(?:配送(?:区域|區域|范围|範圍)|配送覆盖哪些地区|配送覆蓋哪些地區|你[们們]送哪[里裡])/u],
  ["payment", /^(?:how (?:do|can) i pay|what payment (?:methods|options) (?:do you accept|are available)|payment methods)$|^(?:如何付款|怎么付款|怎麼付款|如何支付|付款方式)$/u],
  ["storage", /^(?:how (?:do|should|can) i (?:store|reheat|heat|keep)(?: and reheat)? (?:the |my |your )?(?:meals|food)|how long (?:do|can) (?:the |my |your )?meals (?:last|keep))$|^(?:餐食如何保存和加热|餐食如何保存和加熱|怎么(?:保存|加热)|怎麼(?:保存|加熱)|餐食(?:能放多久|可以放多久))$/u],
  ["cancel", /^(?:how (?:do|can) i cancel (?:my |an? |the )?order|cancel(?: my| an)? order)$|^(?:如何取消订单|如何取消訂單|取消订单|取消訂單)$/u],
  ["address", /^(?:how (?:do|can) i (?:change|update) (?:my |the |a )?(?:delivery |shipping )?address|(?:change|update)(?: my)? address)$|^(?:如何修改配送地址|如何修改地址|修改地址|更改地址)$/u],
  ["status", /^(?:where is my order|where's my order|how (?:do|can) i (?:track|check) my order|order status)$|^(?:我的订单到哪里了|我的訂單到哪裡了|订单状态|訂單狀態)$/u],
  ["cutoff", /^(?:what is (?:the |your )?(?:order(?:ing)? |change )?(?:deadline|cutoff)(?: time)?|when (?:do|must) i (?:order|make changes))$|^(?:下单和修改的截止时间|下單和修改的截止時間|下单截止时间|下單截止時間|几点截止|幾點截止)$/u],
];

export async function directHelpAnswer(text: string, language: "en" | "zh", prefs: Preferences) {
  const question = normalize(text);
  const zh = language === "zh";
  if (/^(?:hi+|hello+|hey+|hihi|good morning|good afternoon|good evening|你好|您好|嗨|哈喽|哈囉)(?: there| kapioo)?$/u.test(question)) {
    return { text: zh ? "您好！我可以解答套餐、菜单、配送和订单修改方面的常见问题。您想了解什么？" : "Hi! I can help with common questions about meal plans, menus, delivery and order changes. What would you like to know?", cards: [], needsHuman: false };
  }
  if (question.length > 180) return null;
  const matches = topics.filter(([, pattern]) => pattern.test(question));
  if (matches.length !== 1) return null;
  const slug = matches[0][0];
  const { articles } = await productInformation("policies", language, prefs) as { articles: Array<{ slug: string; answer: string }> };
  const article = articles?.find(a => a.slug === slug);
  if (!article) return null;
  const next = slug === "plans" ? (zh ? "选择「帮我选餐」找到适合您的计划，或选择「菜单与价格」浏览。" : "Select Help me choose to find a plan, or Menus & prices to browse.")
    : slug === "menus" ? (zh ? "选择「菜单与价格」查看当前菜单和计划价格。" : "Select Menus & prices to view current menus and plan prices.") : "";
  return { text: [article.answer, next].filter(Boolean).join("\n\n"), cards: [], needsHuman: false };
}
