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

// Send an email from the server
export const sendEmailFromServer = async (options: EmailOptions) => {
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
    
    // Verify connection (quick test)
    console.log('🔍 Verifying SMTP connection...');
    try {
      await transporter.verify();
      console.log('✅ SMTP connection verified');
    } catch (verifyError: any) {
      console.error('❌ SMTP verification failed:', verifyError.message);
      throw new Error(`SMTP connection failed: ${verifyError.message}`);
    }
    
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
    
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email sent successfully!');
    console.log('Message ID:', info.messageId);
    console.log('Response:', info.response);
    return info;
  } catch (error) {
    console.error('Error sending email from server:', error);
    // Try to provide more context about the error
    if (error instanceof Error) {
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    throw error;
  }
}; 