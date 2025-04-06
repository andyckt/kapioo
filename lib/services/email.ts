import nodemailer from 'nodemailer';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

// Create a transporter with Gmail credentials
const createTransporter = () => {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER || 'kapioomeal@gmail.com',
      pass: process.env.EMAIL_PASS || '', // Set the actual password in .env
    },
    secure: true,
  });
  
  return transporter;
};

// Send an email
export const sendEmail = async (options: EmailOptions) => {
  try {
    const transporter = createTransporter();
    
    const mailOptions = {
      from: options.from || `"Kapioo" <${process.env.EMAIL_USER || 'kapioomeal@gmail.com'}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
      headers: {
        'X-Priority': '1', // High priority
        'Importance': 'high',
        'X-MSMail-Priority': 'High',
        'Precedence': 'bulk' // Mark as bulk mail but not spam
      }
    };
    
    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent:', info.messageId);
    return info;
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