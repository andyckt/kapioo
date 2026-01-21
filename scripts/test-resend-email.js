/**
 * Test script for Resend email integration
 * 
 * Usage:
 *   node scripts/test-resend-email.js your-email@example.com
 * 
 * Make sure RESEND_API_KEY is set in your .env.local file
 */

const { Resend } = require('resend');
require('dotenv').config({ path: '.env.local' });

const testEmail = async (recipientEmail) => {
  console.log('🧪 Testing Resend Email Integration\n');
  console.log('=' .repeat(50));
  
  // Check if API key is set
  if (!process.env.RESEND_API_KEY) {
    console.error('❌ ERROR: RESEND_API_KEY is not set in environment variables');
    console.log('\nPlease add RESEND_API_KEY to your .env.local file:');
    console.log('RESEND_API_KEY=re_your_api_key_here\n');
    process.exit(1);
  }
  
  console.log('✅ RESEND_API_KEY found');
  console.log(`📧 Sending test email to: ${recipientEmail}\n`);
  
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    
    const result = await resend.emails.send({
      from: 'Kapioo <contact@kapioo.com>', // Use your verified domain
      to: recipientEmail,
      subject: '✅ Resend Integration Test - Kapioo',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #C2884E;">🎉 Resend Integration Successful!</h2>
          <p>This is a test email from your Kapioo application.</p>
          <p>If you're reading this, it means:</p>
          <ul>
            <li>✅ Resend package is installed correctly</li>
            <li>✅ RESEND_API_KEY is configured properly</li>
            <li>✅ Email sending is working</li>
          </ul>
          <div style="background-color: #F8F0E5; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0;"><strong>Next Steps:</strong></p>
            <ol style="margin: 10px 0 0 0;">
              <li>Verify your domain in Resend dashboard</li>
              <li>Update the "from" address in lib/services/resend-email.ts</li>
              <li>Test with actual signup flow</li>
            </ol>
          </div>
          <p style="color: #666; font-size: 14px;">
            Sent at: ${new Date().toLocaleString()}
          </p>
        </div>
      `,
    });
    
    console.log('✅ SUCCESS! Email sent via Resend');
    console.log('📬 Email ID:', result.data?.id);
    console.log('\n' + '='.repeat(50));
    console.log('✅ Resend integration is working correctly!');
    console.log('\nCheck your inbox (and spam folder) for the test email.');
    console.log('You can also view the email in your Resend dashboard:');
    console.log('https://resend.com/emails\n');
    
  } catch (error) {
    console.error('\n❌ ERROR: Failed to send email');
    console.error('Error details:', error.message);
    
    if (error.message.includes('API key')) {
      console.log('\n💡 Tip: Make sure your RESEND_API_KEY is valid.');
      console.log('Get a new API key from: https://resend.com/api-keys\n');
    } else if (error.message.includes('domain')) {
      console.log('\n💡 Tip: For testing, use onboarding@resend.dev as the "from" address.');
      console.log('For production, verify your domain in Resend dashboard.\n');
    }
    
    process.exit(1);
  }
};

// Get recipient email from command line argument
const recipientEmail = process.argv[2];

if (!recipientEmail) {
  console.error('❌ ERROR: Please provide a recipient email address');
  console.log('\nUsage:');
  console.log('  node scripts/test-resend-email.js your-email@example.com\n');
  process.exit(1);
}

// Validate email format
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
if (!emailRegex.test(recipientEmail)) {
  console.error('❌ ERROR: Invalid email address format');
  process.exit(1);
}

// Run the test
testEmail(recipientEmail);
