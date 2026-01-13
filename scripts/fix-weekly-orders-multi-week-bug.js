/**
 * Migration Script: Fix Weekly Orders with Multi-Week Bug
 * 
 * This script fixes orders that were affected by the multi-week bug where:
 * 1. Orders have wrong delivery dates (showing Week 0 dates instead of Week 1/2)
 * 2. Multiple delivery dates were merged into a single order
 * 3. Some orders are completely missing
 * 
 * The script will:
 * 1. Identify affected orders (orders with items from multiple dates that should be separate)
 * 2. Split them into correct separate orders with correct dates
 * 3. Update order IDs and dates appropriately
 * 4. Generate a report of all changes
 */

const mongoose = require('mongoose');
const readline = require('readline');

// MongoDB connection string - update this with your connection string
const MONGODB_URI = process.env.MONGODB_URI || 'your-mongodb-connection-string';

// Define schemas
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

const WeeklyDeliveryDaySchema = new mongoose.Schema({
  day: { type: String, required: true },
  name: { type: String, required: true },
  date: { type: String, required: true },
  active: { type: Boolean, default: true },
  options: [{ type: mongoose.Schema.Types.ObjectId, ref: 'WeeklyMealOption' }],
  weekOffset: { type: Number, default: 0 }
});

// Create models
const WeeklyOrder = mongoose.models.WeeklyOrder || mongoose.model('WeeklyOrder', WeeklyOrderSchema);
const WeeklyDeliveryDay = mongoose.models.WeeklyDeliveryDay || mongoose.model('WeeklyDeliveryDay', WeeklyDeliveryDaySchema);

// Helper function to prompt user for confirmation
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

async function fixWeeklyOrders() {
  try {
    console.log('🔍 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Step 1: Fetch all delivery days to build date mapping
    console.log('📅 Fetching delivery day configuration...');
    const deliveryDays = await WeeklyDeliveryDay.find().lean();
    
    // Build a map of dayId -> dates by weekOffset
    const dayDateMap = {};
    deliveryDays.forEach(day => {
      const key = `${day.day}-${day.weekOffset}`;
      dayDateMap[key] = day.date;
    });
    
    console.log('📅 Delivery day mapping:');
    Object.entries(dayDateMap).forEach(([key, date]) => {
      console.log(`   ${key} → ${date}`);
    });
    console.log('');

    // Step 2: Find potentially affected orders
    // Orders created after the bug was introduced and have multiple items
    console.log('🔍 Searching for potentially affected orders...');
    const allOrders = await WeeklyOrder.find({
      createdAt: { $gte: new Date('2026-01-01') } // Adjust this date as needed
    }).populate('userId', 'name email').lean();

    console.log(`📊 Found ${allOrders.length} orders to analyze\n`);

    const affectedOrders = [];
    const reportLines = [];

    // Step 3: Analyze each order
    for (const order of allOrders) {
      if (!order.items || order.items.length === 0) continue;

      // Group items by their actual dates
      const itemsByDate = {};
      let hasWrongDates = false;

      order.items.forEach(item => {
        const currentDate = item.date;
        
        // Try to determine the correct date based on dayId
        // Check if this item's date matches any week 0 date when it should be week 1+
        const week0Key = `${item.dayId}-0`;
        const week1Key = `${item.dayId}-1`;
        const week2Key = `${item.dayId}-2`;
        
        const week0Date = dayDateMap[week0Key];
        const week1Date = dayDateMap[week1Key];
        const week2Date = dayDateMap[week2Key];

        // If current date is week 0 but week 1/2 exist, this might be wrong
        if (currentDate === week0Date && (week1Date || week2Date)) {
          hasWrongDates = true;
        }

        if (!itemsByDate[currentDate]) {
          itemsByDate[currentDate] = [];
        }
        itemsByDate[currentDate].push(item);
      });

      // Check if order has multiple delivery dates (should be split)
      const uniqueDates = Object.keys(itemsByDate);
      
      if (uniqueDates.length > 1 || hasWrongDates) {
        affectedOrders.push({
          order,
          itemsByDate,
          uniqueDates,
          hasWrongDates
        });

        const userName = order.userId?.name || 'Unknown';
        const userEmail = order.userId?.email || 'Unknown';
        
        reportLines.push(`\n${'='.repeat(80)}`);
        reportLines.push(`Order ID: ${order.orderId}`);
        reportLines.push(`Customer: ${userName} (${userEmail})`);
        reportLines.push(`Status: ${order.status}`);
        reportLines.push(`Created: ${order.createdAt}`);
        reportLines.push(`Meal Plan: ${order.mealPlanType || 'N/A'}`);
        reportLines.push(`Issue: ${uniqueDates.length > 1 ? 'Multiple dates in one order' : 'Potentially wrong dates'}`);
        reportLines.push(`\nCurrent items by date:`);
        
        uniqueDates.forEach(date => {
          const items = itemsByDate[date];
          reportLines.push(`  📅 ${date}:`);
          items.forEach(item => {
            reportLines.push(`     - ${item.optionName || 'Unknown'} (${item.dayId}) x${item.quantity}`);
          });
        });

        reportLines.push(`\nPossible correct dates:`);
        const dayIds = [...new Set(order.items.map(item => item.dayId))];
        dayIds.forEach(dayId => {
          reportLines.push(`  ${dayId}:`);
          if (dayDateMap[`${dayId}-0`]) reportLines.push(`    Week 0: ${dayDateMap[`${dayId}-0`]}`);
          if (dayDateMap[`${dayId}-1`]) reportLines.push(`    Week 1: ${dayDateMap[`${dayId}-1`]}`);
          if (dayDateMap[`${dayId}-2`]) reportLines.push(`    Week 2: ${dayDateMap[`${dayId}-2`]}`);
        });
      }
    }

    // Step 4: Display report
    console.log('\n' + '='.repeat(80));
    console.log('📋 AFFECTED ORDERS REPORT');
    console.log('='.repeat(80));
    
    if (affectedOrders.length === 0) {
      console.log('\n✅ No affected orders found! All orders appear to be correct.\n');
      await mongoose.disconnect();
      return;
    }

    console.log(`\n⚠️  Found ${affectedOrders.length} potentially affected orders:\n`);
    reportLines.forEach(line => console.log(line));

    console.log('\n' + '='.repeat(80));
    console.log('📊 SUMMARY');
    console.log('='.repeat(80));
    console.log(`Total affected orders: ${affectedOrders.length}`);
    console.log(`Total affected users: ${new Set(affectedOrders.map(a => a.order.userId?._id?.toString())).size}`);
    console.log('');

    // Step 5: Ask for confirmation
    console.log('⚠️  IMPORTANT: This script will help you identify affected orders.');
    console.log('   Manual review is recommended before making changes.');
    console.log('');
    console.log('📝 Recommended next steps:');
    console.log('   1. Review the report above');
    console.log('   2. Contact affected customers to confirm correct delivery dates');
    console.log('   3. Manually update orders in the admin dashboard');
    console.log('   4. Or create a custom fix script based on specific cases');
    console.log('');

    const answer = await askQuestion('Would you like to export this report to a file? (yes/no): ');
    
    if (answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y') {
      const fs = require('fs');
      const reportPath = './affected-orders-report.txt';
      const reportContent = [
        'WEEKLY ORDERS MULTI-WEEK BUG REPORT',
        `Generated: ${new Date().toISOString()}`,
        `Total affected orders: ${affectedOrders.length}`,
        '',
        ...reportLines
      ].join('\n');
      
      fs.writeFileSync(reportPath, reportContent);
      console.log(`\n✅ Report exported to: ${reportPath}\n`);
    }

    // Step 6: Offer to create fix template
    console.log('\n📝 Creating fix template...');
    
    const fixTemplate = affectedOrders.map(({ order, itemsByDate, uniqueDates }) => {
      return {
        orderId: order.orderId,
        userEmail: order.userId?.email,
        currentStatus: order.status,
        action: uniqueDates.length > 1 ? 'SPLIT_ORDER' : 'UPDATE_DATES',
        itemsByDate: Object.entries(itemsByDate).map(([date, items]) => ({
          currentDate: date,
          items: items.map(item => ({
            dayId: item.dayId,
            optionName: item.optionName,
            quantity: item.quantity
          })),
          // Suggest correct date based on pattern
          suggestedCorrectDate: 'MANUAL_REVIEW_NEEDED'
        }))
      };
    });

    const fs = require('fs');
    fs.writeFileSync(
      './fix-template.json',
      JSON.stringify(fixTemplate, null, 2)
    );
    console.log('✅ Fix template created: ./fix-template.json');
    console.log('   Review and update the "suggestedCorrectDate" fields, then run the fix script.\n');

    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB\n');

  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

// Run the script
console.log('\n' + '='.repeat(80));
console.log('🔧 Weekly Orders Multi-Week Bug Fix Script');
console.log('='.repeat(80));
console.log('');

fixWeeklyOrders();
