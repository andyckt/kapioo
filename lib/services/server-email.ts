import nodemailer from 'nodemailer';
import { EmailOptions } from './email';

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

// Send an email from the server with timeout protection
export const sendEmailFromServer = async (options: EmailOptions, timeoutMs: number = 8000) => {
  try {
    console.log('📧 Creating email transporter...');
    console.log('EMAIL_USER:', process.env.EMAIL_USER ? `✅ Set (${process.env.EMAIL_USER})` : '❌ Not set');
    console.log('EMAIL_PASS:', process.env.EMAIL_PASS ? '✅ Set (hidden)' : '❌ Not set');
    
    // Check if credentials are missing
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      throw new Error('Email credentials not configured. Set EMAIL_USER and EMAIL_PASS in environment variables.');
    }
    
    const transporter = createTransporter();
    console.log('✅ Email transporter created');
    
    // Skip SMTP verification - it's slow and unnecessary
    // We'll let sendMail handle any connection issues
    
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
    
    console.log('Sending email with options:', {
      from: mailOptions.from,
      to: mailOptions.to,
      subject: mailOptions.subject
    });
    
    // Create a timeout promise
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Email sending timeout')), timeoutMs);
    });
    
    // Race between sending email and timeout
    const info = await Promise.race([
      transporter.sendMail(mailOptions),
      timeoutPromise
    ]);
    
    console.log('✅ Email sent successfully!');
    console.log('Message ID:', (info as any).messageId);
    console.log('Response:', (info as any).response);
    return info;
  } catch (error) {
    console.error('⚠️ Error sending email from server:', error);
    // Log error details but don't throw - email failure shouldn't block user operations
    if (error instanceof Error) {
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
    }
    throw error;
  }
}; 