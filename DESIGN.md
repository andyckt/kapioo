# Kapioo design system — from code

This guide is extracted from **this repo’s Tailwind tokens, globals, layouts, marketing pages, dashboard UI, and product copy**. Use it when generating flyers, decks, ads, Figma mocks, or Canva layouts that should feel like **[kapioo.com](https://www.kapioo.com)**.

**Primary sources verified:** `tailwind.config.ts`, `app/globals.css`, `app/layout.tsx`, `components/ui/button.tsx`, `components/ui/card.tsx`, `app/home-client.tsx`, `components/home-kapioo-kitchen-section.tsx`, `components/section-navigation.tsx`, `features/daily-ordering/daily-combo-grid.tsx`, `features/daily-ordering/daily-combo-meal-lists.tsx`, `features/weekly-ordering/weekly-delivery-days-grid.tsx`, `app/daily-delivery/page.tsx`, `app/weekly-meal/page.tsx`, `components/how-it-works-section.tsx`, `lib/language-context.tsx`, `lib/product-lines/names.ts`, `lib/seo/metadata.ts`, `lib/kapioo-mascot-assets.ts`.

---

## 1. Brand positioning (from codebase + SEO strings)

| Role | Evidence in repo |
|------|-------------------|
| **Offering** | Asian comfort meals, subscription-style ordering: **`Daily Bento`** and **`Weekly Meal Box`** product lines (`lib/product-lines/names.ts`; site metadata mentions Toronto / GTA delivery). |
| **Default positioning line** | English metadata template: **“Healthy Asian Comfort Meals in Toronto”** (`app/layout.tsx` `buildPageMetadata` title fragment). Homepage EN hero: **“Asian comfort meals for everyday life.”** (`lib/language-context.tsx` `mainSlogan` / `home-client.tsx` split headline). |
| **Geography** | GTA / Toronto surfaced in homepage value-prop strings (`heroValue2Line1` / `heroValue2Line2` EN + ZH). |
| **Tone of service** | Freshly cooked angle (daily line), care/comfort wording in ZH motto lines (`subSlogan`, `mottoFirstLine`, `mottoSecondLine` in `lib/language-context.tsx`). |
| **Logistics surfaced in UX copy** | EN product-line blurbs spell delivery cadence: **weekly** — “**2 deliveries per week (Sunday & Tuesday) \| Evening delivery**”; **daily** — “**delivered daily \| Afternoon delivery**” (`weeklySubscriptionDesc` / `dailyDeliveryDesc` in `lib/language-context.tsx`). |

Treat marketing assets as **food + comfort + dependable delivery**, not trendy “fine dining”; pair **warm neutrals + gold-brown accent**, not stark black/neo-brutalist.

---

## 2. Overall visual style

- **Warm, soft UI:** Cream / warm-white section backgrounds (**`#fff6ef`**, **`#FBF7F2`**, **`#F5EDE4`**) with blurred **brown-gold radial accents** (`from-[#C2884E]/10`) on the homepage hero and food gallery (`app/home-client.tsx`).
- **“Kapioo Kitchen” peach wash:** the kitchen strip layers **muted peach `#E8D5C4`** between **`#C2884E`** and **`#D1A46C`** on gradient rings behind the Vimeo frame (`components/home-kapioo-kitchen-section.tsx`) — use that tertiary when you want a blushier beige than **`#FBF7F2`** alone.
- **Kitchen section motion / scroll UX:** enables **vertical scroll snap** on `<html>` (mandatory snap on `<md` widths, proximity on larger breakpoints; skipped when **`prefers-reduced-motion`** is set) via `home-kapioo-kitchen-section.tsx` — explains the “sticky section” mobile feel on the live site more than flyers.
- **Glassy marketing cards:** **`bg-white/90 backdrop-blur-md`**, **`ring-1 ring-[#C2884E]/10`**, **`shadow-xl`**, **`rounded-2xl`** on hero intro card (`app/home-client.tsx`).
- **Accent treatment:** Repeated **brown → gold gradients** **`from-[#C2884E] to-[#D1A46C]`** on headlines, underlines, and primary CTAs (same files).
- **Section rhythm:** Decorative **thin horizontal rules** capped with gradient fades; **pill tags** **`rounded-full`** with **`bg-[#C2884E]/5`** and **`text-[#C2884E]`** (food gallery header pattern in `app/home-client.tsx`).
- **Reveal / motion cues (web):** Stagger fade-up (`tailwind.config.ts` animation `fade-in-up`); hero uses Framer Motion with similar easing—not required for print, but **soft lift + stagger** mirrors brand feel.

Print/canvas: emulate **cream canvas + bronze accent + translucent white panels**, not pure flat Material blue/grey.

---

## 3. Color palette (hex / token) — where used

### Core brand browns / gold

| Hex | Typical usage | Code reference |
|-----|----------------|----------------|
| **`#C2884E`** | Primary brand bronze: buttons, headings accent, borders, gradients start, scrollbar thumb hover, badge text, footer theme color | `tailwind.config.ts` (`primary.DEFAULT`), hero, gallery pills, dialogs, `.visible-scrollbar` in `app/globals.css`, `viewport.themeColor` in `app/layout.tsx` |
| **`#D1A46C`** | Lighter gold: gradient stops with `#C2884E`, underline fades | Repeated with `bg-gradient-to-r from-[#C2884E] to-[#D1A46C]` in `app/home-client.tsx` |
| **`#E8D5C4`** | Soft peach in multi-stop gradients / outer glow rings on the kitchen hero card | `components/home-kapioo-kitchen-section.tsx` |

### Typography & neutrals on marketing surfaces

| Hex | Usage |
|-----|--------|
| **`#6B5F53`** | Default warm brown-grey body/subcopy on cream (hero subtitle, gallery description, sidebar-style UI) |
| **`#382f29`**, **`#3f352b`** | Dark headings on light panels (hero value lines, EN headline neutral part) |

### Supporting UI browns / creams

| Hex | Usage |
|-----|--------|
| **`#BA844D`**, **`#B07845`** | Lucide icons in hero value row (muted bronze, ~95% opacity) |
| **`#FBF7F2`**, **`#F5EDE4`**, **`#FFF6EF`** | Panel / section washes; dashboard combo gradients `from-[#FBF7F2] to-[#F5EDE4]` (`features/daily-ordering/daily-combo-grid.tsx`) |
| **`#C2884E` opacity variants** (`/5`, `/10`, `/12`, `/20`, `/25`, `/35`) | Borders, pills, separators, overlays |

### Accent for “alternate week” / info

| Hex | Usage |
|-----|--------|
| **`#E4F0F5`** bg + **`#4E88C2`** text | “Next week” style pill toggle on combo grid week badge (`daily-combo-grid.tsx`) |

### System tokens (Tailwind / shadcn)

- **Default radius CSS variable:** `--radius: 0.5rem` (`app/globals.css`).
- **`background` / `foreground`**: `hsl` pairs for generic app chrome (see `:root` in `app/globals.css`); marketing pages lean **heavily on custom hex utilities** layered on top.
- **Tailwind `secondary`:** **`hsl(35, 91%, 86%)`** (light sandy) with **`hsl(25, 95%, 33%)`** foreground (`tailwind.config.ts`) — complements cream sections when you need a **named pastel** vs raw hex panels.
- **Primary duplication (be aware):** `tailwind.extend.colors.primary.DEFAULT` is hard-coded **`#C2884E`**, while `:root --primary` in `app/globals.css` is a separate **HSL triplet**. Components using **`bg-primary`** get the hex; **`hsl(var(--primary))`-style utilities** track the CSS variable—**avoid assuming they always pixel-match** without checking.

**Do not substitute** unrelated oranges or cool greys—the site’s signature is **`#C2884E`** + **`#D1A46C`** on warm cream.

---

## 4. Typography — from code

### Face & loading

- **Single explicitly loaded web font:** **Inter** (`next/font/google`), applied on `<body>` in `app/layout.tsx` with **`subsets: ["latin"]` only**.
  - **Latin** uses Inter’s shipped files; **Chinese and other scripts** rely on normal **browser/system font fallback** for glyphs Inter does not bundle—there is **no dedicated CJK webfont import** next to Inter in layout.

### Marketing scale patterns (homepage / sections)

Measure from `app/home-client.tsx` / food gallery blocks:

| Role | Typical classes |
|------|----------------|
| Hero H1 | **`text-3xl sm:text-4xl md:text-5xl font-bold leading-snug tracking-tight`**, EN split: dark `#3f352b` + gradient span |
| Secondary line | **`text-sm sm:text-base md:text-lg font-medium`** `text-[#6B5F53]` |
| Section H2 | **`text-3xl md:text-5xl font-bold`** with **`bg-gradient-to-r from-[#C2884E] to-[#D1A46C]`** + `bg-clip-text text-transparent` |
| Section subtitle | **`text-lg md:text-xl`** `text-[#6B5F53]` |
| Value prop lines | **`text-xs` / `sm:text-[13px] font-semibold`** `text-[#382f29]` + **`text-[11px] sm:text-xs`** `text-[#6B5F53]/88` |

### shadcn `CardTitle` baseline

`components/ui/card.tsx`: **`text-2xl font-semibold leading-none tracking-tight`** — used in admin/dashboard card chrome more than storefront hero.

### Chinese / English copy strategy

Bilingual UX is centralized in **`lib/language-context.tsx`**: zh strings often emphasize **emotion + ritual** (“被好好对待”, “松弛”), EN strings **straight benefit + geography** (“everyday life”, “Toronto & GTA”). Product labels use fixed strings from **`PRODUCT_LINE_LABELS`** (“每日Bento” / “Daily Bento”; “周次 Meal Box” / “Weekly Meal Box”) — **`lib/product-lines/names.ts`**.

For posters: pair **English headline + Chinese sub**, or vice versa, matching whichever language the flyer audience uses; retain **proper product-line spellings from `names.ts`**.

---

## 5. Button style

### Base component (`components/ui/button.tsx`)

- **Base chrome:** **`inline-flex`**, **`rounded-md`**, **`text-sm font-medium`**, focus ring **`ring-ring`**, disabled **`opacity-50`**.
- **Sizes:** **`default`**: `h-10 px-4 py-2`; **`lg`**: `h-11 px-8`; **`sm`**: `h-9 px-3`; **`icon`**: `10×10`.
- **`default` variant:** `bg-primary text-primary-foreground` — **`primary`** in Tailwind is **`#C2884E`** (`tailwind.config.ts`).

### Kapioo marketing CTA overrides (homepage / nav)

Repeated pattern (**`app/home-client.tsx`**, mobile drawer):

```
bg-gradient-to-r from-[#C2884E] to-[#D1A46C]
text-white
rounded-xl           (not default rounded-md — larger rounding on hero CTAs)
px-6 py-6           (large touch target when size lg)
shadow-md
hover:scale-105 transition-transform
```

Secondary / outline variants on site often add:

```
border-[#C2884E]
text-[#C2884E]
hover:bg-[#C2884E]/5
rounded-xl border (mobile links)
```

**Print:** Gradient fill or solid **`#C2884E`** with **`#FFFFFF`** label; corners **`12–16px` radius** to match **`rounded-xl`**.

---

## 6. Card style

### Utility `Card` (`components/ui/card.tsx`)

```
rounded-lg border bg-card shadow-sm
Header p-6, Title text-2xl font-semibold, Description text-sm text-muted-foreground
```

### Marketing food gallery tiles (`app/home-client.tsx`)

- **Shape:** **`rounded-2xl overflow-hidden`**
- **Depth:** **`shadow-xl`**, hover **`shadow-2xl`**, **`hover:-translate-y-1`** (lift)
- **Image:** **`object-cover`** full-bleed, subtle **`scale-[1.02]`** on hover
- **Caption block (no scrim overlay):** copy sits in **`absolute inset-x-0 bottom-0`** with **`text-white`** / **`text-white/90`** — there is **not** a full-bleed dark gradient layer over the photo; readability depends on imagery.
- **Hover accent:** **`h-px`** line reveals with **`bg-gradient-to-r from-[#C2884E] to-[#D1A46C]`** (slides in under the caption).

### Daily ordering combo cards (`features/daily-ordering/daily-combo-grid.tsx`)

```
rounded-2xl border border-[#C2884E]/20
bg-gradient-to-br from-[#FBF7F2] to-[#F5EDE4]
shadow-md
backdrop-blur-xl
aspect-[16/9] crop for combo photo
rounded bg-[#C2884E]/10 badges for meal type labels
```

**Print:** Thick **corner radius (~16–24px)**, thin **brown border (~20% opacity)**, inner **cream gradient or flat `#FBF7F2`**.

### Combo descriptive copy (`DailyComboMetadata` in `features/daily-ordering/daily-combo-meal-lists.tsx`)

Used on grids and dialogs when a combo has description / tags / nutrition rows:

| Element | Typical classes |
|---------|----------------|
| Paragraph | **`text-sm`** (or **`line-clamp-2 text-xs`** when `compact`), **`text-[#6B5F53]/75`** or **`/70`** |
| Calorie pill | **`rounded-full bg-[#C2884E]/10 px-2 … font-semibold text-[#C2884E]`** |
| Cuisine / tag pills | **`rounded-full bg-[#F5EDE4]/70 … font-medium text-[#6B5F53]`** |

---

## 7. Layout & spacing rules

### Global container (`tailwind.config.ts`)

- **`container`** `center: true`, **`padding: "2rem"`**, max breakpoint label **`2xl: 1400px`**.

### Section padding (homepage samples)

| Area | Typical spacing |
|------|------------------|
| Hero section wrapper | **`container px-4 md:px-6 py-8 md:py-12 lg:py-6`**, **`lg:flex-row`** split |
| Food gallery section | **`py-8 md:py-16 lg:py-24`**, **`mb-10 md:mb-16 lg:mb-20`** before grid |
| Gallery grid gaps | **`gap-6 md:gap-8`**, asymmetric **1-col mobile / 4-col desktop with 2×2 featured tile** (`lg:grid-cols-4`, large card **`lg:col-span-2 lg:row-span-2`**) |

### Extra breakpoint

Custom screen **`xs: 375px`** (`tailwind.config.ts`) for tight mobile tweaks.

### Floating homepage section nav (`components/section-navigation.tsx`)

- **`md:` and up:** fixed bar **`bottom-8`**, **`left-1/2 -translate-x-1/2`**, **`rounded-full`** shell **`bg-white/90 backdrop-blur-sm`** + **`border border-[#C2884E]/20`** + **`shadow-lg`**.
- **Active pill:** **`bg-gradient-to-r from-[#C2884E] to-[#D1A46C]`** **`text-white`**; **inactive:** **`text-[#6B5F53] hover:text-[#C2884E]`**.
- Sections linked: **`kapioo-kitchen`**, **`food-gallery`**, **`reviews`**, plus **`meal-plans`** only when **`SHOW_HOME_LOCATION_MEAL_PLANS_SECTION`** (`lib/home-page-section-flags.ts`) is enabled.

---

## 8. Border radius & shadow

| Token / class | Meaning |
|----------------|---------|
| **`--radius: 0.5rem`** | Base CSS variable (`app/globals.css`) → **`rounded-lg`** in Tailwind theme extension maps to **`var(--radius)`** |
| **`rounded-xl`** (~12px+) | Carousel wrapper, dialogs, QR frame — common on marketing shells |
| **`rounded-2xl`** | Hero pricing card outer, combo cards, food tiles, QR modal wrapper |
| **`rounded-full`** | Pills/badges, dots, scrollbar thumb (`9999px` in scrollbar utility), floating mascot glow |
| **`shadow-md`**, **`shadow-xl`**, **`shadow-2xl`**, **`shadow-black/20`** under hero carousel | Elevate cards and modals progressively |

---

## 9. Image & photography style

- **Gallery & hero:** **`next/image` `fill` `object-cover`**, **`sizes` hints for responsive width** (`app/home-client.tsx` gallery block—real JPG paths under **`/food-gallery/`**).
- **Combo images:** **`aspect-[16/9]`**, **`object-cover`**, light hover **`scale-[1.04]`** / **`duration-300`** (`daily-combo-grid.tsx`).
- **Decorative overlays:** Ultra-light **radial-dot grid** **`opacity-[0.03]`**, **`radial-gradient(#C2884E 1px, transparent 1px)`**, **`background-size 24×24`** (`food-gallery` section).
- **Legal-style disclaimer:** Product UI repeats the reference-only line in several places — **Zh:** **`* 图片仅供参考`** on each surface; **EN wording differs slightly:**
  - **Daily combo grid** (`features/daily-ordering/daily-combo-grid.tsx`) and **daily product dialog** (`app/daily-delivery/page.tsx`): **`* Images shown are for reference only`**.
  - **Weekly grids / weekly page** (`features/weekly-ordering/weekly-delivery-days-grid.tsx`, `app/weekly-meal/page.tsx`): **`* Pictures are for reference only.`** (note period).
  Match the **weekly vs daily EN string** if you mirror live UI verbatim; otherwise use one consistent marketing line and keep Zh aligned.

**Mascot assets** (brown line-art bowls, optional): **`public/mascot/`** + path map **`KAPIOO_MASCOT`** in **`lib/kapioo-mascot-assets.ts`**.

---

## 10. Icon style

- Library: **`lucide-react`** icons across dashboard (**`features/dashboard-shell/dashboard-menu-items.tsx`**: `Calendar`, `CreditCard`, `Gift`, `History`, `Settings`, etc.) and marketing (**`app/home-client.tsx`**: e.g. `Bike`, `Heart`, `Soup`, `Truck`, `UtensilsCrossed`, `ArrowRight`, `CreditCard`, `Menu`).
- Homepage value row styling: **`size-[22px] sm:size-6`**, **`strokeWidth={~1.85}`**, **`text-[#BA844D]` / `#B07845`**, **`opacity-[0.95]`** (`app/home-client.tsx`).
- **Rule:** Outline icons **match bronze palette**, moderate stroke—not ultra-thick or multicolor emoji replacements.

---

## 11. QR code / WeChat / CTA block style

Implementations live in **`components/how-it-works-section.tsx`**:

- Modal **overlay:** `fixed inset-0`, dim **`bg-black` ~70% opacity**, centered card.
- **Card shell:** **`bg-white`**, **`rounded-2xl shadow-2xl border border-[#C2884E]/20`**, **`p-6`**, **`max-w-md`**.
- **Title:** **`text-xl font-bold text-[#C2884E]`** (Chinese: **关注我们的微信**).
- **Subtitle:** **`text-sm text-[#6B5F53]`**.
- **QR framing:** **`w-[280px] h-[280px]`**, inner **`rounded-xl overflow-hidden border-4 border-[#C2884E]/20 shadow-lg`**, JPEG **`/KapiooWeChatQRcode.JPG`**.
- **WeChat handle strip:** **`bg-[#C2884E]/5 rounded-lg p-3`**, **`text-[#C2884E]`** for ID.
- **Download row:** **`bg-[#C2884E]/5 rounded-lg p-4`**, secondary button **`border border-[#C2884E] text-[#C2884E] rounded-md`**.

FAQ references **WeChat `kapioomeal06`** in copy (`faq-content.tsx`).

---

## 12. Copywriting tone

### English (homepage sample lines from `language-context.tsx`)

- **Short, warm, suburban-practical**: “Asian comfort meals for everyday life.” / “Every meal, a moment you look forward to.”
- **Geography**: “Delivered across / Toronto & GTA.”
- **Light humor/credibility**: “No boring meal prep. / Just real food.”
- **Product names**: Prefer canonical **Daily Bento** / **Weekly Meal Box** from `PRODUCT_LINE_LABELS`.

### Chinese (parallel keys)

- **Emotional-wellbeing framing**: 「被好好对待」、松弛美好、一顿饭给生活松一口气.
- **Quality tags**: Pipe-separated virtues (e.g., 健康｜高质…) in older hero-description strings—short **middot-separated** clauses still appear elsewhere.
- **Product names**: 「每日Bento」「周次 Meal Box」exactly per `PRODUCT_LINE_LABELS`.

**Audience:** Busy Toronto-region eaters balancing **Asian comfort**, **nutrition clarity** (calories noted on combos), **subscription convenience**.

Avoid: slang-heavy Gen-Z drip; luxury “chef’s table” posturing unrelated to commuter lunch.

---

## 13. Example flyer / poster design rules

1. **Background:** Cream **`#FFF6EF`** or lighten to **`#FFFAF7`**; faint bronze radial blobs top-right / bottom-left (copy opacity ~8–12% of `#C2884E`).
2. **Eyebrow:** Small pill **`#C2884E/10`**, text **`text-sm font-medium text-[#C2884E]`** style.
3. **Headline:** Mix **`#382f29`** with **gradient `#C2884E → #D1A46C`** highlight on **1–4 words**.
4. **Body:** **`#6B5F53`**, Inter-like neutral grotesque, **sentence case EN** / **简体中文** punctuation rules for Zh.
5. **Hero dish photo:** **`16:9` crop**, warm kitchen light, **`rounded-2xl` frame**, thin **`#C2884E`** border at low opacity — add **`* 图片仅供参考`** (Zh); EN pick one line used in-product — **daily-style** *Images shown are for reference only* or **weekly-style** *Pictures are for reference only.*
6. **CTA block:** Gradient button style or solid `#C2884E`, white text **`Get Started`** / **`立即开始`**, optional arrow icon (**`ArrowRight` motif**).
7. **Footer strip:** Mention **delivery area** (“Toronto & GTA”) mirroring **`heroValue2`** EN lines.
8. **Optional QR:** replicate **thick bronze border**, light cream outer card (see §11).

Grid: generous margins — web sections use **`px-4`–`md:px-6` + generous vertical padding** (`py-8`–`24` scales).

---

## 14. Do / don’t

### Do

✅ Use **`#C2884E`** + **`#D1A46C`** gradient as the signature accent  
✅ Keep **cream / warm beige** substrates  
✅ Use **rounded large blocks** (**16–24 px** effective), **thin semi-transparent bronze borders**  
✅ Prefer **warm brown text** (**`#6B5F53`**) over neutral `#666` grey  
✅ Pair **professional food imagery** (`object-cover` style—not isolated clipart)  
✅ Offer **Zh + EN** where audience is GTA Chinese diaspora  
✅ Name products **exactly**: Daily Bento / Weekly Meal Box (per `names.ts`)  
✅ Add **\* 仅供参考** line when depicting meals  

### Don’t

❌ Replace brand bronze with stark **orange `#FF6900`** or corporate **blue-grey** palettes  
❌ Use **neon gradients** unrelated to **`#D1A46C` stop**  
❌ Default to **`pure white #FFF`** fullscreen without warming layer  
❌ Use **heavy black strokes** around photos (shadow is soft / `shadow-xl` style)  
❌ Mix mismatched mascot art styles **outside `/public/mascot` set** unless extending intentionally  
❌ Ignore **dual-language capitalization** quirks (Zh title case differs; preserve brand casing in EN)

---

## 15. Claude Design prompt template — Kapioo office lunch flyer

Copy-paste & adjust placeholders:

```
Create a portrait A4/US Letter flyer for "Kapioo" — Toronto Asian comfort meal subscription.
Visual style MUST match kapioo.com: cream background (~#FFF6EF), faint soft radial blobs in muted #C2884E at ~10% opacity corners. Headline: mix dark brown #382f29 with a bronze-to-gold gradient highlight (#C2884E → #D1A46C) on key words ("Office lunch"). Subhead and body text in warm brown #6B5F53. Typography: neutral grotesque like Inter — bold condensed headline weights, readable body (~11–13pt flyer print).
Imagery: one large 16:9 photograph of assorted Asian boxed lunches, rounded 24px corner frame, subtle drop shadow, thin border rgba(194,136,78,0.2). Footer small reference line matching Kapioo product copy — Chinese "* 图片仅供参考"; English either "* Images shown are for reference only" (daily UX) or "* Pictures are for reference only." (weekly UX); pick one for the flyer.
CTA: rounded pill banner with diagonal gradient (#C2884E to #D1A46C), white text "Get Started" + Chinese "立即开始", optional ArrowRight icon motif.
Supporting bullets: bilingual (English + Chinese simplified) bullets using short phrases —
• Daily Bento (每日Bento): fresh daily lunch deliveries
• Weekly Meal Box (周次 Meal Box): scheduled evening bundles
Footer line: Serving Toronto & GTA (配送多伦多及大多地区)
Optional bottom-right muted QR silhouette block with beige border referencing WeChat onboarding without inventing QR content.
Avoid neon colors, slick tech-blue themes, serif luxury fonts, clipart icons.
```

Adapt date, office name, QR asset, promo code, legal disclaimers for your campaign.

---

*Last audited against repository structure and classes as committed; if UI drifts, re-verify `tailwind.config.ts` and flagship components above.*
