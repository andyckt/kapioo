// Migration script for weekly subscription data
const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config();

// MongoDB connection string from environment variables
const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error('ERROR: MONGODB_URI environment variable not set');
  process.exit(1);
}

// Database and collection names
const DB_NAME = process.env.MONGODB_DB || 'kapioo';
const MEAL_OPTIONS_COLLECTION = 'weeklymealOptions';
const DELIVERY_DAYS_COLLECTION = 'weeklydeliverydays';

// Initial meal options data
const mealOptions = [
  // Current Week Sunday Options
  {
    _id: new ObjectId(),
    name: '鲜虾鸡翅焖煲 + 紫米饭 + 蘑菇青菜',
    tags: ['High Protein', 'Low Carb'],
    active: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    _id: new ObjectId(),
    name: '罗勒青酱意面 + 意式香草烤鸡',
    tags: ['Italian', 'Herb'],
    active: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    _id: new ObjectId(),
    name: '桂侯萝卜慢炖牛腋 + 紫米饭 + 蔑油菜心',
    tags: ['Slow Cooked', 'Beef'],
    active: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  
  // Current Week Tuesday Options
  {
    _id: new ObjectId(),
    name: '豌豆/爆炒牛肉粒 + 玉米饭 + 时蔬',
    tags: ['Beef', 'Stir Fry'],
    active: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    _id: new ObjectId(),
    name: '西班牙浓郁海鲜烩饭',
    tags: ['Seafood', 'Spanish'],
    active: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    _id: new ObjectId(),
    name: '泰式柠檬干煎鸡 + 清炒黄瓜条',
    tags: ['Thai', 'Chicken'],
    active: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  
  // Next Week Sunday Options
  {
    _id: new ObjectId(),
    name: '香煎三文鱼 + 藜麦饭 + 芦笋',
    tags: ['Seafood', 'High Protein'],
    active: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    _id: new ObjectId(),
    name: '日式照烧鸡腿 + 糙米饭 + 炒菠菜',
    tags: ['Japanese', 'Chicken'],
    active: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    _id: new ObjectId(),
    name: '意式肉酱面 + 帕玛森奶酪 + 烤蔬菜',
    tags: ['Italian', 'Pasta'],
    active: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  
  // Next Week Tuesday Options
  {
    _id: new ObjectId(),
    name: '泰式青咖喱鸡 + 香米饭 + 炒青菜',
    tags: ['Thai', 'Spicy'],
    active: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    _id: new ObjectId(),
    name: '红烧牛肉面 + 清炒西兰花',
    tags: ['Beef', 'Noodles'],
    active: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    _id: new ObjectId(),
    name: '墨西哥牛肉卷 + 鳄梨酱 + 炸玉米片',
    tags: ['Mexican', 'Beef'],
    active: true,
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

// Function to create delivery days with meal options
function createDeliveryDays(mealOptions) {
  // Group meal options by 3 for each delivery day
  const currentSundayOptions = mealOptions.slice(0, 3).map(option => option._id);
  const currentTuesdayOptions = mealOptions.slice(3, 6).map(option => option._id);
  const nextSundayOptions = mealOptions.slice(6, 9).map(option => option._id);
  const nextTuesdayOptions = mealOptions.slice(9, 12).map(option => option._id);
  
  return [
    {
      day: 'sunday',
      name: 'Sunday Delivery',
      date: 'Sep 07',
      active: true,
      options: currentSundayOptions,
      weekOffset: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      day: 'tuesday',
      name: 'Tuesday Delivery',
      date: 'Sep 09',
      active: true,
      options: currentTuesdayOptions,
      weekOffset: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      day: 'sunday',
      name: 'Sunday Delivery',
      date: 'Sep 14',
      active: true,
      options: nextSundayOptions,
      weekOffset: 1,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      day: 'tuesday',
      name: 'Tuesday Delivery',
      date: 'Sep 16',
      active: true,
      options: nextTuesdayOptions,
      weekOffset: 1,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];
}

// Main migration function
async function migrateWeeklySubscription() {
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db(DB_NAME);
    const mealOptionsCollection = db.collection(MEAL_OPTIONS_COLLECTION);
    const deliveryDaysCollection = db.collection(DELIVERY_DAYS_COLLECTION);
    
    // Clear existing data
    console.log('Clearing existing data...');
    await mealOptionsCollection.deleteMany({});
    await deliveryDaysCollection.deleteMany({});
    
    // Insert meal options
    console.log('Inserting meal options...');
    const mealOptionsResult = await mealOptionsCollection.insertMany(mealOptions);
    console.log(`${mealOptionsResult.insertedCount} meal options inserted`);
    
    // Create and insert delivery days
    const deliveryDays = createDeliveryDays(mealOptions);
    console.log('Inserting delivery days...');
    const deliveryDaysResult = await deliveryDaysCollection.insertMany(deliveryDays);
    console.log(`${deliveryDaysResult.insertedCount} delivery days inserted`);
    
    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Error during migration:', error);
  } finally {
    await client.close();
    console.log('MongoDB connection closed');
  }
}

// Run the migration
migrateWeeklySubscription().catch(console.error);
