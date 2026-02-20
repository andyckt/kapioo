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

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const isRetryableResendError = (error: unknown) => {
  const err = error as any;
  const status = Number(err?.status || err?.statusCode || err?.response?.status || 0);
  const message = String(err?.message || '').toLowerCase();

  if (status === 429) return true;
  if (status >= 500 && status <= 599) return true;

  return (
    message.includes('too many requests') ||
    message.includes('rate limit') ||
    message.includes('timeout') ||
    message.includes('temporarily unavailable')
  );
};

/**
 * Send an email using Resend service
 * This replaces the Gmail SMTP approach with a professional transactional email service
 */
export const sendEmailWithResend = async (options: EmailOptions) => {
  const maxRetries = 3;
  const baseDelayMs = 1000;

  try {
    console.log('📧 Sending email via Resend...');
    console.log('To:', options.to);
    console.log('Subject:', options.subject);
    console.log('RESEND_API_KEY:', process.env.RESEND_API_KEY ? '✅ Set' : '❌ Not set');
    
    const resend = getResendClient();

    let lastError: unknown = null;
    let result: any = null;

    // Retry transient errors (notably 429 rate limits) with exponential backoff.
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        result = await resend.emails.send({
          from: options.from || 'Kapioo <contact@kapioo.com>', // Using your verified domain
          to: options.to,
          subject: options.subject,
          html: options.html
        });
        lastError = null;
        break;
      } catch (error) {
        lastError = error;
        const canRetry = attempt < maxRetries && isRetryableResendError(error);

        if (!canRetry) {
          break;
        }

        const jitter = Math.floor(Math.random() * 250);
        const delayMs = baseDelayMs * Math.pow(2, attempt) + jitter;
        console.warn(
          `⚠️ Resend send failed (attempt ${attempt + 1}/${maxRetries + 1}), retrying in ${delayMs}ms`
        );
        await sleep(delayMs);
      }
    }

    if (lastError) {
      throw lastError;
    }
    
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
