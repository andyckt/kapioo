import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import mongoose from 'mongoose';

// Define the interface for the WeeklyOrder document
interface WeeklyOrderDocument extends mongoose.Document {
  userId: mongoose.Types.ObjectId;
  orderId: string;
  items: Array<{
    dayId: string;
    optionId: string;
    optionName: string;
    quantity: number;
    date: string;
  }>;
  status: 'pending' | 'confirmed' | 'delivery' | 'delivered' | 'cancelled' | 'refunded';
  creditCost: number;
  mealPlanType?: '6aweek' | '8aweek' | '10aweek' | '12aweek';
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
  confirmedAt?: Date;
  deliveredAt?: Date;
  refundedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Create schema for weekly orders
const WeeklyOrderSchema = new mongoose.Schema({
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
    dayId: String,
    optionId: String,
    optionName: String,
    quantity: Number,
    date: String
  }],
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'delivery', 'delivered', 'cancelled', 'refunded'],
    default: 'pending'
  },
  creditCost: {
    type: Number,
    default: 0
  },
  mealPlanType: {
    type: String,
    enum: ['6aweek', '8aweek', '10aweek', '12aweek']
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
const WeeklyOrder = mongoose.models.WeeklyOrder || 
  mongoose.model<WeeklyOrderDocument>('WeeklyOrder', WeeklyOrderSchema);

// GET handler - get all unique areas from orders
export async function GET(request: Request) {
  try {
    // In a production environment, you should implement proper authentication
    // to ensure only admins can access this endpoint
    
    await connectToDatabase();
    
    // Aggregate to get unique areas
    const uniqueAreas = await WeeklyOrder.aggregate([
      // Filter out null or empty areas
      { $match: { area: { $exists: true, $ne: null, $ne: '' } } },
      // Group by area
      { $group: { _id: '$area' } },
      // Sort alphabetically
      { $sort: { _id: 1 } },
      // Project to get just the area name
      { $project: { _id: 0, area: '$_id' } }
    ]);
    
    // Extract area names from the result
    const areas = uniqueAreas.map(item => item.area);
    
    return NextResponse.json({
      success: true,
      areas
    });
  } catch (error) {
    console.error('Error fetching unique areas:', error);
    
    return NextResponse.json(
      { success: false, error: 'Failed to fetch areas' },
      { status: 500 }
    );
  }
}
