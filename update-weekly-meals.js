// Script to update meal descriptions and dates in the database
const { MongoClient } = require('mongodb');

// MongoDB connection string - using the actual connection string from other scripts
const uri = "mongodb+srv://kamtocheung1104:N7H0LQ9L2bq5qQbo@kapiofood.otsn8px.mongodb.net/kapioo?retryWrites=true&w=majority&appName=kapiofood";

// Weekly meal data with just descriptions and dates
const weeklyMeals = [
  {
    day: "monday",
    date: "June 16",
    description: "番茄炖虾滑魔芋丝 (128 kcal). 手撕鸡 (175 kcal). 孜然烤菜花 (95 kcal). 补血紫米饭 (117 kcal)"
  },
  {
    day: "tuesday",
    date: "June 17",
    description: "意式肉酱 (180 kcal). 三彩豆炒虾仁 (125 kcal). 香烤芦笋 (78 kcal). 意大利面 (155 kcal)"
  },
  {
    day: "wednesday",
    date: "June 18",
    description: "彩椒香菇鸡煲 (168 kcal). 韩式什锦粉丝 (148 kcal). 酸辣娃娃菜 (87 kcal). 补血紫米饭 + 玉米粒 (137 kcal)"
  },
  {
    day: "thursday",
    date: "June 19",
    description: "番茄鲜虾咖喱 (178 kcal). 蘑菇炒蛋 (105 kcal). 蒜蓉奶白菜 (85 kcal). 补血紫米饭 + 烤红薯 (137 kcal)"
  },
  {
    day: "friday",
    date: "June 20",
    description: "风味烤鱼锅（辣） (215 kcal). 虾皮冬瓜 (95 kcal). 西兰花炒蘑菇 (102 kcal). 补血紫米饭 (117 kcal)"
  },
  {
    day: "saturday",
    date: "June 21",
    description: "OFF"
  },
  {
    day: "sunday",
    date: "June 22",
    description: "番茄牛肉锅 (172 kcal). 烤鸡腿肉 (152 kcal). 意式烤时令时蔬 (105 kcal). 补血紫米饭 + 烤南瓜 (128 kcal)"
  }
];

async function updateMealDescriptionsAndDates() {
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const database = client.db();
    const mealsCollection = database.collection('meals');
    
    // Update each meal description and date in the database
    for (const mealData of weeklyMeals) {
      console.log(`Processing ${mealData.day} - updating description and date`);
      
      // Update the meal with the new description and date
      const result = await mealsCollection.updateOne(
        { day: mealData.day },
        { 
          $set: {
            description: mealData.description,
            date: mealData.date,
            updatedAt: new Date()
          } 
        }
      );
      
      if (result.matchedCount === 0) {
        console.log(`No meal found for ${mealData.day}. Skipping.`);
      } else if (result.modifiedCount === 0) {
        console.log(`No changes needed for ${mealData.day}.`);
      } else {
        console.log(`Updated ${mealData.day} successfully.`);
      }
    }
    
    console.log('Meal descriptions and dates updated successfully');
    
  } catch (error) {
    console.error('Error updating meal descriptions and dates:', error);
  } finally {
    await client.close();
    console.log('MongoDB connection closed');
  }
}

// Run the update function
updateMealDescriptionsAndDates(); 