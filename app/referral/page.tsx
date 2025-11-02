import Hero from "@/components/referral/hero"
import { HowItWorks } from "@/components/referral/how-it-works"
import { RewardTiers } from "@/components/referral/reward-tiers"
import { DoubleStampBanner } from "@/components/referral/double-stamp-banner"
import { ProgramDetails } from "@/components/referral/program-details"
import { JoinSection } from "@/components/referral/join-section"
import { TermsConditions } from "@/components/referral/terms-conditions"

export default function Home() {
  return (
    <main className="min-h-screen bg-[#F8F6F2]">
      <Hero />
      <HowItWorks />
      <RewardTiers />
      <DoubleStampBanner />
      <ProgramDetails />
      <JoinSection />
      <TermsConditions />
    </main>
  )
}
