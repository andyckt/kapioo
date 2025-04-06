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