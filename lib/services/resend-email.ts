import { Resend } from 'resend';
import { EmailOptions } from './email';

// Initialize Resend with API key from environment variables
const getResendClient = () => {
  const apiKey = process.env.RESEND_API_KEY;
  
  if (!apiKey) {
    throw new Error('RESEND_API_KEY is not set in environment variables');
  }
  
  return new Resend(apiKey);
};

/**
 * Send an email using Resend service
 * This replaces the Gmail SMTP approach with a professional transactional email service
 */
export const sendEmailWithResend = async (options: EmailOptions) => {
  try {
    console.log('📧 Sending email via Resend...');
    console.log('To:', options.to);
    console.log('Subject:', options.subject);
    console.log('RESEND_API_KEY:', process.env.RESEND_API_KEY ? '✅ Set' : '❌ Not set');
    
    const resend = getResendClient();
    
    // Send email using Resend
    const result = await resend.emails.send({
      from: options.from || 'Kapioo <onboarding@resend.dev>', // Using Resend's verified test domain
      to: options.to,
      subject: options.subject,
      html: options.html,
    });
    
    console.log('✅ Email sent successfully via Resend!');
    console.log('Email ID:', result.data?.id);
    
    return {
      success: true,
      messageId: result.data?.id,
      data: result.data,
    };
  } catch (error) {
    console.error('❌ Error sending email via Resend:', error);
    
    if (error instanceof Error) {
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
    }
    
    throw error;
  }
};
