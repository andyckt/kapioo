import HomeClient from "./home-client"
import { resolveKitchenTourVimeoIdFromEnv } from "@/lib/home-kitchen-tour-video"

export default function Home() {
  const kitchenTourVimeoId = resolveKitchenTourVimeoIdFromEnv()
  return <HomeClient kitchenTourVimeoId={kitchenTourVimeoId} />
}
