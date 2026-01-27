import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import mongoose from 'mongoose';

// Configuration
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

export async function GET(request: Request) {
  const url = new URL(request.url);
  const dryRun = url.searchParams.get('dryRun') !== 'false'; // Default to true
  const apply = url.searchParams.get('apply') === 'true'; // Must explicitly set to true to apply changes

  console.log('\n' + '='.repeat(80));
  console.log('🔧 WEEKLY ORDER COMBO TEXT UPDATE');
  console.log('='.repeat(80));
  console.log(`Mode: ${apply ? '✏️ LIVE UPDATE' : '🔍 DRY RUN (no changes will be made)'}`);
  console.log(`Old text: "${OLD_COMBO_TEXT}"`);
  console.log(`New text: "${NEW_COMBO_TEXT}"`);
  console.log(`Orders to check: ${ORDER_IDS.length}`);
  console.log('='.repeat(80) + '\n');

  try {
    await connectToDatabase();
    
    // Initialize model
    const WeeklyOrder = mongoose.models.WeeklyOrder || mongoose.model('WeeklyOrder', WeeklyOrderSchema);
    
    // Step 1: Find all orders
    console.log('📋 Step 1: Finding orders...\n');
    const orders = await WeeklyOrder.find({ orderId: { $in: ORDER_IDS } }).lean();
    
    console.log(`Found ${orders.length} out of ${ORDER_IDS.length} orders in database\n`);
    
    if (orders.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'No orders found',
        dryRun: !apply
      });
    }
    
    // Check for missing orders
    const foundOrderIds = orders.map((o: any) => o.orderId);
    const missingOrderIds = ORDER_IDS.filter(id => !foundOrderIds.includes(id));
    if (missingOrderIds.length > 0) {
      console.log(`⚠️ WARNING: ${missingOrderIds.length} order(s) not found in database:`);
      missingOrderIds.forEach(id => console.log(`   - ${id}`));
      console.log('');
    }
    
    // Step 2: Analyze what will be changed
    console.log('🔍 Step 2: Analyzing changes...\n');
    
    const changesLog: any[] = [];
    let totalItemsToUpdate = 0;
    let totalQuantityAffected = 0;
    
    orders.forEach((order: any) => {
      const orderChanges = {
        orderId: order.orderId,
        status: order.status,
        itemsChanged: [] as any[],
        itemsUnchanged: [] as any[]
      };
      
      if (!order.items || !Array.isArray(order.items)) {
        console.log(`⚠️ Order ${order.orderId}: No items array found`);
        return;
      }
      
      order.items.forEach((item: any, index: number) => {
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
      return NextResponse.json({
        success: true,
        message: 'No matching combo text found',
        ordersFound: orders.length,
        ordersWithChanges: 0,
        dryRun: !apply
      });
    }
    
    // Display detailed changes
    console.log('📝 DETAILED CHANGES:\n');
    changesLog.forEach(change => {
      console.log(`Order: ${change.orderId} (Status: ${change.status})`);
      console.log(`   Items to change: ${change.itemsChanged.length}`);
      change.itemsChanged.forEach((item: any) => {
        console.log(`   - Item ${item.index}: ${item.dayId} (${item.date}) - Quantity: ${item.quantity}`);
        console.log(`     OLD: "${item.oldText}"`);
        console.log(`     NEW: "${item.newText}"`);
      });
      if (change.itemsUnchanged.length > 0) {
        console.log(`   Items unchanged: ${change.itemsUnchanged.length}`);
        change.itemsUnchanged.forEach((item: any) => {
          console.log(`   - Item ${item.index}: ${item.dayId} (${item.date}) - "${item.optionName}" x${item.quantity}`);
        });
      }
      console.log('');
    });
    
    // Step 3: Apply changes (if apply=true)
    if (!apply) {
      console.log('🔍 DRY RUN MODE - No changes were made to the database');
      console.log('💡 To apply these changes, add ?apply=true to the URL');
      console.log('   Example: /api/admin/update-combo-text?apply=true\n');
      
      return NextResponse.json({
        success: true,
        message: 'Dry run completed',
        dryRun: true,
        ordersFound: orders.length,
        ordersWithChanges: changesLog.length,
        totalItemsToUpdate,
        totalQuantityAffected,
        changes: changesLog,
        missingOrders: missingOrderIds
      });
    } else {
      console.log('✏️ Step 3: Applying changes to database...\n');
      
      let successCount = 0;
      let errorCount = 0;
      const updateResults: any[] = [];
      
      for (const change of changesLog) {
        try {
          // Find the order (not lean, so we can save)
          const order = await WeeklyOrder.findOne({ orderId: change.orderId });
          
          if (!order) {
            console.log(`❌ Order ${change.orderId}: Not found (skipping)`);
            errorCount++;
            updateResults.push({
              orderId: change.orderId,
              success: false,
              error: 'Order not found'
            });
            continue;
          }
          
          // Update the items
          let itemsUpdated = 0;
          order.items.forEach((item: any) => {
            if (item.optionName === OLD_COMBO_TEXT) {
              item.optionName = NEW_COMBO_TEXT;
              itemsUpdated++;
            }
          });
          
          // Save the order
          await order.save();
          
          console.log(`✅ Order ${change.orderId}: Updated ${itemsUpdated} item(s)`);
          successCount++;
          updateResults.push({
            orderId: change.orderId,
            success: true,
            itemsUpdated
          });
          
        } catch (error: any) {
          console.log(`❌ Order ${change.orderId}: Error - ${error.message}`);
          errorCount++;
          updateResults.push({
            orderId: change.orderId,
            success: false,
            error: error.message
          });
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
      
      return NextResponse.json({
        success: true,
        message: 'Update completed',
        dryRun: false,
        ordersFound: orders.length,
        ordersUpdated: successCount,
        ordersFailed: errorCount,
        totalItemsUpdated: totalItemsToUpdate,
        totalQuantityAffected,
        results: updateResults,
        missingOrders: missingOrderIds
      });
    }
    
  } catch (error: any) {
    console.error('\n❌ API ERROR:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to update orders',
        details: error.message 
      },
      { status: 500 }
    );
  }
}
