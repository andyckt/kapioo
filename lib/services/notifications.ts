import type { Language } from '@/lib/email-translations';
import { getOrderStatusInfo, getStatusUpdateSubject, getTranslations } from '@/lib/email-translations';
import { getEmailLogoAbsoluteUrl } from '@/lib/email/logo-url';
import { formatOrderStatusEmailLineHtml } from '@/lib/email/order-status-email';
import type { IDailyDeliveryOrder } from '@/models/DailyDeliveryOrder';
import { sendEmail, formatDailyVoucherTotalsLine } from './email';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

export enum NotificationType {
  NEW_ORDER = 'new_order',
  ORDER_CONFIRMED = 'order_confirmed',
  ORDER_DELIVERY = 'order_delivery',
  ORDER_DELIVERED = 'order_delivered',
  ORDER_CANCELLED = 'order_cancelled',
  ORDER_REFUNDED = 'order_refunded',
  CREDITS_ADDED = 'credits_added',
}

export type NotificationUser = {
  email: string;
  name: string;
  credits: number;
  languagePreference?: Language;
  [key: string]: unknown;
};

function resolveNotificationLanguage(languagePreference?: unknown): Language {
  return languagePreference === 'en' ? 'en' : 'zh';
}

function mapNotificationTypeToDailyStatus(
  notificationType: NotificationType,
  order: IDailyDeliveryOrder
): IDailyDeliveryOrder['status'] {
  switch (notificationType) {
    case NotificationType.NEW_ORDER:
      return 'pending';
    case NotificationType.ORDER_CONFIRMED:
      return 'confirmed';
    case NotificationType.ORDER_DELIVERY:
      return 'delivery';
    case NotificationType.ORDER_DELIVERED:
      return 'delivered';
    case NotificationType.ORDER_CANCELLED:
      return 'cancelled';
    case NotificationType.ORDER_REFUNDED:
      return 'refunded';
    case NotificationType.CREDITS_ADDED:
      return order.status;
  }
}

export const sendCreditsAddedNotification = async (
  user: NotificationUser,
  amount: number,
  transactionId: string
): Promise<void> => {
  try {
    const subject = `餐券已添加 - Kapioo`;

    const html = `
      <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; border-radius: 8px; background-color: #fff; box-shadow: 0 4px 20px rgba(0,0,0,0.05);">
        <div style="text-align: center; margin-bottom: 30px;">
          <img src="${getEmailLogoAbsoluteUrl()}" alt="Kapioo Logo" style="width: 120px; height: auto;" />
        </div>
        <h2 style="color: #C2884E; text-align: center; font-size: 24px; margin-bottom: 20px;">餐券已添加到您的账户</h2>
        <p style="color: #333; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
          亲爱的 ${user.name}，您的账户已成功添加餐券。
        </p>
        
        <div style="background-color: #F8F0E5; border-radius: 8px; padding: 20px; margin-bottom: 25px;">
          <div style="margin-bottom: 15px;">
            <h3 style="color: #C2884E; margin: 0 0 5px 0;">交易确认</h3>
            <p style="color: #666; margin: 0;">餐券已添加到您的账户</p>
          </div>
          
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #E8D5C4; color: #666;">交易编号:</td>
              <td style="padding: 8px 0; border-bottom: 1px solid #E8D5C4; text-align: right;">${transactionId}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #E8D5C4; color: #666;">日期:</td>
              <td style="padding: 8px 0; border-bottom: 1px solid #E8D5C4; text-align: right;">${new Date().toLocaleDateString('zh-CN')}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #E8D5C4; color: #666;">添加数量:</td>
              <td style="padding: 8px 0; border-bottom: 1px solid #E8D5C4; text-align: right; color: #4CAF50; font-weight: bold;">+${amount} 餐券</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #E8D5C4; color: #666;">新餐券余额:</td>
              <td style="padding: 8px 0; border-bottom: 1px solid #E8D5C4; text-align: right; font-weight: bold;">${user.credits} 餐券</td>
            </tr>
          </table>
        </div>
        
        <p style="color: #333; font-size: 16px; line-height: 1.6; margin-bottom: 10px; text-align: center;">
          您可以在您的 <a href="${BASE_URL}/dashboard" style="color: #C2884E; text-decoration: none; font-weight: bold;">Kapioo 账户</a> 中使用这些餐券订购餐点。
        </p>
        
        <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eaeaea; text-align: center;">
          <p style="color: #999; font-size: 14px;">
            如有任何问题，请随时联系我们: <a href="mailto:kapioomeal@gmail.com" style="color: #C2884E;">kapioomeal@gmail.com</a>
          </p>
          <p style="color: #999; font-size: 13px;">&copy; ${new Date().getFullYear()} Kapioo。保留所有权利。</p>
        </div>
      </div>
    `;

    await sendEmail({
      to: user.email,
      subject,
      html,
    });

    console.log(`Credits added notification sent for transaction ${transactionId}`);
  } catch (error) {
    console.error('Error sending credits added notification:', error);
  }
};

export const sendDailyOrderStatusUpdateNotification = async (
  email: string,
  name: string,
  orderId: string,
  status: string,
  items: Array<{
    day?: string;
    date?: string;
    comboName?: string;
    type?: string;
    quantity?: number;
    dayId?: string;
    optionName?: string;
  }>,
  previousStatus: string = 'pending',
  language: Language = 'zh',
  orderCreatedAt?: Date,
  voucherCost?: { twoDish: number; threeDish: number } | null
): Promise<void> => {
  try {
    const t = getTranslations(language);
    const currentStatusInfo = getOrderStatusInfo(status, language);
    const previousStatusInfo = getOrderStatusInfo(previousStatus, language);
    const subject = getStatusUpdateSubject(orderId, status, language);
    const isOrderPlacedNotification = status === 'pending';

    if (!currentStatusInfo.description && !isOrderPlacedNotification) {
      return;
    }

    const statusText = currentStatusInfo.text;
    const statusDescription = isOrderPlacedNotification
      ? t.order.thankYouForOrderDaily
      : currentStatusInfo.description;
    const statusColor = currentStatusInfo.color;
    const previousStatusText = previousStatusInfo.text;
    const formattedItems = items
      .map((item) => `<li style="margin-bottom: 6px;">${formatOrderStatusEmailLineHtml(item, language)}</li>`)
      .join('');

    const vTwo = Number(voucherCost?.twoDish) || 0;
    const vThree = Number(voucherCost?.threeDish) || 0;
    const voucherTotalsHtml =
      voucherCost != null && (vTwo > 0 || vThree > 0)
        ? `
        <div style="background-color: #F8F0E5; border-radius: 8px; padding: 16px 20px; margin-bottom: 25px;">
          <h3 style="color: #C2884E; margin-top: 0; margin-bottom: 8px; font-size: 16px;">${t.common.total}</h3>
          <p style="margin: 0; color: #333; font-size: 15px; line-height: 1.6;">
            ${formatDailyVoucherTotalsLine(vTwo, vThree, language)}
          </p>
        </div>
        `
        : '';

    const locale = language === 'zh' ? 'zh-CN' : 'en-US';
    const dashboardText = language === 'zh' ? 'Kapioo 账户' : 'Kapioo account';
    const viewDetailsText = language === 'zh' ? '中查看订单详情' : ' to view order details';
    const contactText = language === 'zh'
      ? '如有任何问题，请随时联系我们'
      : 'If you have any questions, please contact us';
    const statusPanel = isOrderPlacedNotification
      ? `
        <div style="text-align: center; margin: 30px 0;">
          <div style="display: inline-block; background-color: #F8F0E5; border-radius: 8px; padding: 20px 40px;">
            <p style="margin: 0 0 10px 0; color: ${statusColor}; font-weight: bold; font-size: 20px;">${statusText}</p>
            <p style="margin: 0; color: #333;">${statusDescription}</p>
          </div>
        </div>
      `
      : `
        <div style="text-align: center; margin: 30px 0;">
          <div style="display: inline-block; background-color: #F8F0E5; border-radius: 8px; padding: 20px 40px;">
            <p style="margin: 0; color: #666;">${t.order.statusChangedFrom}</p>
            <p style="margin: 10px 0; color: #666; font-size: 16px;">
              <span style="color: #888; text-decoration: line-through;">${previousStatusText}</span>
              &nbsp;&rarr;&nbsp;
              <span style="color: ${statusColor}; font-weight: bold; font-size: 20px;">${statusText}</span>
            </p>
            <p style="margin: 0; color: #333;">${statusDescription}</p>
          </div>
        </div>
      `;

    const html = `
      <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; border-radius: 8px; background-color: #fff; box-shadow: 0 4px 20px rgba(0,0,0,0.05);">
        <div style="text-align: center; margin-bottom: 30px;">
          <img src="${getEmailLogoAbsoluteUrl()}" alt="Kapioo Logo" style="width: 120px; height: auto;" />
        </div>
        <h2 style="color: #C2884E; text-align: center; font-size: 24px; margin-bottom: 20px;">${isOrderPlacedNotification ? t.order.orderConfirmation : t.order.orderStatusUpdate}</h2>
        <p style="color: #333; font-size: 16px; line-height: 1.6; margin-bottom: 25px; text-align: center;">
          ${t.common.dear} ${name}, ${isOrderPlacedNotification ? statusDescription : t.order.statusUpdated}
        </p>
        
        ${statusPanel}
        
        <div style="background-color: #F8F0E5; border-radius: 8px; padding: 20px; margin-bottom: 25px;">
          <h3 style="color: #C2884E; margin-top: 0;">${t.order.orderDetails}</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #E8D5C4; color: #666;">${t.common.orderNumber}:</td>
              <td style="padding: 8px 0; border-bottom: 1px solid #E8D5C4; font-weight: bold; text-align: right;">${orderId}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #E8D5C4; color: #666;">${t.common.orderDate}:</td>
              <td style="padding: 8px 0; border-bottom: 1px solid #E8D5C4; text-align: right;">${orderCreatedAt ? new Date(orderCreatedAt).toLocaleDateString(locale) : new Date().toLocaleDateString(locale)}</td>
            </tr>
          </table>
        </div>
        
        ${formattedItems ? `
        <div style="background-color: #F8F0E5; border-radius: 8px; padding: 20px; margin-bottom: 25px;">
          <h3 style="color: #C2884E; margin-top: 0;">${t.order.selectedMeals}</h3>
          <ul style="margin: 0; padding-left: 20px; color: #333; line-height: 1.8;">
            ${formattedItems}
          </ul>
        </div>
        ` : ''}
        
        ${voucherTotalsHtml}
        
        <p style="color: #333; font-size: 16px; line-height: 1.6; margin-bottom: 10px; text-align: center;">
          ${language === 'zh' ? '您可以在您的' : 'You can'} <a href="${BASE_URL}/dashboard" style="color: #C2884E; text-decoration: none; font-weight: bold;">${dashboardText}</a> ${viewDetailsText}.
        </p>
        
        <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eaeaea; text-align: center;">
          <p style="color: #999; font-size: 14px;">
            ${contactText}: <a href="mailto:kapioomeal@gmail.com" style="color: #C2884E;">kapioomeal@gmail.com</a>
          </p>
          <p style="color: #999; font-size: 13px;">&copy; ${new Date().getFullYear()} Kapioo. ${t.common.allRightsReserved}</p>
        </div>
      </div>
    `;

    await sendEmail({
      to: email,
      subject,
      html,
    });

    console.log(`Daily order status update notification sent for order ${orderId}`);
  } catch (error) {
    console.error('Error sending daily order status update notification:', error);
  }
};

export const handleOrderNotification = async (
  notificationType: NotificationType,
  order: IDailyDeliveryOrder | null,
  user: NotificationUser | null,
  previousStatus?: string,
  transactionId?: string,
  amount?: number,
  refundedCredits?: number
): Promise<void> => {
  void refundedCredits;

  try {
    switch (notificationType) {
      case NotificationType.NEW_ORDER:
      case NotificationType.ORDER_CONFIRMED:
      case NotificationType.ORDER_DELIVERY:
      case NotificationType.ORDER_DELIVERED:
      case NotificationType.ORDER_CANCELLED:
      case NotificationType.ORDER_REFUNDED:
        if (!order) {
          throw new Error('Order is required for order notifications');
        }
        if (!user?.email || !user?.name) {
          throw new Error('User is required for order notifications');
        }

        await sendDailyOrderStatusUpdateNotification(
          user.email,
          user.name,
          order.orderId,
          mapNotificationTypeToDailyStatus(notificationType, order),
          Array.isArray(order.items) ? order.items : [],
          previousStatus || 'pending',
          resolveNotificationLanguage(user.languagePreference),
          order.createdAt,
          order.voucherCost
        );
        break;

      case NotificationType.CREDITS_ADDED:
        if (user && transactionId && amount !== undefined) {
          await sendCreditsAddedNotification(user, amount, transactionId);
        }
        break;

      default:
        break;
    }
  } catch (error) {
    console.error('Error handling order notification:', error);
  }
};
