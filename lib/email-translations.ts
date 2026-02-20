/**
 * Centralized Email Translation System
 * 
 * This module provides a reusable translation system for all email communications.
 * All email functions should use these translations to support bilingual emails.
 */

export type Language = 'zh' | 'en';

/**
 * Common email translations used across multiple email types
 */
export const commonTranslations = {
  zh: {
    // Greetings
    dear: '亲爱的',
    hi: '您好',
    hello: '您好',
    
    // Closings
    regards: '此致',
    bestRegards: '最诚挚的问候',
    thankYou: '感谢您',
    
    // Common labels
    orderNumber: '订单号',
    orderDate: '订单日期',
    total: '总计',
    subtotal: '小计',
    status: '状态',
    address: '地址',
    phone: '电话',
    area: '区域',
    date: '日期',
    time: '时间',
    
    // Actions
    viewDetails: '查看详情',
    viewOrder: '查看订单',
    viewMyOrders: '查看我的订单',
    contactUs: '联系我们',
    
    // Footer
    contactSupport: '如有任何问题，请联系我们的客服团队。',
    allRightsReserved: '保留所有权利。',
    unsubscribe: '取消订阅',
    
    // Address components
    unit: '单元',
    buzzCode: '门禁码',
    
    // Misc
    or: '或',
    and: '和',
    from: '从',
    to: '到'
  },
  en: {
    // Greetings
    dear: 'Dear',
    hi: 'Hi',
    hello: 'Hello',
    
    // Closings
    regards: 'Regards',
    bestRegards: 'Best regards',
    thankYou: 'Thank you',
    
    // Common labels
    orderNumber: 'Order Number',
    orderDate: 'Order Date',
    total: 'Total',
    subtotal: 'Subtotal',
    status: 'Status',
    address: 'Address',
    phone: 'Phone',
    area: 'Area',
    date: 'Date',
    time: 'Time',
    
    // Actions
    viewDetails: 'View Details',
    viewOrder: 'View Order',
    viewMyOrders: 'View My Orders',
    contactUs: 'Contact Us',
    
    // Footer
    contactSupport: 'If you have any questions, please contact our customer service team.',
    allRightsReserved: 'All rights reserved.',
    unsubscribe: 'Unsubscribe',
    
    // Address components
    unit: 'Unit',
    buzzCode: 'Buzz Code',
    
    // Misc
    or: 'or',
    and: 'and',
    from: 'from',
    to: 'to'
  }
};

/**
 * Order-related translations
 */
export const orderTranslations = {
  zh: {
    orderConfirmation: '订单确认',
    orderStatusUpdate: '订单状态更新',
    orderDetails: '订单详情',
    selectedMeals: '已选餐点',
    deliveryInfo: '配送信息',
    specialInstructions: '特别说明',
    
    // Order statuses
    pending: '待确认',
    confirmed: '已确认',
    delivery: '配送中',
    delivered: '已送达',
    cancelled: '已取消',
    refunded: '已退款',
    
    // Status descriptions
    statusUpdated: '您的订单状态已更新。',
    orderConfirmed: '您的订单已确认。',
    orderInDelivery: '您的餐点正在配送中，请确保您的地址信息准确，保持电话畅通。',
    orderDelivered: '您的订单已送达。祝您用餐愉快！',
    orderCancelled: '您的订单已取消。',
    orderRefunded: '您的订单已退款，餐券已返还到您的账户。',
    
    // Messages
    thankYouForOrder: '感谢您的订购！您的订单已成功提交。',
    thankYouForOrderDaily: '感谢您的订购！您的每日直送订单已成功提交。',
    statusChangedFrom: '订单状态已从',
    
    // Meal types
    twoDish: '2菜',
    threeDish: '3菜',
    meals: '餐',
    voucher: '张',
    twoDishVoucher: '2菜餐券',
    threeDishVoucher: '3菜餐券',
    
    // Days
    sunday: '周日',
    monday: '周一',
    tuesday: '周二',
    wednesday: '周三',
    thursday: '周四',
    friday: '周五',
    saturday: '周六'
  },
  en: {
    orderConfirmation: 'Order Confirmation',
    orderStatusUpdate: 'Order Status Update',
    orderDetails: 'Order Details',
    selectedMeals: 'Selected Meals',
    deliveryInfo: 'Delivery Information',
    specialInstructions: 'Special Instructions',
    
    // Order statuses
    pending: 'Pending',
    confirmed: 'Confirmed',
    delivery: 'In Delivery',
    delivered: 'Delivered',
    cancelled: 'Cancelled',
    refunded: 'Refunded',
    
    // Status descriptions
    statusUpdated: 'Your order status has been updated.',
    orderConfirmed: 'Your order has been confirmed.',
    orderInDelivery: 'Your meals are being delivered. Please ensure your address is correct and your phone is available.',
    orderDelivered: 'Your order has been delivered. Enjoy your meal!',
    orderCancelled: 'Your order has been cancelled.',
    orderRefunded: 'Your order has been refunded, and vouchers have been returned to your account.',
    
    // Messages
    thankYouForOrder: 'Thank you for your order! Your order has been successfully submitted.',
    thankYouForOrderDaily: 'Thank you for your order! Your daily delivery order has been successfully submitted.',
    statusChangedFrom: 'Order status changed from',
    
    // Meal types
    twoDish: '2 Dishes',
    threeDish: '3 Dishes',
    meals: 'meals',
    voucher: 'voucher',
    twoDishVoucher: '2-Dish Vouchers',
    threeDishVoucher: '3-Dish Vouchers',
    
    // Days
    sunday: 'Sunday',
    monday: 'Monday',
    tuesday: 'Tuesday',
    wednesday: 'Wednesday',
    thursday: 'Thursday',
    friday: 'Friday',
    saturday: 'Saturday'
  }
};

/**
 * Account-related translations
 */
export const accountTranslations = {
  zh: {
    welcome: '欢迎',
    welcomeToKapioo: '欢迎加入Kapioo！',
    thankYouForJoining: '感谢您选择Kapioo餐饮订阅服务！',
    accountCreated: '您的账户已成功创建',
    accountCreatedDesc: '您现在可以开始浏览我们的菜单，并订阅您喜爱的餐食计划。',
    goToDashboard: '进入您的账户',
    exploreMenu: '探索菜单',
    exploreMenuDesc: '浏览我们的特色菜品',
    choosePlan: '选择计划',
    choosePlanDesc: '定制您的餐食订阅',
    onTimeDelivery: '按时配送',
    onTimeDeliveryDesc: '享受新鲜餐食送到家',
    followUs: '关注我们的社交媒体获取最新信息',
    
    verificationCode: '验证码',
    verifyEmail: '验证邮箱',
    verifyYourEmail: '请验证您的邮箱',
    verificationRequired: '请使用以下验证码完成邮箱验证',
    enterCodePrompt: '请在注册页面输入此验证码',
    codeExpiresIn: '此验证码将在10分钟后过期',
    
    passwordReset: '密码重置',
    resetYourPassword: '重置您的密码',
    resetCode: '重置码',
    resetPasswordPrompt: '我们收到了重置您密码的请求',
    enterResetCode: '请在重置密码页面输入此重置码',
    resetCodeExpiresIn: '此重置码将在10分钟后过期',
    didNotRequest: '如果您没有请求重置密码，请忽略此邮件',
    
    creditsAdded: '餐券已添加',
    voucherAdded: '餐券已添加',
    requestApproved: '请求已批准',
    requestDeclined: '请求已拒绝',
    
    // Credit/Voucher purchase
    purchaseRequestUpdate: '购买请求更新',
    creditPurchaseApproved: '您的餐券购买请求已批准',
    creditPurchaseDeclined: '您的餐券购买请求已拒绝',
    voucherPurchaseApproved: '您的餐券购买请求已批准',
    voucherPurchaseDeclined: '您的餐券购买请求已拒绝',
    creditsAddedToAccount: '餐券已添加到您的账户',
    vouchersAddedToAccount: '餐券已添加到您的账户',
    requestId: '请求编号',
    purchaseDetails: '购买详情',
    planDescription: '套餐说明',
    creditsAmount: '餐券数量',
    voucherType: '餐券类型',
    voucherQuantity: '数量',
    adminNotes: '管理员备注',
    sorryForInconvenience: '很抱歉给您带来不便',
    contactForQuestions: '如有任何问题，请联系我们的客服团队',
    twoDishMeal: '2菜套餐',
    threeDishMeal: '3菜套餐',
    
    // Manual balance update
    voucherAdded: '餐券已添加',
    creditsAddedManual: '餐券已添加',
    twoDishVoucherAdded: '2菜餐券已添加',
    threeDishVoucherAdded: '3菜餐券已添加',
    weeklySixMealsAdded: '6餐一周已添加',
    weeklyEightMealsAdded: '8餐一周已添加',
    weeklyTenMealsAdded: '10餐一周已添加',
    weeklyTwelveMealsAdded: '12餐一周已添加',
    transactionDetails: '交易详情',
    transactionId: '交易编号',
    date: '日期',
    addedAmount: '添加数量',
    newBalance: '新余额',
    youCanUseVouchers: '您可以在您的 Kapioo 账户中使用这些餐券订购餐点',
    twoDishVoucherName: '2菜餐券',
    threeDishVoucherName: '3菜餐券',
    weeklySixMeals: '6餐一周',
    weeklyEightMeals: '8餐一周',
    weeklyTenMeals: '10餐一周',
    weeklyTwelveMeals: '12餐一周',
    
    // Request confirmation
    requestSubmitted: '请求已提交',
    creditRequestSubmitted: '充值请求已提交',
    voucherRequestSubmitted: '餐券购买请求已提交',
    thankYouForRequest: '感谢您提交请求。我们已收到您的请求，并将尽快处理',
    requestDetailsBelow: '以下是您的请求详情',
    paymentMethod: '付款方式',
    wechatTransfer: '微信转账',
    interacTransfer: 'Interac e-Transfer',
    referenceNumber: 'INTERAC 电子转账邮箱',
    originalPrice: '原始价格',
    actualPayment: '实际付款',
    wechatDiscount: '含10%折扣',
    taxIncluded: '含13%税费',
    selectedPlan: '所选套餐',
    status: '状态',
    pendingReview: '待审核',
    adminWillReview: '我们的管理员将尽快审核您的请求。一旦审核通过，您的账户将立即更新，您将收到确认邮件',
    viewCreditHistory: '查看我的充值记录',
    viewVoucherHistory: '查看我的餐券记录',
    autoGeneratedEmail: '此邮件由系统自动发送，请勿回复'
  },
  en: {
    welcome: 'Welcome',
    welcomeToKapioo: 'Welcome to Kapioo!',
    thankYouForJoining: 'Thank you for choosing Kapioo meal subscription service!',
    accountCreated: 'Your Account Has Been Successfully Created',
    accountCreatedDesc: 'You can now start browsing our menu and subscribe to your favorite meal plans.',
    goToDashboard: 'Go to Your Account',
    exploreMenu: 'Explore Menu',
    exploreMenuDesc: 'Browse our featured dishes',
    choosePlan: 'Choose Plan',
    choosePlanDesc: 'Customize your meal subscription',
    onTimeDelivery: 'On-Time Delivery',
    onTimeDeliveryDesc: 'Enjoy fresh meals delivered to your door',
    followUs: 'Follow us on social media for the latest updates',
    
    verificationCode: 'Verification Code',
    verifyEmail: 'Verify Email',
    verifyYourEmail: 'Please Verify Your Email',
    verificationRequired: 'Please use the following verification code to complete your email verification',
    enterCodePrompt: 'Please enter this verification code on the registration page',
    codeExpiresIn: 'This verification code will expire in 10 minutes',
    
    passwordReset: 'Password Reset',
    resetYourPassword: 'Reset Your Password',
    resetCode: 'Reset Code',
    resetPasswordPrompt: 'We received a request to reset your password',
    enterResetCode: 'Please enter this reset code on the password reset page',
    resetCodeExpiresIn: 'This reset code will expire in 10 minutes',
    didNotRequest: 'If you did not request a password reset, please ignore this email',
    
    creditsAdded: 'Credits Added',
    voucherAdded: 'Voucher Added',
    requestApproved: 'Request Approved',
    requestDeclined: 'Request Declined',
    
    // Credit/Voucher purchase
    purchaseRequestUpdate: 'Purchase Request Update',
    creditPurchaseApproved: 'Your credit purchase request has been approved',
    creditPurchaseDeclined: 'Your credit purchase request has been declined',
    voucherPurchaseApproved: 'Your voucher purchase request has been approved',
    voucherPurchaseDeclined: 'Your voucher purchase request has been declined',
    creditsAddedToAccount: 'Credits have been added to your account',
    vouchersAddedToAccount: 'Vouchers have been added to your account',
    requestId: 'Request ID',
    purchaseDetails: 'Purchase Details',
    planDescription: 'Plan Description',
    creditsAmount: 'Credits Amount',
    voucherType: 'Voucher Type',
    voucherQuantity: 'Quantity',
    adminNotes: 'Admin Notes',
    sorryForInconvenience: 'We apologize for any inconvenience',
    contactForQuestions: 'If you have any questions, please contact our customer service team',
    twoDishMeal: '2-Dish Meal',
    threeDishMeal: '3-Dish Meal',
    
    // Manual balance update
    voucherAdded: 'Voucher Added',
    creditsAddedManual: 'Credits Added',
    twoDishVoucherAdded: '2-Dish Voucher Added',
    threeDishVoucherAdded: '3-Dish Voucher Added',
    weeklySixMealsAdded: '6-Meal Weekly Plan Added',
    weeklyEightMealsAdded: '8-Meal Weekly Plan Added',
    weeklyTenMealsAdded: '10-Meal Weekly Plan Added',
    weeklyTwelveMealsAdded: '12-Meal Weekly Plan Added',
    transactionDetails: 'Transaction Details',
    transactionId: 'Transaction ID',
    date: 'Date',
    addedAmount: 'Added Amount',
    newBalance: 'New Balance',
    youCanUseVouchers: 'You can use these vouchers to order meals in your Kapioo account',
    twoDishVoucherName: '2-Dish Voucher',
    threeDishVoucherName: '3-Dish Voucher',
    weeklySixMeals: '6-Meal Weekly',
    weeklyEightMeals: '8-Meal Weekly',
    weeklyTenMeals: '10-Meal Weekly',
    weeklyTwelveMeals: '12-Meal Weekly',
    
    // Request confirmation
    requestSubmitted: 'Request Submitted',
    creditRequestSubmitted: 'Credit Purchase Request Submitted',
    voucherRequestSubmitted: 'Voucher Purchase Request Submitted',
    thankYouForRequest: 'Thank you for submitting your request. We have received it and will process it as soon as possible',
    requestDetailsBelow: 'Below are your request details',
    paymentMethod: 'Payment Method',
    wechatTransfer: 'WeChat Transfer',
    interacTransfer: 'Interac e-Transfer',
    referenceNumber: 'INTERAC e-Transfer Email',
    originalPrice: 'Original Price',
    actualPayment: 'Actual Payment',
    wechatDiscount: 'Includes 10% discount',
    taxIncluded: 'Includes 13% tax',
    selectedPlan: 'Selected Plan',
    status: 'Status',
    pendingReview: 'Pending Review',
    adminWillReview: 'Our administrator will review your request as soon as possible. Once approved, your account will be updated immediately and you will receive a confirmation email',
    viewCreditHistory: 'View My Credit History',
    viewVoucherHistory: 'View My Voucher History',
    autoGeneratedEmail: 'This is an automated email, please do not reply'
  }
};

/**
 * Weekly subscription translations
 */
export const weeklyTranslations = {
  zh: {
    mealsPerWeek: (count: number) => `${count}餐一周`,
    weeklyPlan: '周次套餐'
  },
  en: {
    mealsPerWeek: (count: number) => `${count} Meals/Week`,
    weeklyPlan: 'Weekly Plan'
  }
};

/**
 * Menu update notification translations (Daily Delivery)
 */
export const menuUpdateTranslations = {
  zh: {
    subject: '[Kapioo] 菜单已更新 - 探索我们的新菜品！',
    title: '菜单已更新！',
    greeting: (name: string) => `亲爱的 ${name}，`,
    mainMessage: '我们很高兴地通知您，Kapioo 每日直送菜单已更新！',
    description: '我们精心准备了全新的美味菜品，期待为您带来更多惊喜。',
    ctaButton: '立即查看菜单',
    footerNote: '感谢您选择 Kapioo！',
    reminderTitle: '温馨提示',
    reminderText: '您目前拥有每日直送餐券。立即使用，享受我们的新鲜美味！'
  },
  en: {
    subject: '[Kapioo] Menu Updated - Explore Our New Dishes!',
    title: 'Menu Updated!',
    greeting: (name: string) => `Dear ${name},`,
    mainMessage: 'We are excited to announce that our Kapioo Daily Delivery menu has been updated!',
    description: 'We have carefully prepared fresh new delicious dishes and look forward to bringing you more delightful surprises.',
    ctaButton: 'View Menu Now',
    footerNote: 'Thank you for choosing Kapioo!',
    reminderTitle: 'Friendly Reminder',
    reminderText: 'You currently have daily delivery vouchers. Use them now to enjoy our fresh delicious meals!'
  }
};

/**
 * Weekly menu update notification translations
 */
export const weeklyMenuUpdateTranslations = {
  zh: {
    subject: '[Kapioo] 周次菜单已更新 - 探索我们的新菜品！',
    title: '周次菜单已更新！',
    greeting: (name: string) => `亲爱的 ${name}，`,
    mainMessage: '我们很高兴地通知您，Kapioo 周次订餐菜单已更新！',
    description: '我们精心准备了全新的美味菜品，期待为您带来更多惊喜。',
    ctaButton: '立即查看菜单',
    footerNote: '感谢您选择 Kapioo！',
    reminderTitle: '温馨提示',
    reminderText: '您目前拥有周次订餐积分。立即使用，享受我们的新鲜美味！'
  },
  en: {
    subject: '[Kapioo] Weekly Menu Updated - Explore Our New Dishes!',
    title: 'Weekly Menu Updated!',
    greeting: (name: string) => `Dear ${name},`,
    mainMessage: 'We are excited to announce that our Kapioo Weekly Subscription menu has been updated!',
    description: 'We have carefully prepared fresh new delicious dishes and look forward to bringing you more delightful surprises.',
    ctaButton: 'View Menu Now',
    footerNote: 'Thank you for choosing Kapioo!',
    reminderTitle: 'Friendly Reminder',
    reminderText: 'You currently have weekly subscription credits. Use them now to enjoy our fresh delicious meals!'
  }
};

// Next Week Menu Update translations (NEW)
export const nextWeekMenuUpdateTranslations = {
  zh: {
    subject: '[Kapioo] 请查看下周菜单，不要忘记选餐喔～',
    title: '下周菜单准备好了',
    greeting: (name: string) => `亲爱的 ${name}，`,
    mainMessage: 'Kapioo 下周的菜单已可以查阅了喔～',
    description: '下周我们为您精心准备了全新的美味菜品，期待为您带来更多惊喜。',
    subHeading: '',
    ctaButton: '查看下周菜单',
    footerNote: '',
    unsubscribe: '取消订阅'
  },
  en: {
    subject: '[Kapioo] Next week\'s menu is up, order now~',
    title: 'Next Week Menu is updated.',
    greeting: (name: string) => `Dear ${name},`,
    mainMessage: 'Kapioo\'s menu for next week is ready to be viewed.',
    description: 'This week we have carefully prepared fresh new delicious dishes and look forward to bringing you more delightful surprises.',
    subHeading: '',
    ctaButton: 'View Next Week Menu',
    footerNote: '',
    unsubscribe: 'Unsubscribe'
  }
};

/**
 * Helper function to get translations for a specific language
 */
export function getTranslations(language: Language = 'zh') {
  return {
    common: commonTranslations[language],
    order: orderTranslations[language],
    account: accountTranslations[language],
    weekly: weeklyTranslations[language],
    menuUpdate: menuUpdateTranslations[language],
    weeklyMenuUpdate: weeklyMenuUpdateTranslations[language],
    nextWeekMenuUpdate: nextWeekMenuUpdateTranslations[language]
  };
}

/**
 * Helper function to get order status info (text + color)
 */
export function getOrderStatusInfo(status: string, language: Language = 'zh') {
  const t = orderTranslations[language];
  
  const statusMap: Record<string, { text: string; color: string; description: string }> = {
    pending: {
      text: t.pending,
      color: '#6c757d',
      description: ''
    },
    confirmed: {
      text: t.confirmed,
      color: '#007bff',
      description: t.orderConfirmed
    },
    delivery: {
      text: t.delivery,
      color: '#6610f2',
      description: t.orderInDelivery
    },
    delivered: {
      text: t.delivered,
      color: '#198754',
      description: t.orderDelivered
    },
    cancelled: {
      text: t.cancelled,
      color: '#dc3545',
      description: t.orderCancelled
    },
    refunded: {
      text: t.refunded,
      color: '#fd7e14',
      description: t.orderRefunded
    }
  };
  
  return statusMap[status] || statusMap.pending;
}

/**
 * Helper function to format address with proper translation
 */
export function formatAddress(addr: any, language: Language = 'zh'): string {
  const t = commonTranslations[language];
  let formattedAddress = '';
  
  if (addr.unitNumber) formattedAddress += `${t.unit} ${addr.unitNumber}, `;
  formattedAddress += `${addr.streetAddress}, ${addr.city || ''}, ${addr.province}, ${addr.postalCode}, ${addr.country}`;
  if (addr.buzzCode) formattedAddress += ` (${t.buzzCode}: ${addr.buzzCode})`;
  
  return formattedAddress;
}

/**
 * Helper function to get day name translation
 */
export function getDayName(dayId: string, language: Language = 'zh'): string {
  const t = orderTranslations[language];
  const dayMap: Record<string, string> = {
    sunday: t.sunday,
    monday: t.monday,
    tuesday: t.tuesday,
    wednesday: t.wednesday,
    thursday: t.thursday,
    friday: t.friday,
    saturday: t.saturday
  };
  
  return dayMap[dayId.toLowerCase()] || dayId;
}

/**
 * Helper to get subject line for order confirmation
 */
export function getOrderConfirmationSubject(orderId: string, language: Language = 'zh'): string {
  const t = orderTranslations[language];
  return language === 'zh' 
    ? `[Kapioo] ${t.orderConfirmation} #${orderId}`
    : `[Kapioo] ${t.orderConfirmation} #${orderId}`;
}

/**
 * Helper to get subject line for status update
 */
export function getStatusUpdateSubject(orderId: string, status: string, language: Language = 'zh'): string {
  const statusInfo = getOrderStatusInfo(status, language);
  return language === 'zh'
    ? `订单${statusInfo.text} - Kapioo #${orderId}`
    : `Order ${statusInfo.text} - Kapioo #${orderId}`;
}

