const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

async function enableEmails() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected!\n');

    const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
    
    const result = await User.updateOne(
      { email: 'donaldkamhungcheung@gmail.com' },
      {
        $set: {
          'emailPreferences.nextWeekMenuUpdates': true
        }
      }
    );

    if (result.modifiedCount > 0) {
      console.log('✅ Successfully enabled "Next Week Menu Update" emails for donaldkamhungcheung@gmail.com');
      console.log('   You will now receive these emails again.\n');
    } else {
      console.log('⚠️  No changes made (email might already be enabled or user not found)\n');
    }

    // Verify the change
    const user = await User.findOne({ email: 'donaldkamhungcheung@gmail.com' });
    console.log('📧 Current email preferences:');
    console.log(user.emailPreferences);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Disconnected from MongoDB');
  }
}

enableEmails();
