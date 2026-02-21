const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

async function checkEmailJobs() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected!\n');

    // Check for active email jobs
    const NextWeekMenuEmailJob = mongoose.model('NextWeekMenuEmailJob', new mongoose.Schema({}, { strict: false }));
    
    console.log('📊 Checking for active email jobs...\n');
    
    const activeJobs = await NextWeekMenuEmailJob.find({
      status: { $in: ['pending', 'processing'] }
    }).sort({ createdAt: -1 }).limit(5);

    if (activeJobs.length === 0) {
      console.log('✅ No active email jobs found\n');
    } else {
      console.log(`⚠️  Found ${activeJobs.length} active email job(s):\n`);
      
      for (const job of activeJobs) {
        console.log(`Job ID: ${job._id}`);
        console.log(`Status: ${job.status}`);
        console.log(`Total Users: ${job.totalUsers}`);
        console.log(`Sent: ${job.sentCount}`);
        console.log(`Failed: ${job.failedCount}`);
        console.log(`Cursor: ${job.cursor} / ${job.totalUsers}`);
        console.log(`Progress: ${Math.round((job.cursor / job.totalUsers) * 100)}%`);
        console.log(`Created: ${job.createdAt}`);
        console.log(`Last Processed: ${job.lastProcessedAt || 'Never'}`);
        console.log('---\n');
      }
    }

    // Check recent completed jobs
    console.log('📋 Recent completed jobs (last 5):\n');
    
    const completedJobs = await NextWeekMenuEmailJob.find({
      status: 'completed'
    }).sort({ completedAt: -1 }).limit(5);

    if (completedJobs.length === 0) {
      console.log('No completed jobs found\n');
    } else {
      for (const job of completedJobs) {
        console.log(`Job ID: ${job._id}`);
        console.log(`Total Users: ${job.totalUsers}`);
        console.log(`Sent: ${job.sentCount}`);
        console.log(`Failed: ${job.failedCount}`);
        console.log(`Completed: ${job.completedAt}`);
        console.log('---\n');
      }
    }

    // Check your user account
    console.log('👤 Checking your user account...\n');
    
    const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
    
    const yourAccount = await User.findOne({
      email: { $in: ['donaldkamhungcheung@gmail.com', 'kapioomeal@gmail.com'] }
    });

    if (yourAccount) {
      console.log(`✅ Found your account:`);
      console.log(`Email: ${yourAccount.email}`);
      console.log(`Name: ${yourAccount.name}`);
      console.log(`User ID: ${yourAccount.userID}`);
      console.log(`Verified: ${yourAccount.isVerified}`);
      console.log(`Email Status: ${yourAccount.emailStatus || 'N/A'}`);
      console.log(`Email Preferences:`, yourAccount.emailPreferences || 'N/A');
      console.log('');
    } else {
      console.log('❌ Your account not found in database\n');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
  }
}

checkEmailJobs();
