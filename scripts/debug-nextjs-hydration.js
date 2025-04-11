// This script simulates potential NextJS hydration issues with boolean values

// Simulate what happens when NextJS serializes an API response
function simulateNextJSHydration() {
  console.log("--- SIMULATING NEXTJS SERIALIZATION/HYDRATION ---");
  
  // Create an object with meal data including active status
  const originalData = {
    monday: {
      _id: "12345",
      name: "Test Meal",
      active: true, // Boolean true
      description: "Test description"
    },
    tuesday: {
      _id: "67890",
      name: "Another Meal",
      active: false, // Boolean false
      description: "Another description"
    }
  };
  
  console.log("Original data types:");
  Object.entries(originalData).forEach(([day, meal]) => {
    console.log(`  - ${day}: active is ${meal.active} (${typeof meal.active})`);
  });
  
  // NextJS will convert the response to JSON for transfer
  const serialized = JSON.stringify({ success: true, data: originalData });
  console.log("\nJSON serialized length:", serialized.length);
  
  // When received by the client, it gets parsed back to JS objects
  const deserialized = JSON.parse(serialized);
  
  console.log("\nDeserialized data types:");
  Object.entries(deserialized.data).forEach(([day, meal]) => {
    console.log(`  - ${day}: active is ${meal.active} (${typeof meal.active})`);
  });
  
  return deserialized;
}

// Simulate how NextResponse in Next.js API routes works
function simulateNextResponse() {
  console.log("\n--- SIMULATING NEXTRESPONSE IN API ROUTES ---");
  
  // Create a basic meal object with boolean active property
  const mealData = {
    monday: {
      active: true,
      name: "Monday Meal"
    }
  };
  
  // Simulate how NextResponse might process the data
  // In a real API route, we'd do:
  // return new NextResponse(JSON.stringify({ success: true, data: mealData }), {...})
  
  // The API handler should make sure boolean values are properly serialized
  const jsonString = JSON.stringify({ success: true, data: mealData });
  console.log("API response JSON:", jsonString);
  console.log("Type of active in JSON string:", typeof JSON.parse(jsonString).data.monday.active);
  
  return jsonString;
}

// Simulate MongoDB conversion to JavaScript
function simulateMongoDBConversion() {
  console.log("\n--- SIMULATING MONGODB TO JAVASCRIPT CONVERSION ---");
  
  // MongoDB document with boolean active field
  const mongoDoc = {
    _id: "123456789",
    day: "monday",
    active: true, // Boolean in MongoDB
    week: 16,
    year: 2025
  };
  
  console.log("MongoDB document active field:", mongoDoc.active, `(${typeof mongoDoc.active})`);
  
  // When converting to plain object in the API route
  const plainObject = { ...mongoDoc };
  console.log("Plain object active field:", plainObject.active, `(${typeof plainObject.active})`);
  
  // When JSON serialized for API response
  const jsonString = JSON.stringify(plainObject);
  const parsedBack = JSON.parse(jsonString);
  
  console.log("After JSON serialization and parsing:", parsedBack.active, `(${typeof parsedBack.active})`);
  
  return parsedBack;
}

// Run all simulations
const hydrationResult = simulateNextJSHydration();
const nextResponseResult = simulateNextResponse();
const mongoDBResult = simulateMongoDBConversion();

// Final check comparing initialization methods
console.log("\n--- COMPARING CLIENT INITIALIZATION METHODS ---");

// Method 1: as used in most of the fixes
const method1 = hydrationResult.data.monday.active === true;
console.log("Method 1 (strict equality): active === true =", method1);

// Method 2: as possibly used originally
const method2 = hydrationResult.data.monday.active !== false;
console.log("Method 2 (negated inequality): active !== false =", method2);

// Method 3: boolean coercion
const method3 = !!hydrationResult.data.monday.active;
console.log("Method 3 (boolean coercion): !!active =", method3); 