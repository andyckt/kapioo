export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

// Send an email
export const sendEmail = async (options: EmailOptions) => {
  try {
    console.log('Sending email to:', options.to);
    console.log('Email subject:', options.subject);
    
    // Check if we're in a browser environment
    if (typeof window !== 'undefined') {
      console.log('Sending email from browser environment via API route');
      // We're in the browser, use the API route
      const response = await fetch('/api/email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(options),
      });
      
      const result = await response.json();
      
      if (!result.success) {
        console.error('Email API route returned error:', result.error);
        throw new Error(result.error || 'Failed to send email via API');
      }
      
      console.log('Email sent successfully via API route');
      return result;
    } else {
      console.log('Sending email from server environment');
      // We're on the server, use the server-side email service
      const { sendEmailFromServer } = await import('./server-email');
      const result = await sendEmailFromServer(options);
      console.log('Email sent successfully from server');
      return result;
    }
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
};

// Generate a random 6-digit verification code
export const generateVerificationCode = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// AWS S3 hosted logo URL
const LOGO_URL = 'https://meal-subscription-andy-photos.s3.ap-southeast-2.amazonaws.com/src/Kapioo.png';

// Send a welcome email to new users
export const sendWelcomeEmail = async (to: string, name: string) => {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  
  const html = `
    <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; border-radius: 8px; background-color: #fff; box-shadow: 0 4px 20px rgba(0,0,0,0.05);">
      <div style="text-align: center; margin-bottom: 30px;">
        <img src="${LOGO_URL}" alt="Kapioo Logo" style="width: 120px; height: auto;" />
      </div>
      <h2 style="color: #C2884E; text-align: center; font-size: 24px; margin-bottom: 20px;">欢迎加入Kapioo！</h2>
      <p style="color: #333; font-size: 16px; line-height: 1.6; margin-bottom: 25px; text-align: center;">
        ${name}，感谢您选择Kapioo餐饮订阅服务！
      </p>
      <div style="background: linear-gradient(120deg, #F8F0E5 0%, #FFF6EF 100%); border-radius: 8px; padding: 25px; margin: 30px auto;">
        <h3 style="color: #C2884E; margin-top: 0; text-align: center; font-size: 18px;">您的账户已成功创建</h3>
        <p style="color: #666; font-size: 15px; line-height: 1.6; margin-bottom: 20px; text-align: center;">
          您现在可以开始浏览我们的菜单，并订阅您喜爱的餐食计划。
        </p>
        <div style="text-align: center;">
          <a href="${baseUrl}/dashboard" style="display: inline-block; background: linear-gradient(135deg, #C2884E 0%, #D1A46C 100%); color: white; padding: 12px 25px; text-decoration: none; border-radius: 6px; font-weight: 500; font-size: 16px; margin-top: 10px; transition: transform 0.3s;">进入您的账户</a>
        </div>
      </div>
      <div style="display: flex; justify-content: space-between; margin: 35px 0;">
        <div style="width: 30%; text-align: center; padding: 15px;">
          <div style="width: 60px; height: 60px; background-color: #FFF6EF; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 15px;">
            <img src="${baseUrl}/icons/menu.png" alt="菜单图标" style="width: 30px; height: 30px;" onerror="this.src='${LOGO_URL}'; this.style.width='30px'; this.style.height='30px';" />
          </div>
          <h4 style="color: #C2884E; margin: 0 0 10px; font-size: 16px;">探索菜单</h4>
          <p style="color: #666; font-size: 14px; margin: 0;">浏览我们的特色菜品</p>
        </div>
        <div style="width: 30%; text-align: center; padding: 15px;">
          <div style="width: 60px; height: 60px; background-color: #FFF6EF; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 15px;">
            <img src="${baseUrl}/icons/subscribe.png" alt="订阅图标" style="width: 30px; height: 30px;" onerror="this.src='${LOGO_URL}'; this.style.width='30px'; this.style.height='30px';" />
          </div>
          <h4 style="color: #C2884E; margin: 0 0 10px; font-size: 16px;">选择计划</h4>
          <p style="color: #666; font-size: 14px; margin: 0;">定制您的餐食订阅</p>
        </div>
        <div style="width: 30%; text-align: center; padding: 15px;">
          <div style="width: 60px; height: 60px; background-color: #FFF6EF; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 15px;">
            <img src="${baseUrl}/icons/delivery.png" alt="配送图标" style="width: 30px; height: 30px;" onerror="this.src='${LOGO_URL}'; this.style.width='30px'; this.style.height='30px';" />
          </div>
          <h4 style="color: #C2884E; margin: 0 0 10px; font-size: 16px;">按时配送</h4>
          <p style="color: #666; font-size: 14px; margin: 0;">享受新鲜餐食送到家</p>
        </div>
      </div>
      <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eaeaea; text-align: center;">
        <p style="color: #999; font-size: 14px; margin-bottom: 15px;">关注我们的社交媒体获取最新信息</p>
        <div style="display: flex; justify-content: center; gap: 15px; margin-bottom: 20px;">
          <a href="#" style="display: inline-block; width: 36px; height: 36px; background-color: #C2884E; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; text-decoration: none;">W</a>
          <a href="#" style="display: inline-block; width: 36px; height: 36px; background-color: #C2884E; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; text-decoration: none;">I</a>
          <a href="#" style="display: inline-block; width: 36px; height: 36px; background-color: #C2884E; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; text-decoration: none;">F</a>
        </div>
        <p style="color: #999; font-size: 13px;">&copy; ${new Date().getFullYear()} Kapioo。保留所有权利。</p>
      </div>
    </div>
  `;
  
  return sendEmail({
    to,
    subject: `欢迎加入Kapioo，${name}！`,
    html,
  });
};

// Send a verification email with 6-digit code
export const sendVerificationEmail = async (to: string, code: string) => {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  
  const html = `
    <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; border-radius: 8px; background-color: #fff; box-shadow: 0 4px 20px rgba(0,0,0,0.05);">
      <div style="text-align: center; margin-bottom: 30px;">
        <img src="${LOGO_URL}" alt="Kapioo Logo" style="width: 120px; height: auto;" />
      </div>
      <h2 style="color: #C2884E; text-align: center; font-size: 24px; margin-bottom: 20px;">验证您的电子邮件</h2>
      <p style="color: #333; font-size: 16px; line-height: 1.6; margin-bottom: 25px; text-align: center;">
        感谢您注册Kapioo餐饮订阅服务！请使用以下验证码完成注册：
      </p>
      <div style="background: linear-gradient(135deg, #C2884E 0%, #D1A46C 100%); border-radius: 8px; padding: 20px; margin: 30px auto; text-align: center; width: 60%;">
        <p style="letter-spacing: 8px; font-size: 32px; font-weight: bold; color: white; margin: 0; text-align: center;">${code}</p>
      </div>
      <p style="color: #666; font-size: 14px; line-height: 1.6; text-align: center;">
        此验证码将在24小时内有效。如果您没有请求此验证码，请忽略此邮件。
      </p>
      <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eaeaea; text-align: center; color: #999; font-size: 13px;">
        <p>&copy; ${new Date().getFullYear()} Kapioo。保留所有权利。</p>
      </div>
    </div>
  `;
  
  return sendEmail({
    to,
    subject: '验证您的邮箱 - Kapioo',
    html,
  });
};

// Send a password reset email with 6-digit code
export const sendPasswordResetEmail = async (to: string, code: string) => {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  
  const html = `
    <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; border-radius: 8px; background-color: #fff; box-shadow: 0 4px 20px rgba(0,0,0,0.05);">
      <div style="text-align: center; margin-bottom: 30px;">
        <img src="${LOGO_URL}" alt="Kapioo Logo" style="width: 120px; height: auto;" />
      </div>
      <h2 style="color: #C2884E; text-align: center; font-size: 24px; margin-bottom: 20px;">重置您的密码</h2>
      <p style="color: #333; font-size: 16px; line-height: 1.6; margin-bottom: 25px; text-align: center;">
        我们收到了重置您密码的请求。请使用以下验证码重置您的密码：
      </p>
      <div style="background: linear-gradient(135deg, #C2884E 0%, #D1A46C 100%); border-radius: 8px; padding: 20px; margin: 30px auto; text-align: center; width: 60%;">
        <p style="letter-spacing: 8px; font-size: 32px; font-weight: bold; color: white; margin: 0; text-align: center;">${code}</p>
      </div>
      <p style="color: #666; font-size: 14px; line-height: 1.6; text-align: center;">
        此验证码将在1小时内有效。如果您没有请求重置密码，请忽略此邮件。
      </p>
      <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eaeaea; text-align: center; color: #999; font-size: 13px;">
        <p>&copy; ${new Date().getFullYear()} Kapioo。保留所有权利。</p>
      </div>
    </div>
  `;
  
  return sendEmail({
    to,
    subject: '重置您的密码 - Kapioo',
    html,
  });
};

// Send notification to admin for credit purchase requests
export const sendAdminNotification = async (subject: string, message: string) => {
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@kapioo.com';
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  
  const html = `
    <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; border-radius: 8px; background-color: #fff; box-shadow: 0 4px 20px rgba(0,0,0,0.05);">
      <div style="text-align: center; margin-bottom: 30px;">
        <img src="${LOGO_URL}" alt="Kapioo Logo" style="width: 120px; height: auto;" />
      </div>
      <h2 style="color: #C2884E; text-align: center; font-size: 24px; margin-bottom: 20px;">管理员通知</h2>
      <div style="background: linear-gradient(120deg, #F8F0E5 0%, #FFF6EF 100%); border-radius: 8px; padding: 25px; margin: 30px auto;">
        <p style="color: #333; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
          ${message}
        </p>
        <div style="text-align: center;">
          <a href="${baseUrl}/admin" style="display: inline-block; background: linear-gradient(135deg, #C2884E 0%, #D1A46C 100%); color: white; padding: 12px 25px; text-decoration: none; border-radius: 6px; font-weight: 500; font-size: 16px; margin-top: 10px; transition: transform 0.3s;">进入管理后台</a>
        </div>
      </div>
      <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eaeaea; text-align: center; color: #999; font-size: 13px;">
        <p>&copy; ${new Date().getFullYear()} Kapioo。保留所有权利。</p>
      </div>
    </div>
  `;
  
  return sendEmail({
    to: adminEmail,
    subject: `[Kapioo Admin] ${subject}`,
    html,
  });
};

// Send notification to admin about new credit purchase request
export const sendAdminCreditRequestNotification = async (requestDetails: {
  userId: string;
  userName: string;
  userEmail: string;
  amount: number;
  imageProofUrl: string;
  notes?: string;
  planDescription?: string;
  requestId: string;
}) => {
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@kapioo.com';
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  const adminDashboardLink = `${baseUrl}/admin?tab=credit-requests`;

  const html = `
    <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; border-radius: 8px; background-color: #fff; box-shadow: 0 4px 20px rgba(0,0,0,0.05);">
      <div style="text-align: center; margin-bottom: 30px;">
        <img src="${LOGO_URL}" alt="Kapioo Logo" style="width: 120px; height: auto;" />
      </div>
      <h2 style="color: #C2884E; text-align: center; font-size: 24px; margin-bottom: 20px;">新的周次餐券购买请求待审核</h2>
      <p style="color: #333; font-size: 16px; line-height: 1.6; margin-bottom: 15px;">
        用户 <strong>${requestDetails.userName}</strong> (${requestDetails.userEmail}) 提交了一个新的餐券购买请求。
      </p>
      <ul style="list-style: none; padding: 0; margin-bottom: 20px; border: 1px solid #eee; border-radius: 8px; background-color: #f9f9f9;">
        <li style="padding: 10px 15px; border-bottom: 1px solid #eee;"><strong>请求ID:</strong> ${requestDetails.requestId}</li>
        <li style="padding: 10px 15px; border-bottom: 1px solid #eee;"><strong>付款金额:</strong> $${requestDetails.amount}</li>
        ${requestDetails.planDescription ? `<li style="padding: 10px 15px; border-bottom: 1px solid #eee;"><strong>所选套餐:</strong> ${requestDetails.planDescription}</li>` : ''}
        <li style="padding: 10px 15px;"><strong>备注:</strong> ${requestDetails.notes || '无'}</li>
      </ul>
      <p style="color: #333; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
        请点击下方链接查看付款凭证并进行审核：
      </p>
      <div style="text-align: center; margin-bottom: 30px;">
        <a href="${requestDetails.imageProofUrl}" style="display: inline-block; background: #007bff; color: white; padding: 12px 25px; text-decoration: none; border-radius: 6px; font-weight: 500; font-size: 16px; margin-top: 10px; transition: transform 0.3s;">查看付款凭证</a>
      </div>
      <div style="text-align: center;">
        <a href="${adminDashboardLink}" style="display: inline-block; background: linear-gradient(135deg, #C2884E 0%, #D1A46C 100%); color: white; padding: 12px 25px; text-decoration: none; border-radius: 6px; font-weight: 500; font-size: 16px; margin-top: 10px; transition: transform 0.3s;">前往管理后台审核</a>
      </div>
      <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eaeaea; text-align: center; color: #999; font-size: 13px;">
        <p>&copy; ${new Date().getFullYear()} Kapioo。保留所有权利。</p>
      </div>
    </div>
  `;

  return sendEmail({
    to: adminEmail,
    subject: `新的周次餐券购买请求 (#${requestDetails.requestId}) 待审核`,
    html,
  });
};

// Send notification to admin about new voucher purchase request
export const sendAdminVoucherRequestNotification = async (requestDetails: {
  userId: string;
  userName: string;
  userEmail: string;
  type: 'twoDish' | 'threeDish';
  quantity: number;
  amount: number;
  imageProofUrl: string;
  notes?: string;
  requestId: string;
}) => {
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@kapioo.com';
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  const adminDashboardLink = `${baseUrl}/admin?tab=meal-vouchers`;

  const voucherTypeText = requestDetails.type === 'twoDish' ? '2菜餐券' : '3菜餐券';

  const html = `
    <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; border-radius: 8px; background-color: #fff; box-shadow: 0 4px 20px rgba(0,0,0,0.05);">
      <div style="text-align: center; margin-bottom: 30px;">
        <img src="${LOGO_URL}" alt="Kapioo Logo" style="width: 120px; height: auto;" />
      </div>
      <h2 style="color: #C2884E; text-align: center; font-size: 24px; margin-bottom: 20px;">新的${voucherTypeText}购买请求待审核</h2>
      <p style="color: #333; font-size: 16px; line-height: 1.6; margin-bottom: 15px;">
        用户 <strong>${requestDetails.userName}</strong> (${requestDetails.userEmail}) 提交了一个新的餐券购买请求。
      </p>
      <ul style="list-style: none; padding: 0; margin-bottom: 20px; border: 1px solid #eee; border-radius: 8px; background-color: #f9f9f9;">
        <li style="padding: 10px 15px; border-bottom: 1px solid #eee;"><strong>请求ID:</strong> ${requestDetails.requestId}</li>
        <li style="padding: 10px 15px; border-bottom: 1px solid #eee;"><strong>餐券类型:</strong> ${voucherTypeText}</li>
        <li style="padding: 10px 15px; border-bottom: 1px solid #eee;"><strong>餐券数量:</strong> ${requestDetails.quantity}</li>
        <li style="padding: 10px 15px; border-bottom: 1px solid #eee;"><strong>付款金额:</strong> $${requestDetails.amount}</li>
        <li style="padding: 10px 15px;"><strong>备注:</strong> ${requestDetails.notes || '无'}</li>
      </ul>
      <p style="color: #333; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
        请点击下方链接查看付款凭证并进行审核：
      </p>
      <div style="text-align: center; margin-bottom: 30px;">
        <a href="${requestDetails.imageProofUrl}" style="display: inline-block; background: #007bff; color: white; padding: 12px 25px; text-decoration: none; border-radius: 6px; font-weight: 500; font-size: 16px; margin-top: 10px; transition: transform 0.3s;" target="_blank">查看付款凭证</a>
      </div>
      <div style="text-align: center;">
        <a href="${adminDashboardLink}" style="display: inline-block; background: linear-gradient(135deg, #C2884E 0%, #D1A46C 100%); color: white; padding: 12px 25px; text-decoration: none; border-radius: 6px; font-weight: 500; font-size: 16px; margin-top: 10px; transition: transform 0.3s;">前往管理后台审核</a>
      </div>
      <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eaeaea; text-align: center; color: #999; font-size: 13px;">
        <p>&copy; ${new Date().getFullYear()} Kapioo。保留所有权利。</p>
      </div>
    </div>
  `;

  return sendEmail({
    to: adminEmail,
    subject: `新的${voucherTypeText}购买请求 (#${requestDetails.requestId}) 待审核`,
    html,
  });
};

// Send notification to user for credit purchase status
export const sendCreditPurchaseStatusEmail = async (to: string, name: string, requestId: string, status: 'approved' | 'declined', credits?: number, planDescription?: string) => {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  
  let statusText = '';
  let statusColor = '';
  let statusMessage = '';
  
  if (status === 'approved') {
    statusText = '已批准';
    statusColor = '#4CAF50';
    statusMessage = `您的充值请求已获批准，${credits} 餐券已添加到您的账户。`;
  } else {
    statusText = '已拒绝';
    statusColor = '#F44336';
    statusMessage = '很遗憾，您的充值请求未获批准。请联系客服了解更多详情。';
  }
  
  const html = `
    <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; border-radius: 8px; background-color: #fff; box-shadow: 0 4px 20px rgba(0,0,0,0.05);">
      <div style="text-align: center; margin-bottom: 30px;">
        <img src="${LOGO_URL}" alt="Kapioo Logo" style="width: 120px; height: auto;" />
      </div>
      <h2 style="color: #C2884E; text-align: center; font-size: 24px; margin-bottom: 20px;">餐券充值状态更新</h2>
      <p style="color: #333; font-size: 16px; line-height: 1.6; margin-bottom: 25px; text-align: center;">
        ${name}，您的餐券充值请求状态已更新：
      </p>
      <div style="background: linear-gradient(120deg, #F8F0E5 0%, #FFF6EF 100%); border-radius: 8px; padding: 25px; margin: 30px auto; text-align: center;">
        <div style="display: inline-block; padding: 8px 16px; background-color: ${statusColor}; color: white; border-radius: 20px; font-weight: bold; margin-bottom: 15px;">
          ${statusText}
        </div>
        <p style="color: #333; font-size: 15px; line-height: 1.6; margin-bottom: 15px;">
          请求编号: ${requestId}
        </p>
        ${planDescription ? `
        <p style="color: #333; font-size: 15px; line-height: 1.6; margin-bottom: 15px;">
          所选套餐: ${planDescription}
        </p>
        ` : ''}
        <p style="color: #333; font-size: 15px; line-height: 1.6;">
          ${statusMessage}
        </p>
      </div>
      <div style="text-align: center; margin-top: 30px;">
        <a href="${baseUrl}/dashboard?tab=credits" style="display: inline-block; background: linear-gradient(135deg, #C2884E 0%, #D1A46C 100%); color: white; padding: 12px 25px; text-decoration: none; border-radius: 6px; font-weight: 500; font-size: 16px; transition: transform 0.3s;">查看我的餐券</a>
      </div>
      <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eaeaea; text-align: center; color: #999; font-size: 13px;">
        <p>&copy; ${new Date().getFullYear()} Kapioo。保留所有权利。</p>
      </div>
    </div>
  `;
  
  return sendEmail({
    to,
    subject: `[Kapioo] 您的餐券充值请求${status === 'approved' ? '已批准' : '已拒绝'}`,
    html,
  });
};

// Send notification to user for voucher purchase status
export const sendVoucherPurchaseStatusEmail = async (to: string, name: string, requestId: string, status: 'approved' | 'declined', voucherType: 'twoDish' | 'threeDish', quantity: number, adminNotes?: string) => {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  
  const voucherTypeText = voucherType === 'twoDish' ? '2菜餐券' : '3菜餐券';
  let statusText = '';
  let statusColor = '';
  let statusMessage = '';
  
  if (status === 'approved') {
    statusText = '已批准';
    statusColor = '#4CAF50';
    statusMessage = `您的${voucherTypeText}购买请求已获批准，${quantity}张${voucherTypeText}已添加到您的账户。`;
  } else {
    statusText = '已拒绝';
    statusColor = '#F44336';
    statusMessage = `很遗憾，您的${voucherTypeText}购买请求未获批准。${adminNotes ? '管理员备注: ' + adminNotes : '请联系客服了解更多详情。'}`;
  }
  
  const html = `
    <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; border-radius: 8px; background-color: #fff; box-shadow: 0 4px 20px rgba(0,0,0,0.05);">
      <div style="text-align: center; margin-bottom: 30px;">
        <img src="${LOGO_URL}" alt="Kapioo Logo" style="width: 120px; height: auto;" />
      </div>
      <h2 style="color: #C2884E; text-align: center; font-size: 24px; margin-bottom: 20px;">${voucherTypeText}购买状态更新</h2>
      <p style="color: #333; font-size: 16px; line-height: 1.6; margin-bottom: 25px; text-align: center;">
        ${name}，您的${voucherTypeText}购买请求状态已更新：
      </p>
      <div style="background: linear-gradient(120deg, #F8F0E5 0%, #FFF6EF 100%); border-radius: 8px; padding: 25px; margin: 30px auto; text-align: center;">
        <div style="display: inline-block; padding: 8px 16px; background-color: ${statusColor}; color: white; border-radius: 20px; font-weight: bold; margin-bottom: 15px;">
          ${statusText}
        </div>
        <p style="color: #333; font-size: 15px; line-height: 1.6; margin-bottom: 15px;">
          请求编号: ${requestId}
        </p>
        <p style="color: #333; font-size: 15px; line-height: 1.6; margin-bottom: 15px;">
          餐券类型: ${voucherTypeText}
        </p>
        <p style="color: #333; font-size: 15px; line-height: 1.6; margin-bottom: 15px;">
          餐券数量: ${quantity}
        </p>
        <p style="color: #333; font-size: 15px; line-height: 1.6;">
          ${statusMessage}
        </p>
        ${adminNotes && status === 'approved' ? `
        <div style="margin-top: 15px; padding-top: 15px; border-top: 1px dashed #C2884E30;">
          <p style="color: #333; font-size: 15px; line-height: 1.6;">
            <strong>管理员备注:</strong> ${adminNotes}
          </p>
        </div>
        ` : ''}
      </div>
      <div style="text-align: center; margin-top: 30px;">
        <a href="${baseUrl}/dashboard" style="display: inline-block; background: linear-gradient(135deg, #C2884E 0%, #D1A46C 100%); color: white; padding: 12px 25px; text-decoration: none; border-radius: 6px; font-weight: 500; font-size: 16px; transition: transform 0.3s;">查看我的餐券</a>
      </div>
      <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eaeaea; text-align: center; color: #999; font-size: 13px;">
        <p>&copy; ${new Date().getFullYear()} Kapioo。保留所有权利。</p>
      </div>
    </div>
  `;
  
  return sendEmail({
    to,
    subject: `[Kapioo] 您的${voucherTypeText}购买请求${status === 'approved' ? '已批准' : '已拒绝'}`,
    html,
  });
};