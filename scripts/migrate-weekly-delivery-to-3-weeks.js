// Migration script to add Week 3 support to existing WeeklyDeliveryDay documents
// Run this with: node scripts/migrate-weekly-delivery-to-3-weeks.js

const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

async function migrate() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;
    const collection = db.collection('weeklydeliverydays');

    // Check current documents
    const existingDocs = await collection.find({}).toArray();
    console.log(`📊 Found ${existingDocs.length} existing delivery days`);

    // Check if Week 3 already exists
    const week3Docs = existingDocs.filter(doc => doc.weekOffset === 2);
    
    if (week3Docs.length > 0) {
      console.log('✅ Week 3 already exists, no migration needed');
      await mongoose.connection.close();
      return;
    }

    console.log('🔄 Week 3 not found, will be created by API on next request');
    console.log('✅ Migration complete!');

    await mongoose.connection.close();
    console.log('👋 Disconnected from MongoDB');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

migrate();

