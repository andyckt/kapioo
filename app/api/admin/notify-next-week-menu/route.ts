import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import User from '@/models/User';
import { sendNextWeekMenuUpdateEmail } from '@/lib/services/email';

export const dynamic = 'force-dynamic';

// POST handler - send next week menu update to users
export async function POST(request: Request) {
  try {
    const { userIds, testMode, testEmail } = await request.json();
    
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
          
          // Send initial progress
          sendProgress({
            type: 'start',
            totalUsers,
            message: `Starting to send emails to ${totalUsers} users...`
          });
          
          // Process in batches of 50
          const batchSize = 50;
          const totalBatches = Math.ceil(totalUsers / batchSize);
          
          for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
            const start = batchIndex * batchSize;
            const end = Math.min(start + batchSize, totalUsers);
            const batch = users.slice(start, end);
            
            sendProgress({
              type: 'batch_start',
              currentBatch: batchIndex + 1,
              totalBatches,
              message: `Processing batch ${batchIndex + 1} of ${totalBatches}...`
            });
            
            // Send emails in parallel within the batch
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
              emailsFailed
            });
            
            // Wait 2 seconds between batches to avoid rate limiting
            if (batchIndex < totalBatches - 1) {
              await new Promise(resolve => setTimeout(resolve, 2000));
            }
          }
          
          // Send completion message
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
