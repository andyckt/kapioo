# Almost Shared — refined homepage finalists

Review `/design-finalists` or open `/design-finalists/linen` directly. The other directions are `daylight`, `journal`, `open-house` and `sunday`, under the same preview path. All five are real Next.js pages built from the shared component. Linen is the default selection. The original homepage design and the two earlier concept galleries remain available.

## Marketing direction

The primary audience is busy Toronto/GTA residents who want familiar Asian flavours without cooking every day, including working professionals, students and households. The copy introduces the actual service before the emotional message: **Asian fusion meals. Delivered in Toronto.** It expands the brand beyond a Chinese-only audience while accurately describing today's service area.

The primary call to action says **Order now** and opens the existing `/starter` journey at the top level. Daily Bento and Weekly Meal Box appear together in a concise comparison, followed by **See what’s available to me**, which also opens `/starter`. The address step still determines eligible plans. Users enter their address, see eligible options, and continue through existing menu, pricing and payment flows. Food photos also lead to the address check. “Freshly made. Never frozen.” follows the owner's brief and the existing how-it-works page. No invented rankings, prices, reviews, customer totals or national delivery claims are included. “Toronto #1” requires supporting evidence before publication.

## Design and interaction

- A centred service headline, one freshness statement and one primary action. Hero labels, the mascot badge, photo overlays and footnotes have been removed. Looser letter spacing, consistent portrait proportions and soft shadows give the food photography space. The full-width photo ribbon alternates food and real-life moments; on phones, smaller cards drift continuously so the entire set appears without manual swiping. The final mascot sits lower and tilts subtly on scroll or hover.
- Eight compact chapters sized around the visible screen below the sticky navigation. Photo heights adapt to available space; mobile uses shorter copy, two compact meal-plan summaries, a swipeable food gallery and a single-open FAQ. Text remains readable and may reflow on enlarged-text or very short landscape screens rather than being clipped.
- The original configurable Vimeo production video remains in the second section, in a light 9:16 portrait frame. The mobile frame scales to the available screen height, with the three kitchen stages beneath it. The player autoplays muted and pauses offscreen or when the page is hidden; custom in-frame play/pause and sound buttons replace Vimeo's visible controls and logo. Reduced-motion preferences pause automatic playback, and an inline retry action handles player failures. Player messaging follows the [Vimeo Player API](https://github.com/vimeo/player.js). Vimeo's chromeless embed behavior depends on the video owner's account settings and should be checked on the live domain.
- Scroll-responsive photo movement, subtle photo drift, sequential text emphasis, small mascot movement, section reveals and a reading-progress line. No scroll hijacking. Reduced-motion preferences disable animation. The observer reconnects when language changes so translated content remains visible.
- English and Simplified Chinese content using Kapioo's existing language provider. Accessible mobile navigation, readable plan comparisons, FAQs and keyboard focus treatments. The root viewport now permits zoom.
- Fifteen compressed, responsive WebP files made from existing Kapioo food photos. Regenerate with `node scripts/prepare-marketing-assets.cjs`.

## Original icon collection

Twelve original rounded line icons share a 32 px grid: location, bento, box, prep, cook, delivery, calendar, heat, clock, choice, portion and heart. They appear beside kitchen steps, plan features and ordering instructions. Review them at `/design-finalists/icons`; standalone SVGs live in `public/brand-icons`. Regenerate with `node --import tsx scripts/export-kapioo-icons.ts`. Decorative icons are hidden from assistive technology when adjacent text already supplies their meaning.

## Search foundations

The homepage now has a descriptive Toronto/GTA meal-delivery title and description, canonical URL, social metadata and server-rendered Organization, WebSite and Service structured data. The how-it-works and FAQ pages have their own canonical metadata. The sitemap includes public discovery pages and no longer invents a fresh last-modified date on every request. All preview pages remain `noindex` to avoid indexing competing design copies.

The design uses one H1, descriptive section headings, real image alt text and server-rendered plan descriptions, with both plans visible without interaction. These follow Google's [SEO starter guide](https://developers.google.com/search/docs/fundamentals/seo-starter-guide) and [mobile-first indexing guidance](https://developers.google.com/search/docs/crawling-indexing/mobile/mobile-sites-mobile-first-indexing). Organization markup follows [Google's documentation](https://developers.google.com/search/docs/appearance/structured-data/organization). These are search foundations, not a promise of rankings or conversion gains.

The existing language switch uses the same URL and a preference cookie. No separate language URLs or unsupported hreflang targets have been invented. Search optimization is focused on the service area Kapioo currently supports; Canada-wide claims and location pages should wait for actual availability.

## After the user chooses the live design

In `app/page.tsx`, replace the `HomeClient` import and render with `MarketingHome` and pass `variant="linen"` (or the selected finalist). Keep the existing server-resolved video ID, normal homepage metadata and JSON-LD script:

```tsx
<MarketingHome variant="linen" videoId={kitchenTourVimeoId} />
```

Also extend the inline-language exception in `components/language-preference-dialog.tsx` to `/`; previews already suppress the old language modal. The component includes its navigation and footer. Keep `noindex` restricted to preview routes. The middleware permits same-origin framing only for the comparison gallery; normal ordering/account pages retain their protection.

## Verification

- `npx tsc --project features/marketing-home/tsconfig.check.json --pretty false`
- `npx eslint features/marketing-home app/design-finalists app/page.tsx app/faq/layout.tsx app/how-it-works/layout.tsx app/sitemap.ts --ext .ts,.tsx`
- `npx vitest run __tests__/lib/marketing-home.test.ts`
- `npm run build`

The 17 automated checks cover all five directions in both languages, address-first destinations, real assets, video placement and controls, original icons, server-rendered plans, metadata, structured data and the narrow framing policy. Browser checks cover desktop and compact/mobile layouts, both languages, both plan summaries, in-view video playback and expanded FAQs. Vimeo playback remains dependent on the external video/account configuration and the viewing network; verify it on the production domain before launch.
