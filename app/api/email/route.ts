import { NextResponse } from 'next/server';
import { EmailOptions } from '@/lib/services/email';
import { sendEmailFromServer } from '@/lib/services/server-email';

// POST handler for sending emails
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
    
    // Send email via the server-side service
    const emailOptions: EmailOptions = { to, subject, html, from };
    const result = await sendEmailFromServer(emailOptions);
    
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