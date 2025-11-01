import Hero from "@/components/referrals/hero"
import { HowItWorks } from "@/components/referrals/how-it-works"
import { RewardTiers } from "@/components/referrals/reward-tiers"
import { DoubleStampBanner } from "@/components/referrals/double-stamp-banner"
import { ProgramDetails } from "@/components/referrals/program-details"
import { JoinSection } from "@/components/referrals/join-section"

export default function Home() {
  return (
    <main className="min-h-screen bg-[#F8F6F2]">
      <Hero />
      <HowItWorks />
      <RewardTiers />
      <DoubleStampBanner />
      <ProgramDetails />
      <JoinSection />
    </main>
  )
}
