import { KapiooIcon } from '@/features/marketing-home/kapioo-icons'

export function VoucherBenefits({ language }: { language: string }) {
  const zh = language === 'zh'
  const benefits = [
    {
      icon: 'heart' as const,
      title: zh ? '餐券可以转赠' : 'Transferable vouchers',
      detail: zh ? '和亲友分享一顿好饭。' : 'Share a meal with someone you love.',
    },
    {
      icon: 'calendar' as const,
      title: zh ? '6 个月有效' : 'Valid for 6 months',
      detail: zh ? '按照自己的节奏安排用餐。' : 'Redeem on your schedule.',
    },
    {
      icon: 'clock' as const,
      title: zh ? '7 天退款窗口' : '7-day refund window',
      detail: zh ? '购买后 7 天内，可退还未使用部分。' : 'Unused portion refundable within 7 days of purchase.',
    },
  ]

  return (
    <div className="ko-voucher-benefits" aria-label={zh ? '餐券优势' : 'Voucher benefits'}>
      {benefits.map((benefit) => (
        <div className="ko-voucher-benefit" key={benefit.icon}>
          <span className="ko-voucher-benefit-icon"><KapiooIcon name={benefit.icon} size={25} /></span>
          <div>
            <strong>{benefit.title}</strong>
            <span>{benefit.detail}</span>
          </div>
        </div>
      ))}
    </div>
  )
}
