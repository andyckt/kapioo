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

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;
const MAX_BATCH_SIZE = 100;

export interface BatchEmailResult {
  to: string;
  success: boolean;
  messageId?: string;
  error?: string;
}

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

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return 'Unknown resend error';
};

const sendWithRetry = async <T>(sendFn: () => Promise<T>, contextLabel: string) => {
  let lastError: unknown = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await sendFn();
    } catch (error) {
      lastError = error;
      const canRetry = attempt < MAX_RETRIES && isRetryableResendError(error);
      if (!canRetry) {
        break;
      }

      const jitter = Math.floor(Math.random() * 250);
      const delayMs = BASE_DELAY_MS * Math.pow(2, attempt) + jitter;
      console.warn(
        `Resend ${contextLabel} failed (attempt ${attempt + 1}/${MAX_RETRIES + 1}), retrying in ${delayMs}ms`
      );
      await sleep(delayMs);
    }
  }

  throw lastError;
};

/**
 * Send an email using Resend service
 * This replaces the Gmail SMTP approach with a professional transactional email service
 */
export const sendEmailWithResend = async (options: EmailOptions) => {
  try {
    const resend = getResendClient();
    const result: any = await sendWithRetry(
      () =>
        resend.emails.send({
          from: options.from || 'Kapioo <contact@kapioo.com>',
          to: options.to,
          subject: options.subject,
          html: options.html
        }) as Promise<any>,
      'single send'
    );
    
    return {
      success: true,
      messageId: result.data?.id,
      data: result.data,
    };
  } catch (error) {
    console.error('Error sending email via Resend:', error);
    throw error;
  }
};

export const sendBatchEmailsWithResend = async (
  optionsList: EmailOptions[]
): Promise<BatchEmailResult[]> => {
  if (!optionsList.length) return [];

  console.info(`[ResendBatch] start total=${optionsList.length}`);
  const resend = getResendClient();
  const results: BatchEmailResult[] = [];

  for (let start = 0; start < optionsList.length; start += MAX_BATCH_SIZE) {
    const chunk = optionsList.slice(start, start + MAX_BATCH_SIZE);
    const payload = chunk.map((options) => ({
      from: options.from || 'Kapioo <contact@kapioo.com>',
      to: options.to,
      subject: options.subject,
      html: options.html
    }));

    try {
      const batchResponse: any = await sendWithRetry(
        () => (resend.batch.send(payload as any) as Promise<any>),
        `batch send (${chunk.length})`
      );

      const responseData = Array.isArray(batchResponse?.data) ? batchResponse.data : [];

      for (let i = 0; i < chunk.length; i++) {
        const recipient = chunk[i];
        const responseEntry: any = responseData[i];
        const entryError =
          responseEntry?.error?.message ||
          responseEntry?.error ||
          batchResponse?.error?.message ||
          batchResponse?.error;
        const messageId = responseEntry?.id || responseEntry?.data?.id;

        if (entryError) {
          results.push({
            to: recipient.to,
            success: false,
            error: String(entryError)
          });
        } else {
          results.push({
            to: recipient.to,
            success: true,
            messageId: messageId ? String(messageId) : undefined
          });
        }
      }

      const successCount = results
        .slice(results.length - chunk.length)
        .filter((entry) => entry.success).length;
      const failureCount = chunk.length - successCount;
      console.info(
        `[ResendBatch] chunk complete start=${start} size=${chunk.length} success=${successCount} failed=${failureCount}`
      );
    } catch (error) {
      const message = getErrorMessage(error);
      console.warn(
        `[ResendBatch] chunk failed start=${start} size=${chunk.length} error="${message}"`
      );
      for (const recipient of chunk) {
        results.push({
          to: recipient.to,
          success: false,
          error: message
        });
      }
    }
  }

  const totalSuccess = results.filter((entry) => entry.success).length;
  const totalFailed = results.length - totalSuccess;
  console.info(
    `[ResendBatch] done total=${results.length} success=${totalSuccess} failed=${totalFailed}`
  );
  return results;
};
