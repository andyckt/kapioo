import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import mongoose from 'mongoose';
import { sendMenuUpdateEmail } from '@/lib/services/email';
import type { Language } from '@/lib/email-translations';

// User schema interface
interface UserDocument extends mongoose.Document {
  email: string;
  name: string;
  language: Language;
  twoDishVoucher: number;
  threeDishVoucher: number;
}

// Define User schema
const UserSchema = new mongoose.Schema({
  email: { type: String, required: true },
  name: { type: String, required: true },
  language: { type: String, default: 'zh' },
  twoDishVoucher: { type: Number, default: 0 },
  threeDishVoucher: { type: Number, default: 0 }
});

/**
 * POST /api/admin/notify-menu-update
 * 
 * Sends menu update emails to all users with daily delivery vouchers
 * Uses batch processing to avoid Gmail rate limits
 */
export async function POST(request: Request) {
  try {
    await connectToDatabase();
    
    // Get or create User model
    const User = mongoose.models.User || mongoose.model<UserDocument>('User', UserSchema);
    
    // Find all users who have daily delivery vouchers (2-dish or 3-dish)
    const usersWithVouchers = await User.find({
      $or: [
        { twoDishVoucher: { $gt: 0 } },
        { threeDishVoucher: { $gt: 0 } }
      ]
    }).select('email name language twoDishVoucher threeDishVoucher');
    
    if (usersWithVouchers.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No users with vouchers found',
        totalUsers: 0,
        emailsSent: 0,
        emailsFailed: 0
      });
    }
    
    console.log(`Found ${usersWithVouchers.length} users with daily delivery vouchers`);
    
    // Batch processing configuration
    const BATCH_SIZE = 50; // Send 50 emails per batch
    const BATCH_DELAY = 2000; // 2 seconds delay between batches
    
    let emailsSent = 0;
    let emailsFailed = 0;
    const failedEmails: string[] = [];
    
    // Process users in batches
    for (let i = 0; i < usersWithVouchers.length; i += BATCH_SIZE) {
      const batch = usersWithVouchers.slice(i, i + BATCH_SIZE);
      const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(usersWithVouchers.length / BATCH_SIZE);
      
      console.log(`Processing batch ${batchNumber}/${totalBatches} (${batch.length} users)`);
      
      // Send emails in parallel within the batch
      const emailPromises = batch.map(async (user) => {
        try {
          await sendMenuUpdateEmail(
            user.email,
            user.name,
            user.language as Language || 'zh'
          );
          emailsSent++;
          console.log(`✓ Email sent to ${user.email}`);
          return { success: true, email: user.email };
        } catch (error) {
          emailsFailed++;
          failedEmails.push(user.email);
          console.error(`✗ Failed to send email to ${user.email}:`, error);
          return { success: false, email: user.email, error };
        }
      });
      
      // Wait for all emails in this batch to complete
      await Promise.allSettled(emailPromises);
      
      // Add delay before next batch (except for the last batch)
      if (i + BATCH_SIZE < usersWithVouchers.length) {
        console.log(`Waiting ${BATCH_DELAY}ms before next batch...`);
        await new Promise(resolve => setTimeout(resolve, BATCH_DELAY));
      }
    }
    
    console.log(`Email notification complete: ${emailsSent} sent, ${emailsFailed} failed`);
    
    return NextResponse.json({
      success: true,
      message: `Menu update notifications sent successfully`,
      totalUsers: usersWithVouchers.length,
      emailsSent,
      emailsFailed,
      failedEmails: emailsFailed > 0 ? failedEmails : undefined
    });
    
  } catch (error: any) {
    console.error('Error sending menu update notifications:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to send menu update notifications',
        details: error.message
      },
      { status: 500 }
    );
  }
}

