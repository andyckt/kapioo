// Script to update meal tags in the database
const { MongoClient } = require('mongodb');

// MongoDB connection string - using the actual connection string from other scripts
const uri = "mongodb+srv://kamtocheung1104:N7H0LQ9L2bq5qQbo@kapiofood.otsn8px.mongodb.net/kapioo?retryWrites=true&w=majority&appName=kapiofood";

// Weekly meal data with tags from the weekly-menu-section.tsx file
const weeklyMeals = [
  {
    day: "monday",
    tags: ["清爽营养", "低热量高饱腹"]
  },
  {
    day: "tuesday",
    tags: ["护心养颜", "排毒清肠"]
  },
  {
    day: "wednesday",
    tags: ["补气补血", "亚洲风味"]
  },
  {
    day: "thursday",
    tags: ["优质蛋白组合", "膳食纤维"]
  },
  {
    day: "friday",
    tags: ["天然钙质", "利水消肿"]
  },
  {
    day: "saturday",
    tags: ["休息日"]
  },
  {
    day: "sunday",
    tags: ["低脂高蛋白", "抗氧化"]
  }
];

async function updateMealTags() {
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const database = client.db();
    const mealsCollection = database.collection('meals');
    
    // Update tags for each meal in the database
    for (const mealData of weeklyMeals) {
      console.log(`Processing ${mealData.day} - updating tags`);
      
      // Update the meal with the new tags
      const result = await mealsCollection.updateOne(
        { day: mealData.day },
        { 
          $set: {
            tags: mealData.tags,
            updatedAt: new Date()
          } 
        }
      );
      
      if (result.matchedCount === 0) {
        console.log(`No meal found for ${mealData.day}. Skipping.`);
      } else if (result.modifiedCount === 0) {
        console.log(`No changes needed for ${mealData.day}.`);
      } else {
        console.log(`Updated tags for ${mealData.day} successfully.`);
      }
    }
    
    console.log('Meal tags updated successfully');
    
  } catch (error) {
    console.error('Error updating meal tags:', error);
  } finally {
    await client.close();
    console.log('MongoDB connection closed');
  }
}

// Run the update function
updateMealTags(); 