/**
 * Migration Script: Apply Weekly Orders Fix
 * 
 * This script reads the fix-template.json file (after manual review and updates)
 * and applies the fixes to the database:
 * 1. Splits orders with multiple delivery dates into separate orders
 * 2. Updates delivery dates to correct values
 * 3. Creates new order IDs for split orders
 * 4. Preserves all other order data
 * 
 * IMPORTANT: Review fix-template.json before running this script!
 */

const mongoose = require('mongoose');
const fs = require('fs');
const readline = require('readline');

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  throw new Error('MONGODB_URI environment variable is required');
}

// Define schema
const WeeklyOrderSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  orderId: { type: String, required: true, unique: true },
  items: { type: mongoose.Schema.Types.Mixed, required: true },
  status: { type: String, enum: ['pending', 'confirmed', 'delivery', 'delivered', 'cancelled', 'refunded'], default: 'pending' },
  creditCost: { type: Number, required: true },
  mealPlanType: { type: String, enum: ['6aweek', '8aweek', '10aweek', '12aweek'] },
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

const WeeklyOrder = mongoose.models.WeeklyOrder || mongoose.model('WeeklyOrder', WeeklyOrderSchema);

function askQuestion(query) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise(resolve => rl.question(query, ans => {
    rl.close();
    resolve(ans);
  }));
}

async function applyFixes() {
  try {
    console.log('🔍 Reading fix template...');
    
    if (!fs.existsSync('./fix-template.json')) {
      console.error('❌ Error: fix-template.json not found!');
      console.log('   Please run fix-weekly-orders-multi-week-bug.js first.\n');
      process.exit(1);
    }

    const fixTemplate = JSON.parse(fs.readFileSync('./fix-template.json', 'utf8'));
    console.log(`✅ Loaded ${fixTemplate.length} orders to fix\n`);

    // Validate template
    const invalidOrders = fixTemplate.filter(fix => 
      fix.itemsByDate.some(item => item.suggestedCorrectDate === 'MANUAL_REVIEW_NEEDED')
    );

    if (invalidOrders.length > 0) {
      console.error('❌ Error: Some orders still need manual review!');
      console.log('   The following orders have "MANUAL_REVIEW_NEEDED":');
      invalidOrders.forEach(order => {
        console.log(`   - ${order.orderId}`);
      });
      console.log('\n   Please update fix-template.json with correct dates before running this script.\n');
      process.exit(1);
    }

    console.log('📋 Fix Summary:');
    console.log(`   Orders to split: ${fixTemplate.filter(f => f.action === 'SPLIT_ORDER').length}`);
    console.log(`   Orders to update: ${fixTemplate.filter(f => f.action === 'UPDATE_DATES').length}`);
    console.log('');

    const answer = await askQuestion('⚠️  This will modify the database. Continue? (yes/no): ');
    
    if (answer.toLowerCase() !== 'yes' && answer.toLowerCase() !== 'y') {
      console.log('❌ Aborted by user\n');
      process.exit(0);
    }

    console.log('\n🔍 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const results = {
      success: [],
      failed: [],
      skipped: []
    };

    // Process each fix
    for (const fix of fixTemplate) {
      try {
        console.log(`\n${'='.repeat(60)}`);
        console.log(`Processing: ${fix.orderId}`);
        console.log(`Action: ${fix.action}`);

        const originalOrder = await WeeklyOrder.findOne({ orderId: fix.orderId });
        
        if (!originalOrder) {
          console.log(`⚠️  Order not found, skipping...`);
          results.skipped.push({ orderId: fix.orderId, reason: 'Order not found' });
          continue;
        }

        if (fix.action === 'SPLIT_ORDER') {
          // Split order into multiple orders by date
          console.log(`📦 Splitting order into ${fix.itemsByDate.length} separate orders...`);
          
          const newOrders = [];
          
          for (let i = 0; i < fix.itemsByDate.length; i++) {
            const dateGroup = fix.itemsByDate[i];
            const newOrderId = i === 0 
              ? originalOrder.orderId // Keep original ID for first order
              : `WS-${Math.floor(10000000 + Math.random() * 90000000)}`; // Generate new ID for additional orders

            const newOrderItems = dateGroup.items.map(item => {
              // Find the original item to preserve all fields
              const originalItem = originalOrder.items.find(oi => 
                oi.dayId === item.dayId && 
                oi.optionName === item.optionName &&
                oi.quantity === item.quantity
              );
              
              return {
                ...originalItem,
                date: dateGroup.suggestedCorrectDate // Update to correct date
              };
            });

            const orderData = {
              userId: originalOrder.userId,
              orderId: newOrderId,
              items: newOrderItems,
              status: originalOrder.status,
              creditCost: newOrderItems.reduce((sum, item) => sum + item.quantity, 0),
              mealPlanType: originalOrder.mealPlanType,
              specialInstructions: originalOrder.specialInstructions,
              deliveryAddress: originalOrder.deliveryAddress,
              phoneNumber: originalOrder.phoneNumber,
              area: originalOrder.area,
              confirmedAt: originalOrder.confirmedAt,
              deliveredAt: originalOrder.deliveredAt,
              refundedAt: originalOrder.refundedAt,
              createdAt: originalOrder.createdAt,
              updatedAt: new Date()
            };

            if (i === 0) {
              // Update existing order
              await WeeklyOrder.findOneAndUpdate(
                { orderId: originalOrder.orderId },
                orderData
              );
              console.log(`   ✅ Updated original order ${newOrderId} with ${newOrderItems.length} items for ${dateGroup.suggestedCorrectDate}`);
            } else {
              // Create new order
              await WeeklyOrder.create(orderData);
              console.log(`   ✅ Created new order ${newOrderId} with ${newOrderItems.length} items for ${dateGroup.suggestedCorrectDate}`);
            }

            newOrders.push(newOrderId);
          }

          results.success.push({
            orderId: fix.orderId,
            action: 'split',
            newOrders
          });

        } else if (fix.action === 'UPDATE_DATES') {
          // Just update the dates in existing order
          console.log(`📝 Updating delivery dates...`);
          
          const updatedItems = originalOrder.items.map(item => {
            const matchingGroup = fix.itemsByDate.find(group => 
              group.items.some(i => 
                i.dayId === item.dayId && 
                i.optionName === item.optionName
              )
            );
            
            if (matchingGroup) {
              return {
                ...item,
                date: matchingGroup.suggestedCorrectDate
              };
            }
            return item;
          });

          await WeeklyOrder.findOneAndUpdate(
            { orderId: fix.orderId },
            { 
              items: updatedItems,
              updatedAt: new Date()
            }
          );

          console.log(`   ✅ Updated dates for ${updatedItems.length} items`);
          
          results.success.push({
            orderId: fix.orderId,
            action: 'update'
          });
        }

      } catch (error) {
        console.error(`   ❌ Error processing ${fix.orderId}:`, error.message);
        results.failed.push({
          orderId: fix.orderId,
          error: error.message
        });
      }
    }

    // Print final report
    console.log('\n' + '='.repeat(80));
    console.log('📊 FINAL REPORT');
    console.log('='.repeat(80));
    console.log(`✅ Successfully processed: ${results.success.length}`);
    console.log(`❌ Failed: ${results.failed.length}`);
    console.log(`⚠️  Skipped: ${results.skipped.length}`);
    console.log('');

    if (results.failed.length > 0) {
      console.log('Failed orders:');
      results.failed.forEach(f => {
        console.log(`   - ${f.orderId}: ${f.error}`);
      });
      console.log('');
    }

    if (results.skipped.length > 0) {
      console.log('Skipped orders:');
      results.skipped.forEach(s => {
        console.log(`   - ${s.orderId}: ${s.reason}`);
      });
      console.log('');
    }

    // Save detailed report
    const reportPath = './fix-results-report.json';
    fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
    console.log(`📝 Detailed report saved to: ${reportPath}\n`);

    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB\n');

  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

console.log('\n' + '='.repeat(80));
console.log('🔧 Apply Weekly Orders Fix Script');
console.log('='.repeat(80));
console.log('');

applyFixes();
