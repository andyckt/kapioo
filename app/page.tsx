import { MarketingHome } from "@/features/marketing-home/marketing-home"
import { resolveKitchenTourVimeoIdFromEnv } from "@/lib/home-kitchen-tour-video"
import { marketingMetadata, marketingStructuredData, serializeStructuredData } from "@/features/marketing-home/seo"

export const metadata = marketingMetadata()

export default function Home() {
  const kitchenTourVimeoId = resolveKitchenTourVimeoIdFromEnv()
  return <><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeStructuredData(marketingStructuredData) }} /><MarketingHome variant="linen" videoId={kitchenTourVimeoId} /></>
}
