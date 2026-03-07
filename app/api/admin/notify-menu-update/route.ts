import { NextResponse } from 'next/server';
import { requireAdminMfa } from '@/lib/auth/guards';
import connectToDatabase from '@/lib/db';
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

// Response type for streaming updates
interface ProgressUpdate {
  type: 'progress' | 'batch_start' | 'batch_complete' | 'email_sent' | 'email_failed' | 'complete' | 'error';
  message: string;
  data?: any;
}

/**
 * POST /api/admin/notify-menu-update
 * 
 * Sends menu update emails to all users with daily delivery vouchers
 * Uses batch processing with real-time progress updates
 */
export async function POST(request: Request) {
  const { actor, response } = await requireAdminMfa(request);
  if (!actor || response) {
    return response;
  }

  const encoder = new TextEncoder();
  
  const stream = new ReadableStream({
    async start(controller) {
      const sendUpdate = (update: ProgressUpdate) => {
        const data = `data: ${JSON.stringify(update)}\n\n`;
        controller.enqueue(encoder.encode(data));
      };
      
      try {
        sendUpdate({ type: 'progress', message: 'Connecting to database...' });
        await connectToDatabase();
        
        sendUpdate({ type: 'progress', message: 'Fetching users with vouchers...' });
        
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
          sendUpdate({ 
            type: 'complete', 
            message: 'No users with vouchers found',
            data: { totalUsers: 0, emailsSent: 0, emailsFailed: 0, failedEmails: [] }
          });
          controller.close();
          return;
        }
        
        sendUpdate({ 
          type: 'progress', 
          message: `Found ${usersWithVouchers.length} users with daily delivery vouchers`,
          data: { totalUsers: usersWithVouchers.length }
        });
        
        // Batch processing configuration
        const BATCH_SIZE = 50;
        const BATCH_DELAY = 2000;
        const totalBatches = Math.ceil(usersWithVouchers.length / BATCH_SIZE);
        
        let emailsSent = 0;
        let emailsFailed = 0;
        const failedEmails: Array<{ email: string; name: string; error: string }> = [];
        const successfulEmails: string[] = [];
        
        // Process users in batches
        for (let i = 0; i < usersWithVouchers.length; i += BATCH_SIZE) {
          const batch = usersWithVouchers.slice(i, i + BATCH_SIZE);
          const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
          
          sendUpdate({
            type: 'batch_start',
            message: `Processing batch ${batchNumber}/${totalBatches} (${batch.length} users)`,
            data: {
              batchNumber,
              totalBatches,
              batchSize: batch.length,
              progress: Math.round((i / usersWithVouchers.length) * 100)
            }
          });
          
          // Send emails in parallel within the batch
          const emailPromises = batch.map(async (user) => {
            try {
              await sendMenuUpdateEmail(
                user.email,
                user.name,
                user.language as Language || 'zh'
              );
              
              emailsSent++;
              successfulEmails.push(user.email);
              
              sendUpdate({
                type: 'email_sent',
                message: `✓ Email sent to ${user.name} (${user.email})`,
                data: {
                  email: user.email,
                  name: user.name,
                  language: user.language,
                  totalSent: emailsSent,
                  totalFailed: emailsFailed
                }
              });
              
              return { success: true, email: user.email };
            } catch (error: any) {
              emailsFailed++;
              const errorMessage = error.message || 'Unknown error';
              
              failedEmails.push({
                email: user.email,
                name: user.name,
                error: errorMessage
              });
              
              sendUpdate({
                type: 'email_failed',
                message: `✗ Failed to send to ${user.name} (${user.email}): ${errorMessage}`,
                data: {
                  email: user.email,
                  name: user.name,
                  error: errorMessage,
                  errorStack: error.stack,
                  totalSent: emailsSent,
                  totalFailed: emailsFailed
                }
              });
              
              return { success: false, email: user.email, error };
            }
          });
          
          // Wait for all emails in this batch to complete
          await Promise.allSettled(emailPromises);
          
          sendUpdate({
            type: 'batch_complete',
            message: `Batch ${batchNumber}/${totalBatches} complete`,
            data: {
              batchNumber,
              totalBatches,
              emailsSent,
              emailsFailed,
              progress: Math.round(((i + BATCH_SIZE) / usersWithVouchers.length) * 100)
            }
          });
          
          // Add delay before next batch (except for the last batch)
          if (i + BATCH_SIZE < usersWithVouchers.length) {
            sendUpdate({
              type: 'progress',
              message: `Waiting ${BATCH_DELAY / 1000} seconds before next batch...`,
              data: { delayMs: BATCH_DELAY }
            });
            await new Promise(resolve => setTimeout(resolve, BATCH_DELAY));
          }
        }
        
        // Send final summary
        sendUpdate({
          type: 'complete',
          message: `Email notification complete: ${emailsSent} sent, ${emailsFailed} failed`,
          data: {
            totalUsers: usersWithVouchers.length,
            emailsSent,
            emailsFailed,
            successRate: Math.round((emailsSent / usersWithVouchers.length) * 100),
            failedEmails: failedEmails.length > 0 ? failedEmails : undefined,
            successfulEmails: successfulEmails.length > 0 ? successfulEmails : undefined
          }
        });
        
        controller.close();
        
      } catch (error: any) {
        console.error('Critical error in notification process:', error);
        sendUpdate({
          type: 'error',
          message: `Critical error: ${error.message}`,
          data: {
            error: error.message,
            errorStack: error.stack,
            errorName: error.name
          }
        });
        controller.close();
      }
    }
  });
  
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
