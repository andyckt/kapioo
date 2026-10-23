'use client'

import { useRef } from 'react'
import Image from 'next/image'
import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { KapiooIcon, type KapiooIconName } from '@/features/marketing-home/kapioo-icons'

type ProductKind = 'daily' | 'weekly'

export function ProductDetailsDialog({ kind, language }: { kind: ProductKind; language: string }) {
  const returnToPlans = useRef(false)
  const zh = language === 'zh'
  const daily = kind === 'daily'
  const plansId = daily ? 'daily-plans' : 'weekly-plans'
  const details: { icon: KapiooIconName; title: string; body: string }[] = daily
    ? [
        { icon: 'choice', title: zh ? '先选餐券' : 'Choose your vouchers', body: zh ? '根据食量，选择 2 菜或 3 菜餐券。' : 'Pick a 2- or 3-dish voucher plan.' },
        { icon: 'calendar', title: zh ? '想吃再兑换' : 'Pick your lunch days', body: zh ? '查看每周菜单，只在想吃的日子下单。' : 'Explore the changing menu and redeem only when you want lunch.' },
        { icon: 'delivery', title: zh ? '午间送达' : 'Fresh lunch arrives', body: zh ? '餐食新鲜现做，于上午 11 点至下午 1 点配送。' : 'Freshly cooked meals arrive between 11 AM and 1 PM.' },
      ]
    : [
        { icon: 'choice', title: zh ? '选好一周的餐' : 'Choose your week', body: zh ? '选择每周 6–16 餐和适合自己的周次餐券。' : 'Choose 6–16 meals per week and a voucher pack that fits.' },
        { icon: 'calendar', title: zh ? '按自己的节奏兑换' : 'Redeem when ready', body: zh ? '选择喜欢的菜单，在方便的一周使用餐券。' : 'Pick your meals for an available week. Pause between weeks.' },
        { icon: 'heat', title: zh ? '冷藏，随时享用' : 'Fill the fridge', body: zh ? '每周两次晚间配送，冷藏保存，加热即享。' : 'Two evening deliveries each week. Refrigerate, heat and enjoy.' },
      ]

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" className="ko-product-info-trigger">
          {daily ? (zh ? '了解每日便当' : 'Learn more') : (zh ? '了解周餐盒' : 'How it works')}
        </Button>
      </DialogTrigger>
      <DialogContent
        className="ko-product-info-dialog"
        onCloseAutoFocus={(event) => {
          if (!returnToPlans.current) return
          event.preventDefault()
          returnToPlans.current = false
          window.requestAnimationFrame(() => {
            const target = document.getElementById(plansId)
            target?.scrollIntoView({ behavior: 'smooth', block: 'start' })
            target?.focus({ preventScroll: true })
          })
        }}
      >
        <div className="ko-info-hero">
          <div className="ko-info-hero-copy">
            <p className="ko-eyebrow">{daily ? (zh ? '每日便当' : 'DAILY BENTO') : (zh ? '每周餐盒' : 'WEEKLY MEAL BOX')}</p>
            <DialogTitle>
              {daily
                ? (zh ? <>新鲜午餐，<em>由你安排。</em></> : <>Fresh lunch, <em>your call.</em></>)
                : (zh ? <>轻松备餐，<em>一周无忧。</em></> : <>A good week, <em>made easier.</em></>)}
            </DialogTitle>
            <DialogDescription>
              {daily
                ? (zh ? '餐券先备好，想吃哪天就选哪天。我们负责烹饪与配送。' : 'Keep vouchers ready, then choose the days that call for a better lunch. We’ll handle the cooking.')
                : (zh ? '选择每周需要的餐食，再决定哪一周使用。冰箱里总有好选择。' : 'Choose how many meals you need, then decide when to use each week. Your fridge takes care of the rest.')}
            </DialogDescription>
          </div>
          <div className="ko-info-photo">
            <Image
              src={daily ? '/marketing/plan-daily-1280.webp' : '/marketing/plan-weekly-1280.webp'}
              alt={daily ? 'Kapioo Daily Bento with freshly cooked dishes' : 'Kapioo Weekly Meal Box with prepared meals'}
              fill
              sizes="(max-width: 700px) 90vw, 300px"
            />
          </div>
        </div>
        <div className="ko-info-body">
          <div className="ko-info-steps">
            {details.map((item, index) => (
              <div className="ko-info-step" key={item.icon}>
                <div className="ko-info-step-icon"><KapiooIcon name={item.icon} size={30} /><span>0{index + 1}</span></div>
                <h3>{item.title}</h3>
                <p>{item.body}</p>
              </div>
            ))}
          </div>
          <div className="ko-info-footer">
            <p>{daily
              ? (zh ? '每次配送至少 2 份 · 上午 11 点至下午 1 点送达' : 'Minimum 2 meals per delivery · 11 AM–1 PM delivery')
              : (zh ? '每周配送 2 次 · 6–16 餐可选' : 'Twice-weekly delivery · 6–16 meals per week')}</p>
            <DialogClose asChild>
              <a
                href={`#${plansId}`}
                className="ko-info-cta"
                onClick={() => { returnToPlans.current = true }}
              >
                {zh ? '查看餐券套餐' : 'Explore voucher plans'} <ArrowRight size={17} aria-hidden="true" />
              </a>
            </DialogClose>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
