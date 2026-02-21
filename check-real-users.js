const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

async function checkRealUsers() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected!\n');

    const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
    
    // Count all users
    const totalUsers = await User.countDocuments({});
    console.log(`👥 Total users in database: ${totalUsers}\n`);

    // Count eligible users for next week menu emails
    const eligibleUsers = await User.countDocuments({
      isVerified: true,
      emailStatus: { $ne: 'bounced' },
      email: { $exists: true, $ne: '', $ne: null },
      'emailPreferences.nextWeekMenuUpdates': { $ne: false }
    });
    console.log(`✅ Eligible for "Next Week Menu" emails: ${eligibleUsers}\n`);

    // Show breakdown
    const verified = await User.countDocuments({ isVerified: true });
    const withEmail = await User.countDocuments({ email: { $exists: true, $ne: '', $ne: null } });
    const notBounced = await User.countDocuments({ emailStatus: { $ne: 'bounced' } });
    const subscribed = await User.countDocuments({ 'emailPreferences.nextWeekMenuUpdates': { $ne: false } });

    console.log('📊 Breakdown:');
    console.log(`   Verified: ${verified}`);
    console.log(`   Has email: ${withEmail}`);
    console.log(`   Not bounced: ${notBounced}`);
    console.log(`   Subscribed to next-week emails: ${subscribed}\n`);

    // List first 10 eligible users
    console.log('👤 First 10 eligible users:\n');
    const users = await User.find({
      isVerified: true,
      emailStatus: { $ne: 'bounced' },
      email: { $exists: true, $ne: '', $ne: null },
      'emailPreferences.nextWeekMenuUpdates': { $ne: false }
    }).limit(10).select('userID name email');

    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.userID} - ${user.name} (${user.email})`);
    });

    console.log('');

    // Check if you're the only user
    if (eligibleUsers === 1) {
      console.log('⚠️  WARNING: You are the ONLY eligible user!');
      console.log('   "Send to All Users" will only send to YOU.');
      console.log('   Use "Send Test Email" button instead for testing.\n');
    } else {
      console.log(`✅ Good! You have ${eligibleUsers} eligible users.`);
      console.log('   "Send to All Users" will send to all of them.\n');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
  }
}

checkRealUsers();
