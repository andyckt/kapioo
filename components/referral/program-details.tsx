"use client"

import { motion } from "framer-motion"
import { Gift, Users, Share2, Sparkles, UserPlus } from "lucide-react"

export function ProgramDetails() {
  const rewards = [
    {
      referrals: 1,
      meals: 1,
      color: "from-[#CD7F32]/20 to-[#CD7F32]/5",
      border: "border-[#CD7F32]/30",
      badgeColor: "bg-[#CD7F32]",
    },
    {
      referrals: 3,
      meals: 6,
      color: "from-[#C0C0C0]/20 to-[#C0C0C0]/5",
      border: "border-[#C0C0C0]/30",
      badgeColor: "bg-[#C0C0C0]",
    },
    {
      referrals: 5,
      meals: 10,
      color: "from-[#FFD700]/20 to-[#FFD700]/5",
      border: "border-[#FFD700]/30",
      badgeColor: "bg-[#FFD700]",
    },
  ]

  return (
    <section className="py-20 md:py-28 px-4 bg-white relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-20 left-10 w-64 h-64 bg-[#975820] rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-[#975820] rounded-full blur-3xl" />
      </div>

      <div className="max-w-6xl mx-auto relative z-10">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-light text-[#975820] mb-4">计划详情</h2>
          <p className="text-lg text-gray-600 font-light">了解如何通过推荐好友获得更多奖励</p>
        </motion.div>

        {/* Friend Benefit Card */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-16 bg-gradient-to-br from-[#975820]/10 to-[#975820]/5 rounded-3xl p-8 md:p-12 border border-[#975820]/20"
        >
          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="flex-shrink-0">
              <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-lg">
                <Gift className="w-12 h-12 text-[#975820]" />
              </div>
            </div>
            <div className="flex-1 text-center md:text-left">
              <h3 className="text-2xl md:text-3xl font-light text-[#975820] mb-3">好友福利</h3>
              <p className="text-lg text-gray-700 leading-relaxed">
                当您的好友使用您的推荐码下单时，
                <span className="font-medium text-[#975820]">他们将获得1份免费餐食</span>作为欢迎礼物！
              </p>
            </div>
          </div>
        </motion.div>

        {/* Rewards Progression */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="mb-16"
        >
          <h3 className="text-2xl md:text-3xl font-light text-[#975820] text-center mb-10">推荐奖励进度</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {rewards.map((reward, index) => (
              <motion.div
                key={reward.referrals}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.15 }}
                whileHover={{ scale: 1.05, y: -8 }}
                className={`bg-gradient-to-br ${reward.color} rounded-3xl p-8 border-2 ${reward.border} relative overflow-hidden group shadow-lg hover:shadow-2xl transition-all duration-300`}
              >
                {/* Decorative sparkles */}
                <div className="absolute top-4 right-4 opacity-10 group-hover:opacity-30 transition-opacity duration-300">
                  <Sparkles className="w-16 h-16 text-[#975820]" />
                </div>

                {/* Referral Count Badge - Prominent at top */}
                <div className="relative z-10 mb-6">
                  <div
                    className={`inline-flex items-center gap-3 ${reward.badgeColor} text-white rounded-2xl px-6 py-3 shadow-lg`}
                  >
                    <UserPlus className="w-6 h-6" />
                    <div className="text-left">
                      <div className="text-3xl font-bold leading-none">{reward.referrals}</div>
                      <div className="text-xs font-light opacity-90">推荐人数</div>
                    </div>
                  </div>
                </div>

                {/* Reward Display - Large and prominent */}
                <div className="relative z-10 text-center py-6">
                  <div className="text-7xl font-light text-[#975820] mb-2 leading-none">{reward.meals}</div>
                  <div className="text-xl font-medium text-[#975820]">份免费餐</div>
                </div>

                {/* Decorative divider */}
                <div className="h-1 bg-gradient-to-r from-transparent via-[#975820]/30 to-transparent rounded-full" />
              </motion.div>
            ))}
          </div>
          <p className="text-center text-gray-500 mt-8 text-sm font-light">...更多奖励等你解锁</p>
        </motion.div>

        {/* Referral Code Section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="bg-gradient-to-br from-[#F8F6F2] to-white rounded-3xl p-8 md:p-12 border border-[#975820]/10"
        >
          <div className="flex flex-col md:flex-row items-start gap-8">
            <div className="flex-shrink-0">
              <div className="w-20 h-20 bg-[#975820] rounded-2xl flex items-center justify-center shadow-lg">
                <Share2 className="w-10 h-10 text-white" />
              </div>
            </div>
            <div className="flex-1">
              <h3 className="text-2xl md:text-3xl font-light text-[#975820] mb-6">您的专属推荐码</h3>

              {/* Code Format Explanation */}
              <div className="bg-white rounded-2xl p-6 mb-6 border border-[#975820]/20">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 bg-[#975820]/10 rounded-full flex items-center justify-center">
                    <span className="text-[#975820] font-medium">1</span>
                  </div>
                  <p className="text-gray-700">
                    推荐码格式：<span className="font-medium text-[#975820]">Kapi_&nbsp;+ 您的微信账号前4位号</span>
                  </p>
                </div>

                {/* Example */}
                <div className="bg-[#F8F6F2] rounded-xl p-4 border-l-4 border-[#975820]">
                  <p className="text-sm text-gray-600 mb-2">示例：</p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-gray-600">微信账号：</span>
                    <code className="bg-white px-3 py-1 rounded text-[#975820] font-mono">ABCD123</code>
                    <span className="text-gray-400">→</span>
                    <span className="text-gray-600">推荐码：</span>
                    <code className="bg-[#975820] text-white px-4 py-2 rounded-lg font-mono font-medium">
                      Kapi_ABCD
                    </code>
                  </div>
                </div>
              </div>

              {/* Sharing Options */}
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-[#975820]/10 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                  <span className="text-[#975820] font-medium">2</span>
                </div>
                <div>
                  <p className="text-gray-700 mb-3">分享您的推荐码：</p>
                  <div className="flex flex-wrap gap-3">
                    <div className="flex items-center gap-2 bg-white rounded-lg px-4 py-2 border border-[#975820]/20">
                      <Users className="w-4 h-4 text-[#975820]" />
                      <span className="text-sm text-gray-700">分享给好友</span>
                    </div>
                    <div className="flex items-center gap-2 bg-white rounded-lg px-4 py-2 border border-[#975820]/20">
                      <Share2 className="w-4 h-4 text-[#975820]" />
                      <span className="text-sm text-gray-700">在线分享体验</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
