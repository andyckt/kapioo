import { NextResponse } from 'next/server';

import { handleRouteError } from '@/lib/api';
import { requireAdminMfa } from '@/lib/auth/guards';
import connectToDatabase from '@/lib/db';
import DailyDeliveryOrder from '@/models/DailyDeliveryOrder';

// GET handler - get all unique combo names from orders
export async function GET(request: Request) {
  try {
    const { actor, response } = await requireAdminMfa(request);
    if (!actor || response) {
      return response;
    }
    
    await connectToDatabase();
    
    // Aggregate to get unique combo names
    const result = await DailyDeliveryOrder.aggregate([
      // Unwind the items array to get individual items
      { $unwind: "$items" },
      
      // Group by combo name
      { 
        $group: { 
          _id: "$items.comboName"
        }
      },
      
      // Sort alphabetically
      { $sort: { _id: 1 } },
      
      // Project to format the output
      {
        $project: {
          _id: 0,
          comboName: "$_id"
        }
      }
    ]);
    
    // Extract combo names from the result
    const comboNames = result.map(item => item.comboName);
    
    console.log(`Found ${comboNames.length} unique combo names`);
    
    return NextResponse.json({
      success: true,
      comboNames
    });
  } catch (error: unknown) {
    return handleRouteError(error, 'GET /api/admin/daily-delivery/orders/combos');
  }
}
