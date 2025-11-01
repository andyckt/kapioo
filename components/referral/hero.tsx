"use client"

import { Button } from "@/components/ui/button"
import { Sparkles } from "lucide-react"

export default function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-[#F8F6F2] to-white">
      <div className="container mx-auto px-4 sm:px-6 py-12 sm:py-16 md:py-20 lg:py-24">
        <div className="grid gap-8 md:gap-12 lg:grid-cols-2 lg:gap-16 items-center">
          {/* Text Content */}
          <div className="space-y-4 sm:space-y-6 text-center lg:text-left order-2 lg:order-1">
            <div className="inline-flex items-center gap-2 rounded-full bg-[#975820]/10 px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-[#975820]">
              <Sparkles className="h-3 w-3 sm:h-4 sm:w-4" />
              <span>限时推荐奖励</span>
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-[#2C3E2C] leading-tight text-balance">
              {"Kapioo 推荐计划正式开启"}
            </h1>

            <p className="text-base sm:text-lg md:text-xl text-[#5A7C5A] leading-relaxed text-pretty text-muted-foreground px-4 lg:px-0">
              邀请好友订阅 Kapioo，
              <br />
              共同解锁专属免费餐次。
              <br />
              好味共享，喜悦成双
            </p>

            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center lg:justify-start pt-2">
              <Button
                size="lg"
                className="bg-[#975820] hover:bg-[#7d4a1a] text-white font-medium rounded-full px-6 sm:px-8 py-5 sm:py-6 text-base sm:text-lg shadow-lg hover:shadow-xl transition-all w-full sm:w-auto"
                onClick={() => {
                  const howItWorksSection = document.getElementById('how-it-works');
                  if (howItWorksSection) {
                    howItWorksSection.scrollIntoView({ behavior: 'smooth' });
                  }
                }}
              >
                立即加入活动 🎁
              </Button>
            </div>
          </div>

          {/* Visual Content */}
          <div className="relative order-1 lg:order-2">
            <div className="relative rounded-2xl sm:rounded-3xl overflow-hidden p-6 sm:p-8 md:p-12">
              <div className="relative space-y-10 sm:space-y-12 md:space-y-16">
                {/* Capybara Footprints connecting milestones */}
                <svg
                  className="absolute left-1/2 top-0 bottom-0 w-24 sm:w-28 md:w-32 -translate-x-1/2 pointer-events-none opacity-20"
                  viewBox="0 0 128 450"
                  preserveAspectRatio="xMidYMid meet"
                >
                  {/* Footprint 1 */}
                  <g transform="translate(45, 80) rotate(-15)">
                    <ellipse cx="12" cy="15" rx="8" ry="10" fill="#975820" />
                    <ellipse cx="6" cy="5" rx="4" ry="5" fill="#975820" />
                    <ellipse cx="12" cy="3" rx="4" ry="5" fill="#975820" />
                    <ellipse cx="18" cy="5" rx="4" ry="5" fill="#975820" />
                  </g>

                  {/* Footprint 2 */}
                  <g transform="translate(65, 180) rotate(10)">
                    <ellipse cx="12" cy="15" rx="8" ry="10" fill="#975820" />
                    <ellipse cx="6" cy="5" rx="4" ry="5" fill="#975820" />
                    <ellipse cx="12" cy="3" rx="4" ry="5" fill="#975820" />
                    <ellipse cx="18" cy="5" rx="4" ry="5" fill="#975820" />
                  </g>

                  {/* Footprint 3 */}
                  <g transform="translate(40, 280) rotate(-20)">
                    <ellipse cx="12" cy="15" rx="8" ry="10" fill="#975820" />
                    <ellipse cx="6" cy="5" rx="4" ry="5" fill="#975820" />
                    <ellipse cx="12" cy="3" rx="4" ry="5" fill="#975820" />
                    <ellipse cx="18" cy="5" rx="4" ry="5" fill="#975820" />
                  </g>

                  {/* Footprint 4 */}
                  <g transform="translate(70, 380) rotate(15)">
                    <ellipse cx="12" cy="15" rx="8" ry="10" fill="#975820" />
                    <ellipse cx="6" cy="5" rx="4" ry="5" fill="#975820" />
                    <ellipse cx="12" cy="3" rx="4" ry="5" fill="#975820" />
                    <ellipse cx="18" cy="5" rx="4" ry="5" fill="#975820" />
                  </g>
                </svg>

                {/* Milestone 1: Refer 1 person = 1 free meal */}
                <div className="relative flex items-center gap-3 sm:gap-4 md:gap-6 animate-fade-in">
                  <div className="flex-1 text-right space-y-1">
                    <div className="inline-flex items-center justify-end gap-1.5 sm:gap-2 bg-[#975820]/10 rounded-full px-2.5 sm:px-3 md:px-4 py-1.5 sm:py-2">
                      <span className="text-lg sm:text-xl md:text-2xl font-bold text-[#975820] text-center">
                        推荐1人
                      </span>
                    </div>
                  </div>
                  <div className="relative z-10 w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 transform hover:scale-110 transition-transform duration-300 flex-shrink-0">
                    <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-2xl">
                      <circle cx="50" cy="50" r="45" fill="#975820" opacity="0.08" />
                      <circle
                        cx="50"
                        cy="50"
                        r="40"
                        fill="none"
                        stroke="#975820"
                        strokeWidth="2"
                        strokeDasharray="4 4"
                      />
                      <circle cx="50" cy="50" r="35" fill="none" stroke="#975820" strokeWidth="2" />
                      <text x="50" y="52" textAnchor="middle" fill="#975820" fontSize="32" fontWeight="700">
                        1
                      </text>
                      <text x="50" y="68" textAnchor="middle" fill="#975820" fontSize="12" fontWeight="500">
                        免费餐
                      </text>
                    </svg>
                  </div>
                  <div className="flex-1" />
                </div>

                {/* Milestone 2: Refer 3 people = 6 free meals */}
                <div
                  className="relative flex items-center gap-3 sm:gap-4 md:gap-6 animate-fade-in"
                  style={{ animationDelay: "0.15s" }}
                >
                  <div className="flex-1" />
                  <div className="relative z-10 w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 transform hover:scale-110 transition-transform duration-300 flex-shrink-0">
                    <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-2xl">
                      <circle cx="50" cy="50" r="45" fill="#975820" opacity="0.14" />
                      <circle
                        cx="50"
                        cy="50"
                        r="40"
                        fill="none"
                        stroke="#975820"
                        strokeWidth="2"
                        strokeDasharray="4 4"
                      />
                      <circle cx="50" cy="50" r="35" fill="none" stroke="#975820" strokeWidth="2" />
                      <text x="50" y="52" textAnchor="middle" fill="#975820" fontSize="32" fontWeight="700">
                        6
                      </text>
                      <text x="50" y="68" textAnchor="middle" fill="#975820" fontSize="12" fontWeight="500">
                        免费餐
                      </text>
                    </svg>
                  </div>
                  <div className="flex-1 text-left space-y-1">
                    <div className="inline-flex items-center gap-1.5 sm:gap-2 bg-[#975820]/10 rounded-full px-2.5 sm:px-3 md:px-4 py-1.5 sm:py-2">
                      <span className="text-lg sm:text-xl md:text-2xl font-bold text-[#975820] text-center">
                        推荐 3 人
                      </span>
                    </div>
                  </div>
                </div>

                {/* Milestone 3: Refer 5 people = 10 free meals */}
                <div
                  className="relative flex items-center gap-3 sm:gap-4 md:gap-6 animate-fade-in"
                  style={{ animationDelay: "0.3s" }}
                >
                  <div className="flex-1 text-right space-y-1">
                    <div className="inline-flex items-center justify-end gap-1.5 sm:gap-2 bg-gradient-to-r from-[#975820]/20 to-[#975820]/10 rounded-full px-2.5 sm:px-3 md:px-4 py-1.5 sm:py-2 border border-[#975820]/20">
                      <span className="text-lg sm:text-xl md:text-2xl font-bold text-[#975820] text-center">
                        推荐 5 人
                      </span>
                    </div>
                  </div>
                  <div className="relative z-10 w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 transform hover:scale-110 transition-transform duration-300 flex-shrink-0">
                    <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-2xl">
                      <circle cx="50" cy="50" r="45" fill="#975820" opacity="0.2" />
                      <circle
                        cx="50"
                        cy="50"
                        r="40"
                        fill="none"
                        stroke="#975820"
                        strokeWidth="2"
                        strokeDasharray="4 4"
                      />
                      <circle cx="50" cy="50" r="35" fill="none" stroke="#975820" strokeWidth="2.5" />
                      <text x="50" y="52" textAnchor="middle" fill="#975820" fontSize="32" fontWeight="700">
                        10
                      </text>
                      <text x="50" y="68" textAnchor="middle" fill="#975820" fontSize="12" fontWeight="500">
                        免费餐
                      </text>
                      <circle cx="80" cy="20" r="10" fill="#975820" />
                      <path
                        d="M 80 15 L 81.5 19 L 85.5 19 L 82.5 21.5 L 83.5 25.5 L 80 23 L 76.5 25.5 L 77.5 21.5 L 74.5 19 L 78.5 19 Z"
                        fill="white"
                      />
                    </svg>
                  </div>
                  <div className="flex-1" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
