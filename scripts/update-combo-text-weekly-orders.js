/**
 * One-time script to update combo text for specific weekly orders
 * 
 * Purpose: Update combo text from old to new for customer service exception
 * 
 * Old text: 🇭🇺匈牙利风味炖牛肉 + 清炒黄瓜条玉米粒 + 豌豆饭
 * New text: 🇭🇺匈牙利风味炖牛肉 + 意式烤时蔬 + 绵密土豆泥🥔
 * 
 * Orders to update: 12 specific order IDs
 */

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// Load environment variables from .env.local
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

// MongoDB connection string
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://kamtocheung1104:N7H0LQ9L2bq5qQbo@kapiofood.otsn8px.mongodb.net/kapioo?retryWrites=true&w=majority&appName=kapiofood';

// Configuration
const DRY_RUN = process.argv.includes('--dry-run') || process.argv.includes('-d');
const OLD_COMBO_TEXT = '🇭🇺匈牙利风味炖牛肉 + 清炒黄瓜条玉米粒 + 豌豆饭';
const NEW_COMBO_TEXT = '🇭🇺匈牙利风味炖牛肉 + 意式烤时蔬 + 绵密土豆泥🥔';

// Order IDs to update
const ORDER_IDS = [
  'WS-98471777',
  'WS-46627859',
  'WS-62944513',
  'WS-70195923',
  'WS-41108680',
  'WS-49877754',
  'WS-83347539',
  'WS-21639338',
  'WS-28473190',
  'WS-72506011',
  'WS-36188189',
  'WS-92263598',
  'WS-96704377'
];

// Define WeeklyOrder schema
const WeeklyOrderSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  orderId: { type: String, required: true, unique: true },
  items: { type: mongoose.Schema.Types.Mixed, required: true },
  status: { type: String, enum: ['pending', 'confirmed', 'delivery', 'delivered', 'cancelled', 'refunded'], default: 'pending' },
  creditCost: { type: Number, required: true },
  specialInstructions: String,
  deliveryAddress: {
    unitNumber: String,
    streetAddress: String,
    province: String,
    postalCode: String,
    country: String,
    buzzCode: String
  },
  phoneNumber: String,
  area: String,
  confirmedAt: Date,
  deliveredAt: Date,
  refundedAt: Date,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

let WeeklyOrder;

async function connectToDatabase() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    // Initialize model
    WeeklyOrder = mongoose.models.WeeklyOrder || mongoose.model('WeeklyOrder', WeeklyOrderSchema);
  } catch (error) {
    console.error('❌ Error connecting to MongoDB:', error);
    throw error;
  }
}

async function backupOrders(orders) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFile = path.join(__dirname, `backup-weekly-orders-${timestamp}.json`);
  
  const backupData = orders.map(order => ({
    orderId: order.orderId,
    items: order.items,
    status: order.status,
    createdAt: order.createdAt
  }));
  
  fs.writeFileSync(backupFile, JSON.stringify(backupData, null, 2));
  console.log(`📦 Backup saved to: ${backupFile}`);
  return backupFile;
}

async function updateComboText() {
  console.log('\n' + '='.repeat(80));
  console.log('🔧 WEEKLY ORDER COMBO TEXT UPDATE SCRIPT');
  console.log('='.repeat(80));
  console.log(`Mode: ${DRY_RUN ? '🔍 DRY RUN (no changes will be made)' : '✏️ LIVE UPDATE'}`);
  console.log(`Old text: "${OLD_COMBO_TEXT}"`);
  console.log(`New text: "${NEW_COMBO_TEXT}"`);
  console.log(`Orders to update: ${ORDER_IDS.length}`);
  console.log('='.repeat(80) + '\n');

  try {
    await connectToDatabase();
    
    // Step 1: Find all orders
    console.log('📋 Step 1: Finding orders...\n');
    const orders = await WeeklyOrder.find({ orderId: { $in: ORDER_IDS } }).lean();
    
    console.log(`Found ${orders.length} out of ${ORDER_IDS.length} orders in database\n`);
    
    if (orders.length === 0) {
      console.log('⚠️ No orders found. Exiting.');
      return;
    }
    
    // Check for missing orders
    const foundOrderIds = orders.map(o => o.orderId);
    const missingOrderIds = ORDER_IDS.filter(id => !foundOrderIds.includes(id));
    if (missingOrderIds.length > 0) {
      console.log(`⚠️ WARNING: ${missingOrderIds.length} order(s) not found in database:`);
      missingOrderIds.forEach(id => console.log(`   - ${id}`));
      console.log('');
    }
    
    // Step 2: Backup orders
    if (!DRY_RUN) {
      console.log('📦 Step 2: Creating backup...\n');
      await backupOrders(orders);
      console.log('');
    }
    
    // Step 3: Analyze what will be changed
    console.log('🔍 Step 3: Analyzing changes...\n');
    
    const changesLog = [];
    let totalItemsToUpdate = 0;
    let totalQuantityAffected = 0;
    
    orders.forEach(order => {
      const orderChanges = {
        orderId: order.orderId,
        status: order.status,
        itemsChanged: [],
        itemsUnchanged: []
      };
      
      if (!order.items || !Array.isArray(order.items)) {
        console.log(`⚠️ Order ${order.orderId}: No items array found`);
        return;
      }
      
      order.items.forEach((item, index) => {
        if (item.optionName === OLD_COMBO_TEXT) {
          totalItemsToUpdate++;
          totalQuantityAffected += item.quantity || 0;
          orderChanges.itemsChanged.push({
            index,
            dayId: item.dayId,
            date: item.date,
            quantity: item.quantity,
            oldText: item.optionName,
            newText: NEW_COMBO_TEXT
          });
        } else {
          orderChanges.itemsUnchanged.push({
            index,
            dayId: item.dayId,
            date: item.date,
            optionName: item.optionName,
            quantity: item.quantity
          });
        }
      });
      
      if (orderChanges.itemsChanged.length > 0) {
        changesLog.push(orderChanges);
      }
    });
    
    // Display summary
    console.log('📊 SUMMARY:');
    console.log(`   Total orders found: ${orders.length}`);
    console.log(`   Orders with matching combo: ${changesLog.length}`);
    console.log(`   Total items to update: ${totalItemsToUpdate}`);
    console.log(`   Total quantity affected: ${totalQuantityAffected}`);
    console.log('');
    
    if (changesLog.length === 0) {
      console.log('⚠️ No matching combo text found in any orders. Nothing to update.');
      return;
    }
    
    // Display detailed changes
    console.log('📝 DETAILED CHANGES:\n');
    changesLog.forEach(change => {
      console.log(`Order: ${change.orderId} (Status: ${change.status})`);
      console.log(`   Items to change: ${change.itemsChanged.length}`);
      change.itemsChanged.forEach(item => {
        console.log(`   - Item ${item.index}: ${item.dayId} (${item.date}) - Quantity: ${item.quantity}`);
        console.log(`     OLD: "${item.oldText}"`);
        console.log(`     NEW: "${item.newText}"`);
      });
      if (change.itemsUnchanged.length > 0) {
        console.log(`   Items unchanged: ${change.itemsUnchanged.length}`);
        change.itemsUnchanged.forEach(item => {
          console.log(`   - Item ${item.index}: ${item.dayId} (${item.date}) - "${item.optionName}" x${item.quantity}`);
        });
      }
      console.log('');
    });
    
    // Step 4: Apply changes (if not dry-run)
    if (DRY_RUN) {
      console.log('🔍 DRY RUN MODE - No changes were made to the database');
      console.log('💡 To apply these changes, run: node scripts/update-combo-text-weekly-orders.js');
    } else {
      console.log('✏️ Step 4: Applying changes to database...\n');
      
      let successCount = 0;
      let errorCount = 0;
      
      for (const change of changesLog) {
        try {
          // Find the order
          const order = await WeeklyOrder.findOne({ orderId: change.orderId });
          
          if (!order) {
            console.log(`❌ Order ${change.orderId}: Not found (skipping)`);
            errorCount++;
            continue;
          }
          
          // Update the items
          let itemsUpdated = 0;
          order.items.forEach((item, index) => {
            if (item.optionName === OLD_COMBO_TEXT) {
              item.optionName = NEW_COMBO_TEXT;
              itemsUpdated++;
            }
          });
          
          // Save the order
          await order.save();
          
          console.log(`✅ Order ${change.orderId}: Updated ${itemsUpdated} item(s)`);
          successCount++;
          
        } catch (error) {
          console.log(`❌ Order ${change.orderId}: Error - ${error.message}`);
          errorCount++;
        }
      }
      
      console.log('\n' + '='.repeat(80));
      console.log('✅ UPDATE COMPLETE');
      console.log('='.repeat(80));
      console.log(`Success: ${successCount} orders updated`);
      console.log(`Errors: ${errorCount} orders failed`);
      console.log(`Total items updated: ${totalItemsToUpdate}`);
      console.log(`Total quantity affected: ${totalQuantityAffected}`);
      console.log('='.repeat(80) + '\n');
    }
    
  } catch (error) {
    console.error('\n❌ SCRIPT ERROR:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  }
}

// Run the script
updateComboText()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
