import { NextResponse } from 'next/server';
import { EmailOptions } from '@/lib/services/email';
import { sendEmailWithResend } from '@/lib/services/resend-email';

// POST handler for sending emails using Resend
export async function POST(request: Request) {
  try {
    const { to, subject, html, from } = await request.json();
    
    // Validate input
    if (!to || !subject || !html) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // Send email via Resend for better deliverability
    const emailOptions: EmailOptions = { to, subject, html, from };
    const result = await sendEmailWithResend(emailOptions);
    
    return NextResponse.json({
      success: true,
      messageId: result.messageId
    });
  } catch (error: any) {
    console.error('Error sending email:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to send email', details: error.message },
      { status: 500 }
    );
  }
} 