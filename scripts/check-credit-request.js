require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');
const { Schema } = mongoose;

// Define the schema for CreditPurchaseRequest
const CreditPurchaseRequestSchema = new Schema({
  requestId: String,
  userId: Schema.Types.ObjectId,
  amount: Number,
  imageProof: String,
  status: String,
  requestedCredits: Number,
  approvedCredits: Number,
  notes: String,
  adminNotes: String,
  planDescription: String,
  createdAt: Date,
  updatedAt: Date,
  approvedAt: Date,
  declinedAt: Date,
  mealsPerWeek: Number,
  duration: Number
}, { timestamps: true });

// Create the model
const CreditPurchaseRequest = mongoose.model('CreditPurchaseRequest', CreditPurchaseRequestSchema);

async function main() {
  try {
    // Connect to MongoDB
    const MONGODB_URI = process.env.MONGODB_URI;
    
    if (!MONGODB_URI) {
      console.error('MONGODB_URI is not defined in .env.local');
      process.exit(1);
    }
    
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');
    
    // Find the specific request
    const requestId = 'CR-REQ-1011';
    console.log(`Looking for credit purchase request with ID: ${requestId}`);
    
    const request = await CreditPurchaseRequest.findOne({ requestId }).lean();
    
    if (!request) {
      console.log(`No request found with ID: ${requestId}`);
      process.exit(0);
    }
    
    // Format the output for better readability
    const formattedRequest = {
      ...request,
      createdAt: request.createdAt ? new Date(request.createdAt).toLocaleString() : null,
      updatedAt: request.updatedAt ? new Date(request.updatedAt).toLocaleString() : null,
      approvedAt: request.approvedAt ? new Date(request.approvedAt).toLocaleString() : null,
      declinedAt: request.declinedAt ? new Date(request.declinedAt).toLocaleString() : null,
    };
    
    console.log('\nCredit Purchase Request Details:');
    console.log(JSON.stringify(formattedRequest, null, 2));
    
    // If the request has a userId, try to get user details
    if (request.userId) {
      const User = mongoose.model('User', new Schema({
        name: String,
        email: String,
        userID: String
      }));
      
      const user = await User.findById(request.userId).lean();
      
      if (user) {
        console.log('\nUser Details:');
        console.log(JSON.stringify({
          _id: user._id,
          name: user.name,
          email: user.email,
          userID: user.userID
        }, null, 2));
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    // Close the MongoDB connection
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
  }
}

main();
