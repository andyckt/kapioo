import { formatOrderStatusEmailLineHtml } from "@/lib/email/order-status-email"

describe("lib/email/order-status-email", () => {
  it("formats daily combo line with zh voucher wording", () => {
    const html = formatOrderStatusEmailLineHtml(
      {
        day: "monday-w1",
        date: "May 1",
        comboName: "套餐 1",
        type: "A",
        quantity: 10,
      },
      "zh"
    )
    expect(html).toContain("10张2菜餐券")
    expect(html).not.toContain("分餐点")
    expect(html).toContain("套餐 1")
  })

  it("formats daily combo line with en x voucher wording", () => {
    const html = formatOrderStatusEmailLineHtml(
      {
        day: "tuesday-w1",
        date: "May 2",
        comboName: "Combo 2",
        type: "B",
        quantity: 10,
      },
      "en"
    )
    expect(html).toContain("10 x 3-dish vouchers")
    expect(html).toContain("Combo 2")
  })

  it("formats weekly option line with portion wording", () => {
    const zh = formatOrderStatusEmailLineHtml(
      {
        dayId: "sunday",
        date: "May 3",
        optionName: "黑胡椒牛柳",
        quantity: 4,
      },
      "zh"
    )
    expect(zh).toContain("周日")
    expect(zh).toContain("4份餐点")

    const en = formatOrderStatusEmailLineHtml(
      {
        dayId: "tuesday",
        date: "May 4",
        optionName: "Beef bowl",
        quantity: 1,
      },
      "en"
    )
    expect(en).toContain("Tuesday")
    expect(en).toContain("1 meal")
  })

  it("escapes HTML in names", () => {
    const html = formatOrderStatusEmailLineHtml(
      {
        day: "monday-w1",
        date: "May 1",
        comboName: '<script>x</script>',
        type: "A",
        quantity: 1,
      },
      "en"
    )
    expect(html).not.toContain("<script>")
    expect(html).toContain("&lt;script&gt;")
  })
})
