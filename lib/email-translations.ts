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
    orderConfirmed: '您的订单已确认，我们正在准备您的餐点。',
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
    orderConfirmed: 'Your order has been confirmed, and we are preparing your meals.',
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
    welcomeMessage: '欢迎加入 Kapioo！',
    accountCreated: '您的账户已成功创建。',
    verificationCode: '验证码',
    verifyEmail: '验证邮箱',
    verifyYourEmail: '请验证您的邮箱',
    passwordReset: '密码重置',
    resetYourPassword: '重置您的密码',
    resetCode: '重置码',
    creditsAdded: '餐券已添加',
    voucherAdded: '餐券已添加',
    requestApproved: '请求已批准',
    requestDeclined: '请求已拒绝'
  },
  en: {
    welcome: 'Welcome',
    welcomeMessage: 'Welcome to Kapioo!',
    accountCreated: 'Your account has been successfully created.',
    verificationCode: 'Verification Code',
    verifyEmail: 'Verify Email',
    verifyYourEmail: 'Please verify your email',
    passwordReset: 'Password Reset',
    resetYourPassword: 'Reset Your Password',
    resetCode: 'Reset Code',
    creditsAdded: 'Credits Added',
    voucherAdded: 'Voucher Added',
    requestApproved: 'Request Approved',
    requestDeclined: 'Request Declined'
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
 * Helper function to get translations for a specific language
 */
export function getTranslations(language: Language = 'zh') {
  return {
    common: commonTranslations[language],
    order: orderTranslations[language],
    account: accountTranslations[language],
    weekly: weeklyTranslations[language]
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

