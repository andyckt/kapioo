import { NextResponse } from 'next/server';
import { requireAdminMfa } from '@/lib/auth/guards';
import connectToDatabase from '@/lib/db';
import mongoose from 'mongoose';

// Define the interface for the DailyOrder document
interface DailyOrderDocument extends mongoose.Document {
  userId: mongoose.Types.ObjectId;
  orderId: string;
  items: Array<{
    day: string;
    date: string;
    comboId: string;
    comboName: string;
    type: string;
    quantity: number;
    dishes: Array<{
      dishId: string;
      name: string;
    }>;
  }>;
  status: 'pending' | 'confirmed' | 'delivery' | 'delivered' | 'cancelled' | 'refunded';
  specialInstructions?: string;
  deliveryAddress: {
    unitNumber?: string;
    streetAddress: string;
    city: string;
    province: string;
    postalCode: string;
    country: string;
    buzzCode?: string;
  };
  phoneNumber: string;
  area: string;
  twoDishVouchersUsed: number;
  threeDishVouchersUsed: number;
  confirmedAt?: Date;
  deliveredAt?: Date;
  refundedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Create schema for daily delivery orders
const DailyDeliveryOrderSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  orderId: {
    type: String,
    required: true,
    unique: true
  },
  items: [{
    day: String,
    date: String,
    comboId: String,
    comboName: String,
    type: String,
    quantity: Number,
    dishes: [{
      dishId: String,
      name: String
    }]
  }],
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'delivery', 'delivered', 'cancelled', 'refunded'],
    default: 'pending'
  },
  specialInstructions: String,
  deliveryAddress: {
    unitNumber: String,
    streetAddress: String,
    city: String,
    province: String,
    postalCode: String,
    country: String,
    buzzCode: String
  },
  phoneNumber: String,
  area: String,
  twoDishVouchersUsed: Number,
  threeDishVouchersUsed: Number,
  confirmedAt: Date,
  deliveredAt: Date,
  refundedAt: Date,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Create the model
const DailyDeliveryOrder = mongoose.models.DailyDeliveryOrder || 
  mongoose.model<DailyOrderDocument>('DailyDeliveryOrder', DailyDeliveryOrderSchema);

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
  } catch (error) {
    console.error('Error fetching combo names:', error);
    
    return NextResponse.json(
      { success: false, error: 'Failed to fetch combo names' },
      { status: 500 }
    );
  }
}
