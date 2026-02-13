import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import User from '@/models/User';
import { sendNextWeekMenuUpdateEmail } from '@/lib/services/email';

export const dynamic = 'force-dynamic';
// Increase timeout for bulk email sending (max 300s on Vercel Pro/Enterprise)
// For development, this helps prevent timeouts during long-running operations
export const maxDuration = 300;

// POST handler - send next week menu update to users
export async function POST(request: Request) {
  try {
    const { userIds, testMode, testEmail, testBatchMode } = await request.json();
    
    // Handle test mode - send single test email
    if (testMode && testEmail) {
      await sendNextWeekMenuUpdateEmail(
        testEmail,
        'Test User',
        'test-user-id',
        'zh'
      );
      
      return NextResponse.json({
        success: true,
        message: 'Test email sent successfully'
      });
    }
    
    // Handle test batch mode - send to a small batch to test rate limiting
    if (testBatchMode) {
      const testUsers = [
        { email: 'kapioomeal@gmail.com', name: 'Test User 1', _id: 'test-1', languagePreference: 'zh' },
        { email: 'kapioomeal@gmail.com', name: 'Test User 2', _id: 'test-2', languagePreference: 'zh' },
        { email: 'kapioomeal@gmail.com', name: 'Test User 3', _id: 'test-3', languagePreference: 'en' },
        { email: 'kapioomeal@gmail.com', name: 'Test User 4', _id: 'test-4', languagePreference: 'zh' },
        { email: 'kapioomeal@gmail.com', name: 'Test User 5', _id: 'test-5', languagePreference: 'zh' },
        { email: 'kapioomeal@gmail.com', name: 'Test User 6', _id: 'test-6', languagePreference: 'en' },
        { email: 'kapioomeal@gmail.com', name: 'Test User 7', _id: 'test-7', languagePreference: 'zh' },
        { email: 'kapioomeal@gmail.com', name: 'Test User 8', _id: 'test-8', languagePreference: 'zh' },
        { email: 'kapioomeal@gmail.com', name: 'Test User 9', _id: 'test-9', languagePreference: 'zh' },
        { email: 'kapioomeal@gmail.com', name: 'Test User 10', _id: 'test-10', languagePreference: 'en' },
        { email: 'kapioomeal@gmail.com', name: 'Test User 11', _id: 'test-11', languagePreference: 'zh' },
        { email: 'kapioomeal@gmail.com', name: 'Test User 12', _id: 'test-12', languagePreference: 'zh' },
        { email: 'kapioomeal@gmail.com', name: 'Test User 13', _id: 'test-13', languagePreference: 'zh' },
        { email: 'kapioomeal@gmail.com', name: 'Test User 14', _id: 'test-14', languagePreference: 'zh' },
        { email: 'kapioomeal@gmail.com', name: 'Test User 15', _id: 'test-15', languagePreference: 'en' }
      ];
      
      // Use the SSE stream logic with test users
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          const sendProgress = (data: any) => {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
          };
          
          try {
            const totalUsers = testUsers.length;
            let emailsSent = 0;
            let emailsFailed = 0;
            const failedEmails: Array<{ email: string; name: string; error: string }> = [];
            
            const emailsPerBatch = 5;
            const delayBetweenBatches = 1000;
            const totalBatches = Math.ceil(totalUsers / emailsPerBatch);
            
            sendProgress({
              type: 'start',
              totalUsers,
              currentBatch: 0,
              totalBatches,
              emailsSent: 0,
              emailsFailed: 0,
              progress: 0,
              message: `[TEST MODE] Starting to send emails to ${totalUsers} test users...`
            });
            
            for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
              const start = batchIndex * emailsPerBatch;
              const end = Math.min(start + emailsPerBatch, totalUsers);
              const batch = testUsers.slice(start, end);
              
              sendProgress({
                type: 'batch_start',
                currentBatch: batchIndex + 1,
                totalBatches,
                emailsSent,
                emailsFailed,
                progress: Math.round((emailsSent + emailsFailed) / totalUsers * 100),
                message: `[TEST MODE] Processing batch ${batchIndex + 1} of ${totalBatches}...`
              });
              
              const batchPromises = batch.map(async (user) => {
                try {
                  await sendNextWeekMenuUpdateEmail(
                    user.email,
                    user.name,
                    user._id.toString(),
                    user.languagePreference || 'zh'
                  );
                  emailsSent++;
                  
                  sendProgress({
                    type: 'email_sent',
                    emailsSent,
                    emailsFailed,
                    totalUsers,
                    currentBatch: batchIndex + 1,
                    totalBatches,
                    progress: Math.round((emailsSent + emailsFailed) / totalUsers * 100)
                  });
                } catch (error) {
                  emailsFailed++;
                  failedEmails.push({
                    email: user.email,
                    name: user.name,
                    error: error instanceof Error ? error.message : 'Unknown error'
                  });
                  
                  sendProgress({
                    type: 'email_failed',
                    emailsSent,
                    emailsFailed,
                    totalUsers,
                    currentBatch: batchIndex + 1,
                    totalBatches,
                    progress: Math.round((emailsSent + emailsFailed) / totalUsers * 100),
                    failedEmail: user.email
                  });
                }
              });
              
              await Promise.all(batchPromises);
              
              sendProgress({
                type: 'batch_complete',
                currentBatch: batchIndex + 1,
                totalBatches,
                emailsSent,
                emailsFailed,
                progress: Math.round((emailsSent + emailsFailed) / totalUsers * 100)
              });
              
              if (batchIndex < totalBatches - 1) {
                // Send keep-alive heartbeat every 200ms during the 1-second delay
                for (let i = 0; i < 5; i++) {
                  await new Promise(resolve => setTimeout(resolve, 200));
                  controller.enqueue(encoder.encode(`: heartbeat\n\n`));
                }
              }
            }
            
            sendProgress({
              type: 'complete',
              emailsSent,
              emailsFailed,
              totalUsers,
              failedEmails,
              message: `[TEST MODE] Completed! Sent ${emailsSent} emails, ${emailsFailed} failed.`
            });
            
            controller.close();
          } catch (error) {
            sendProgress({
              type: 'error',
              message: error instanceof Error ? error.message : 'Unknown error occurred'
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
    
    await connectToDatabase();
    
    // Build query for eligible users
    const query: any = {
      isVerified: true, // Only send to verified users
      emailStatus: { $ne: 'bounced' }, // Exclude bounced emails
      email: { $exists: true, $ne: '', $ne: null }, // Must have valid email
      'emailPreferences.nextWeekMenuUpdates': { $ne: false } // Not unsubscribed
    };
    
    // If specific userIds provided (from "Select users" option), filter by them
    if (userIds && Array.isArray(userIds) && userIds.length > 0) {
      query._id = { $in: userIds };
    }
    
    // Fetch eligible users
    const users = await User.find(query)
      .select('_id name email languagePreference')
      .lean();
    
    console.log(`📧 Sending next week menu update to ${users.length} users`);
    
    // Set up Server-Sent Events for progress tracking
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const sendProgress = (data: any) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        };
        
        try {
          const totalUsers = users.length;
          let emailsSent = 0;
          let emailsFailed = 0;
          const failedEmails: Array<{ email: string; name: string; error: string }> = [];
          
          // Process emails with rate limiting
          // Resend limit: 6 requests per second
          // Strategy: Send 5 emails in parallel, then wait 1 second before next batch
          const emailsPerBatch = 5;
          const delayBetweenBatches = 1000; // 1 second
          const totalBatches = Math.ceil(totalUsers / emailsPerBatch);
          
          // Send initial progress
          console.log(`[Email Sending] Starting to send emails to ${totalUsers} users in ${totalBatches} batches`);
          sendProgress({
            type: 'start',
            totalUsers,
            currentBatch: 0,
            totalBatches,
            emailsSent: 0,
            emailsFailed: 0,
            progress: 0,
            message: `Starting to send emails to ${totalUsers} users...`
          });
          
          for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
            const start = batchIndex * emailsPerBatch;
            const end = Math.min(start + emailsPerBatch, totalUsers);
            const batch = users.slice(start, end);
            
            console.log(`[Email Sending] Batch ${batchIndex + 1}/${totalBatches}: Processing ${batch.length} emails`);
            sendProgress({
              type: 'batch_start',
              currentBatch: batchIndex + 1,
              totalBatches,
              emailsSent,
              emailsFailed,
              progress: Math.round((emailsSent + emailsFailed) / totalUsers * 100),
              message: `Processing batch ${batchIndex + 1} of ${totalBatches}...`
            });
            
            // Send emails in parallel within this small batch (5 emails max)
            const batchPromises = batch.map(async (user) => {
              try {
                await sendNextWeekMenuUpdateEmail(
                  user.email,
                  user.name,
                  user._id.toString(),
                  user.languagePreference || 'zh'
                );
                emailsSent++;
                
                sendProgress({
                  type: 'email_sent',
                  emailsSent,
                  emailsFailed,
                  totalUsers,
                  currentBatch: batchIndex + 1,
                  totalBatches,
                  progress: Math.round((emailsSent + emailsFailed) / totalUsers * 100)
                });
              } catch (error) {
                emailsFailed++;
                failedEmails.push({
                  email: user.email,
                  name: user.name,
                  error: error instanceof Error ? error.message : 'Unknown error'
                });
                
                sendProgress({
                  type: 'email_failed',
                  emailsSent,
                  emailsFailed,
                  totalUsers,
                  currentBatch: batchIndex + 1,
                  totalBatches,
                  progress: Math.round((emailsSent + emailsFailed) / totalUsers * 100),
                  failedEmail: user.email
                });
              }
            });
            
            // Wait for all emails in this batch to complete
            await Promise.all(batchPromises);
            
            sendProgress({
              type: 'batch_complete',
              currentBatch: batchIndex + 1,
              totalBatches,
              emailsSent,
              emailsFailed,
              progress: Math.round((emailsSent + emailsFailed) / totalUsers * 100)
            });
            
            // Wait 1 second between batches to respect rate limit (5 emails per second)
            // Send heartbeat messages during the delay to keep the SSE connection alive
            if (batchIndex < totalBatches - 1) {
              // Send keep-alive heartbeat every 200ms during the 1-second delay
              for (let i = 0; i < 5; i++) {
                await new Promise(resolve => setTimeout(resolve, 200));
                // Send heartbeat comment (SSE standard for keep-alive)
                controller.enqueue(encoder.encode(`: heartbeat\n\n`));
              }
            }
          }
          
          // Send completion message
          console.log(`[Email Sending] Completed! Sent: ${emailsSent}, Failed: ${emailsFailed}, Total: ${totalUsers}`);
          sendProgress({
            type: 'complete',
            emailsSent,
            emailsFailed,
            totalUsers,
            failedEmails,
            message: `Completed! Sent ${emailsSent} emails, ${emailsFailed} failed.`
          });
          
          controller.close();
        } catch (error) {
          console.error('[Email Sending] Error:', error);
          sendProgress({
            type: 'error',
            message: error instanceof Error ? error.message : 'Unknown error occurred'
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
    
  } catch (error) {
    console.error('Error in notify-next-week-menu route:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to send notifications' },
      { status: 500 }
    );
  }
}

// GET handler - get summary of eligible users
export async function GET() {
  try {
    await connectToDatabase();
    
    // Count total users
    const totalUsers = await User.countDocuments();
    
    // Count eligible users (will receive email)
    const eligibleUsers = await User.countDocuments({
      isVerified: true,
      emailStatus: { $ne: 'bounced' },
      email: { $exists: true, $ne: '', $ne: null },
      'emailPreferences.nextWeekMenuUpdates': { $ne: false }
    });
    
    // Count excluded users by reason
    const unsubscribed = await User.countDocuments({
      'emailPreferences.nextWeekMenuUpdates': false
    });
    
    const bounced = await User.countDocuments({
      emailStatus: 'bounced'
    });
    
    const invalid = await User.countDocuments({
      $or: [
        { email: { $exists: false } },
        { email: '' },
        { email: null }
      ]
    });
    
    const unverified = await User.countDocuments({
      isVerified: false
    });
    
    return NextResponse.json({
      success: true,
      data: {
        totalUsers,
        eligibleUsers,
        excluded: {
          unsubscribed,
          bounced,
          invalid,
          unverified,
          total: totalUsers - eligibleUsers
        }
      }
    });
  } catch (error) {
    console.error('Error getting user summary:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get user summary' },
      { status: 500 }
    );
  }
}
