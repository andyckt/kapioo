import { sendEmail } from './email';
import { IOrder } from '@/models/Order';
import { IUser } from '@/models/User';

// AWS S3 hosted logo URL for emails
const LOGO_URL = 'https://meal-subscription-andy-photos.s3.ap-southeast-2.amazonaws.com/src/Kapioo.png';
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

// Types of notifications
export enum NotificationType {
  NEW_ORDER = 'new_order',
  ORDER_CONFIRMED = 'order_confirmed',
  ORDER_DELIVERY = 'order_delivery',
  ORDER_DELIVERED = 'order_delivered',
  ORDER_CANCELLED = 'order_cancelled',
  ORDER_REFUNDED = 'order_refunded',
  CREDITS_ADDED = 'credits_added'
}

// Format meal information for display in emails
const formatSelectedMeals = (selectedMeals: Record<string, any>): string => {
  if (!selectedMeals) return "None";
  
  const mealsHtml = Object.entries(selectedMeals)
    .filter(([_, value]) => {
      // Handle both old and new structure
      return typeof value === 'boolean' ? value : value.selected;
    })
    .map(([day, value]) => {
      const formattedDay = day.charAt(0).toUpperCase() + day.slice(1);
      
      // Handle both old and new structure
      if (typeof value === 'object' && value.date) {
        return `<li>${formattedDay} (${value.date})</li>`;
      }
      
      return `<li>${formattedDay}</li>`;
    })
    .join('');
    
  return `<ul>${mealsHtml}</ul>`;
};

// Format address for display in emails
const formatAddress = (address: any): string => {
  if (!address) return "No address provided";
  
  let parts = [];
  
  if (address.unitNumber) {
    parts.push(`Unit ${address.unitNumber}`);
  }
  
  if (address.streetAddress) {
    parts.push(address.streetAddress);
  }
  
  let cityStateZip = [
    address.city || '',
    address.province || '',
    address.postalCode || ''
  ].filter(Boolean).join(', ');
  
  if (cityStateZip) {
    parts.push(cityStateZip);
  }
  
  if (address.country) {
    parts.push(address.country);
  }
  
  if (address.buzzCode) {
    parts.push(`Buzz code: ${address.buzzCode}`);
  }
  
  return parts.join('<br>');
};

// Send notification to customer when a new order is placed
export const sendNewOrderNotification = async (order: IOrder, user: IUser): Promise<void> => {
  try {
    const subject = `订单确认 - Kapioo #${order.orderId}`;
    
    const html = `
      <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; border-radius: 8px; background-color: #fff; box-shadow: 0 4px 20px rgba(0,0,0,0.05);">
        <div style="text-align: center; margin-bottom: 30px;">
          <img src="${LOGO_URL}" alt="Kapioo Logo" style="width: 120px; height: auto;" />
        </div>
        <h2 style="color: #C2884E; text-align: center; font-size: 24px; margin-bottom: 20px;">订单确认</h2>
        <p style="color: #333; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
          亲爱的 ${user.name}，感谢您在 Kapioo 下单。我们已收到您的订单。
        </p>
        
        <div style="background-color: #F8F0E5; border-radius: 8px; padding: 20px; margin-bottom: 25px;">
          <h3 style="color: #C2884E; margin-top: 0;">订单详情</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #E8D5C4; color: #666;">订单号:</td>
              <td style="padding: 8px 0; border-bottom: 1px solid #E8D5C4; font-weight: bold; text-align: right;">${order.orderId}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #E8D5C4; color: #666;">订单日期:</td>
              <td style="padding: 8px 0; border-bottom: 1px solid #E8D5C4; text-align: right;">${new Date(order.createdAt).toLocaleDateString('zh-CN')}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #E8D5C4; color: #666;">状态:</td>
              <td style="padding: 8px 0; border-bottom: 1px solid #E8D5C4; text-align: right; color: #FFA500; font-weight: bold;">待确认</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #E8D5C4; color: #666;">支付餐卷:</td>
              <td style="padding: 8px 0; border-bottom: 1px solid #E8D5C4; text-align: right;">${order.creditCost} 餐卷</td>
            </tr>
          </table>
        </div>
        
        <div style="background-color: #F8F0E5; border-radius: 8px; padding: 20px; margin-bottom: 25px;">
          <h3 style="color: #C2884E; margin-top: 0;">已选择的餐点</h3>
          ${formatSelectedMeals(order.selectedMeals)}
        </div>
        
        <div style="background-color: #F8F0E5; border-radius: 8px; padding: 20px; margin-bottom: 25px;">
          <h3 style="color: #C2884E; margin-top: 0;">配送地址</h3>
          <p style="color: #333; line-height: 1.6;">
            ${formatAddress(order.deliveryAddress)}
          </p>
        </div>
        
        ${order.specialInstructions ? `
        <div style="background-color: #F8F0E5; border-radius: 8px; padding: 20px; margin-bottom: 25px;">
          <h3 style="color: #C2884E; margin-top: 0;">特殊说明</h3>
          <p style="color: #333; line-height: 1.6;">
            ${order.specialInstructions}
          </p>
        </div>
        ` : ''}
        
        <p style="color: #333; font-size: 16px; line-height: 1.6; margin-bottom: 10px; text-align: center;">
          您可以在您的 <a href="${BASE_URL}/dashboard" style="color: #C2884E; text-decoration: none; font-weight: bold;">Kapioo 账户</a> 中查看订单详情。
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
      html
    });
    
    console.log(`New order notification sent to customer: ${user.email}`);
  } catch (error) {
    console.error('Error sending new order notification to customer:', error);
  }
};

// Send notification to admin when a new order is placed
export const sendNewOrderAdminNotification = async (order: IOrder, user: IUser): Promise<void> => {
  try {
    const subject = `New Order Received - ${order.orderId}`;
    const adminEmail = process.env.ADMIN_EMAIL || 'kapioomeal@gmail.com';
    
    const html = `
      <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; border-radius: 8px; background-color: #fff; box-shadow: 0 4px 20px rgba(0,0,0,0.05);">
        <div style="text-align: center; margin-bottom: 30px;">
          <img src="${LOGO_URL}" alt="Kapioo Logo" style="width: 120px; height: auto;" />
        </div>
        <h2 style="color: #C2884E; text-align: center; font-size: 24px; margin-bottom: 20px;">New Order Received</h2>
        <p style="color: #333; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
          A new order has been placed on Kapioo.
        </p>
        
        <div style="background-color: #F8F0E5; border-radius: 8px; padding: 20px; margin-bottom: 25px;">
          <h3 style="color: #C2884E; margin-top: 0;">Order Details</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #E8D5C4; color: #666;">Order ID:</td>
              <td style="padding: 8px 0; border-bottom: 1px solid #E8D5C4; font-weight: bold; text-align: right;">${order.orderId}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #E8D5C4; color: #666;">Date:</td>
              <td style="padding: 8px 0; border-bottom: 1px solid #E8D5C4; text-align: right;">${new Date(order.createdAt).toLocaleString()}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #E8D5C4; color: #666;">Customer:</td>
              <td style="padding: 8px 0; border-bottom: 1px solid #E8D5C4; text-align: right;">${user.name} (${user.email})</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #E8D5C4; color: #666;">User ID:</td>
              <td style="padding: 8px 0; border-bottom: 1px solid #E8D5C4; text-align: right;">${user.userID}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #E8D5C4; color: #666;">Status:</td>
              <td style="padding: 8px 0; border-bottom: 1px solid #E8D5C4; text-align: right; color: #FFA500; font-weight: bold;">Pending</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #E8D5C4; color: #666;">Credits:</td>
              <td style="padding: 8px 0; border-bottom: 1px solid #E8D5C4; text-align: right;">${order.creditCost}</td>
            </tr>
          </table>
        </div>
        
        <div style="background-color: #F8F0E5; border-radius: 8px; padding: 20px; margin-bottom: 25px;">
          <h3 style="color: #C2884E; margin-top: 0;">Selected Meals</h3>
          ${formatSelectedMeals(order.selectedMeals)}
        </div>
        
        <div style="background-color: #F8F0E5; border-radius: 8px; padding: 20px; margin-bottom: 25px;">
          <h3 style="color: #C2884E; margin-top: 0;">Delivery Address</h3>
          <p style="color: #333; line-height: 1.6;">
            ${formatAddress(order.deliveryAddress)}
          </p>
        </div>
        
        ${order.specialInstructions ? `
        <div style="background-color: #F8F0E5; border-radius: 8px; padding: 20px; margin-bottom: 25px;">
          <h3 style="color: #C2884E; margin-top: 0;">Special Instructions</h3>
          <p style="color: #333; line-height: 1.6;">
            ${order.specialInstructions}
          </p>
        </div>
        ` : ''}
        
        <div style="text-align: center; margin-top: 30px;">
          <a href="${BASE_URL}/admin" style="display: inline-block; background: linear-gradient(135deg, #C2884E 0%, #D1A46C 100%); color: white; padding: 12px 25px; text-decoration: none; border-radius: 6px; font-weight: 500;">
            View in Admin Dashboard
          </a>
        </div>
      </div>
    `;
    
    await sendEmail({
      to: adminEmail,
      subject,
      html
    });
    
    console.log(`New order notification sent to admin: ${adminEmail}`);
  } catch (error) {
    console.error('Error sending new order notification to admin:', error);
  }
};

// Send notification when order status changes
export const sendOrderStatusUpdateNotification = async (
  order: IOrder, 
  user: IUser, 
  previousStatus: string
): Promise<void> => {
  try {
    let subject = '';
    let statusText = '';
    let statusDescription = '';
    let statusColor = '#000000';
    
    // Set appropriate subject and content based on order status
    switch (order.status) {
      case 'confirmed':
        subject = `订单已确认 - Kapioo #${order.orderId}`;
        statusText = '已确认';
        statusDescription = '您的订单已确认，我们正在准备您的餐点。';
        statusColor = '#007bff';
        break;
      
      case 'delivery':
        subject = `订单配送中 - Kapioo #${order.orderId}`;
        statusText = '配送中';
        statusDescription = '您的餐点正在配送中，请确保您的地址信息准确，保持电话畅通。';
        statusColor = '#6610f2';
        break;
      
      case 'delivered':
        subject = `订单已送达 - Kapioo #${order.orderId}`;
        statusText = '已送达';
        statusDescription = '您的订单已送达。祝您用餐愉快！';
        statusColor = '#198754';
        break;
      
      case 'cancelled':
        subject = `订单已取消 - Kapioo #${order.orderId}`;
        statusText = '已取消';
        statusDescription = '您的订单已取消。';
        statusColor = '#dc3545';
        break;
      
      case 'refunded':
        subject = `订单已退款 - Kapioo #${order.orderId}`;
        statusText = '已退款';
        statusDescription = '您的订单已退款，餐卷已返还到您的账户。';
        statusColor = '#fd7e14';
        break;
        
      default:
        return; // Don't send for other statuses
    }
    
    // Translate previous status to Chinese
    let previousStatusText = previousStatus;
    switch (previousStatus) {
      case 'pending':
        previousStatusText = '待确认';
        break;
      case 'confirmed':
        previousStatusText = '已确认';
        break;
      case 'delivery':
        previousStatusText = '配送中';
        break;
      case 'delivered':
        previousStatusText = '已送达';
        break;
      case 'cancelled':
        previousStatusText = '已取消';
        break;
      case 'refunded':
        previousStatusText = '已退款';
        break;
    }
    
    const html = `
      <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; border-radius: 8px; background-color: #fff; box-shadow: 0 4px 20px rgba(0,0,0,0.05);">
        <div style="text-align: center; margin-bottom: 30px;">
          <img src="${LOGO_URL}" alt="Kapioo Logo" style="width: 120px; height: auto;" />
        </div>
        <h2 style="color: #C2884E; text-align: center; font-size: 24px; margin-bottom: 20px;">订单状态更新</h2>
        <p style="color: #333; font-size: 16px; line-height: 1.6; margin-bottom: 25px; text-align: center;">
          亲爱的 ${user.name}，您的订单状态已更新。
        </p>
        
        <div style="text-align: center; margin: 30px 0;">
          <div style="display: inline-block; background-color: #F8F0E5; border-radius: 8px; padding: 20px 40px;">
            <p style="margin: 0; color: #666;">订单状态已从</p>
            <p style="margin: 10px 0; color: #666; font-size: 16px;">
              <span style="color: #888; text-decoration: line-through;">${previousStatusText}</span>
              &nbsp;&rarr;&nbsp;
              <span style="color: ${statusColor}; font-weight: bold; font-size: 20px;">${statusText}</span>
            </p>
            <p style="margin: 0; color: #333;">${statusDescription}</p>
          </div>
        </div>
        
        <div style="background-color: #F8F0E5; border-radius: 8px; padding: 20px; margin-bottom: 25px;">
          <h3 style="color: #C2884E; margin-top: 0;">订单详情</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #E8D5C4; color: #666;">订单号:</td>
              <td style="padding: 8px 0; border-bottom: 1px solid #E8D5C4; font-weight: bold; text-align: right;">${order.orderId}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #E8D5C4; color: #666;">订单日期:</td>
              <td style="padding: 8px 0; border-bottom: 1px solid #E8D5C4; text-align: right;">${new Date(order.createdAt).toLocaleDateString('zh-CN')}</td>
            </tr>
            ${order.status === 'refunded' ? `
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #E8D5C4; color: #666;">退款餐卷:</td>
              <td style="padding: 8px 0; border-bottom: 1px solid #E8D5C4; text-align: right;">${order.creditCost} 餐卷</td>
            </tr>
            ` : ''}
          </table>
        </div>
        
        <div style="background-color: #F8F0E5; border-radius: 8px; padding: 20px; margin-bottom: 25px;">
          <h3 style="color: #C2884E; margin-top: 0;">已选择的餐点</h3>
          ${formatSelectedMeals(order.selectedMeals)}
        </div>
        
        <div style="background-color: #F8F0E5; border-radius: 8px; padding: 20px; margin-bottom: 25px;">
          <h3 style="color: #C2884E; margin-top: 0;">配送地址</h3>
          <p style="color: #333; line-height: 1.6;">
            ${formatAddress(order.deliveryAddress)}
          </p>
        </div>
        
        <p style="color: #333; font-size: 16px; line-height: 1.6; margin-bottom: 10px; text-align: center;">
          您可以在您的 <a href="${BASE_URL}/dashboard" style="color: #C2884E; text-decoration: none; font-weight: bold;">Kapioo 账户</a> 中查看订单详情。
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
      html
    });
    
    console.log(`Order status update notification sent to customer: ${user.email}`);
  } catch (error) {
    console.error('Error sending order status update notification:', error);
  }
};

// Send notification when credits are added to a user's account
export const sendCreditsAddedNotification = async (
  user: NotificationUser,
  amount: number,
  transactionId: string
): Promise<void> => {
  try {
    const subject = `餐卷已添加 - Kapioo`;
    
    const html = `
      <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; border-radius: 8px; background-color: #fff; box-shadow: 0 4px 20px rgba(0,0,0,0.05);">
        <div style="text-align: center; margin-bottom: 30px;">
          <img src="${LOGO_URL}" alt="Kapioo Logo" style="width: 120px; height: auto;" />
        </div>
        <h2 style="color: #C2884E; text-align: center; font-size: 24px; margin-bottom: 20px;">餐卷已添加到您的账户</h2>
        <p style="color: #333; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
          亲爱的 ${user.name}，您的账户已成功添加餐卷。
        </p>
        
        <div style="background-color: #F8F0E5; border-radius: 8px; padding: 20px; margin-bottom: 25px;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 15px;">
            <div>
              <h3 style="color: #C2884E; margin: 0;">交易确认</h3>
              <p style="color: #666; margin: 0;">餐卷已添加到您的账户</p>
            </div>
            <div style="background-color: #C2884E; color: white; border-radius: 50%; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; font-size: 20px;">
              ✓
            </div>
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
              <td style="padding: 8px 0; border-bottom: 1px solid #E8D5C4; text-align: right; color: #4CAF50; font-weight: bold;">+${amount} 餐卷</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #E8D5C4; color: #666;">新餐卷余额:</td>
              <td style="padding: 8px 0; border-bottom: 1px solid #E8D5C4; text-align: right; font-weight: bold;">${user.credits} 餐卷</td>
            </tr>
          </table>
        </div>
        
        <p style="color: #333; font-size: 16px; line-height: 1.6; margin-bottom: 10px; text-align: center;">
          您可以在您的 <a href="${BASE_URL}/dashboard" style="color: #C2884E; text-decoration: none; font-weight: bold;">Kapioo 账户</a> 中使用这些餐卷订购餐点。
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
      html
    });
    
    console.log(`Credits added notification sent to customer: ${user.email}`);
  } catch (error) {
    console.error('Error sending credits added notification:', error);
  }
};

// Type for user parameter in notification functions
export type NotificationUser = {
  email: string;
  name: string;
  credits: number;
  [key: string]: any; // Allow any other properties
};

// Main function to handle order notifications
export const handleOrderNotification = async (
  notificationType: NotificationType,
  order: IOrder | null,
  user: NotificationUser, // Use the more flexible type
  previousStatus?: string,
  transactionId?: string,
  amount?: number
): Promise<void> => {
  try {
    switch (notificationType) {
      case NotificationType.NEW_ORDER:
        if (!order) throw new Error('Order is required for NEW_ORDER notification');
        await Promise.all([
          // Send to customer
          sendNewOrderNotification(order, user as IUser),
          // Send to admin
          sendNewOrderAdminNotification(order, user as IUser)
        ]);
        break;
        
      case NotificationType.ORDER_CONFIRMED:
      case NotificationType.ORDER_DELIVERY:
      case NotificationType.ORDER_DELIVERED:
      case NotificationType.ORDER_CANCELLED:
      case NotificationType.ORDER_REFUNDED:
        if (!order) throw new Error('Order is required for order status notifications');
        await sendOrderStatusUpdateNotification(
          order, 
          user as IUser, 
          previousStatus || 'pending'
        );
        break;
        
      case NotificationType.CREDITS_ADDED:
        if (transactionId && amount !== undefined) {
          await sendCreditsAddedNotification(
            user,
            amount, 
            transactionId
          );
        }
        break;
        
      default:
        break;
    }
  } catch (error) {
    console.error('Error handling order notification:', error);
  }
}; 