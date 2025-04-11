// This script simulates the client-side processing of meal data
// to help debug why the active status might be incorrect

// Sample data from API (simulating what we'd get from the admin API)
const sampleApiResponse = {
  success: true,
  data: {
    monday: {
      _id: "67ef5777a1d4adfbac35cb1c",
      name: "1234",
      image: "https://meal-subscription-andy-photos.s3.ap-southeast-2.amazonaws.com/meals/1744378227706-testimage.jpg",
      description: "蕃茄牛腩. 冬瓜粉丝炖丸子. 酸辣土豆丝 (微辣). 杂粮饭.",
      active: true,  // This should be true based on our database
      day: "monday"
    },
    tuesday: {
      _id: "67ef5777a1d4adfbac35cb1d",
      name: "123424242",
      image: "https://meal-subscription-andy-photos.s3.ap-southeast-2.amazonaws.com/meals/1743768740856-charlesdeluvio-wrfO9SWykdE-unsplash.jpg",
      description: "蟹⻩豆腐煲. 干煸肉沫四季豆. 粉蒸 排⻣. 杂粮饭",
      active: true,  // This should be true based on our database
      day: "tuesday"
    },
    wednesday: {
      _id: "67ef5777a1d4adfbac35cb1e",
      name: "43434141",
      image: "https://meal-subscription-andy-photos.s3.ap-southeast-2.amazonaws.com/meals/1743768775846-eiliv-aceron-w0JzqJZYX_E-unsplash.jpg",
      description: "酸菜炖排⻣. 口水鸡(微辣). 清炒小白菜. 杂粮饭",
      active: false,
      day: "wednesday"
    }
    // other days omitted for brevity
  }
};

// Simulate client-side processing in the admin page component
function simulateClientProcessing(apiResponse) {
  console.log("--- SIMULATING CLIENT-SIDE PROCESSING ---");
  
  if (!apiResponse.success || !apiResponse.data) {
    console.log("API response is not successful or missing data");
    return;
  }
  
  // Extract meals data
  const mealsData = apiResponse.data;
  
  // Client-side initialization code (similar to what's in the admin page)
  const initialEditState = {};
  const initialMealIdState = {};
  const initialActiveDays = {};
  
  // This is the critical part that might be causing issues
  Object.entries(mealsData).forEach(([day, meal]) => {
    initialEditState[day] = meal.name;
    initialMealIdState[day] = meal._id || '';
    
    // This is how we're currently setting the active days state
    initialActiveDays[day] = meal.active === true; // Strict equality check
    
    // Log for debugging
    console.log(`Processing ${day}: API active=${meal.active}, Client state active=${initialActiveDays[day]}`);
    console.log(`  - Type of meal.active: ${typeof meal.active}`);
    console.log(`  - Value === true? ${meal.active === true}`);
    console.log(`  - Value == true? ${meal.active == true}`);
  });
  
  console.log("\n--- SUMMARY OF CLIENT STATE ---");
  console.log("Initial active days state:");
  Object.entries(initialActiveDays).forEach(([day, isActive]) => {
    console.log(`  - ${day}: active=${isActive}`);
  });
  
  return {
    editedMeals: initialEditState,
    selectedMealId: initialMealIdState,
    activeDays: initialActiveDays
  };
}

// Run the simulation
const clientState = simulateClientProcessing(sampleApiResponse);
console.log("\nFinal client state:", clientState);

// Debugging helpers: serialize and deserialize to simulate JSON transit
console.log("\n--- TESTING JSON SERIALIZATION/DESERIALIZATION ---");
const serialized = JSON.stringify(sampleApiResponse);
console.log("Serialized length:", serialized.length);

const deserialized = JSON.parse(serialized);
console.log("After deserialization, active status for monday:", deserialized.data.monday.active);
console.log("Type of active after deserialization:", typeof deserialized.data.monday.active);

// Check if there's any type coercion happening
console.log("\n--- TESTING TYPE COERCION ---");
const booleanTests = [
  { value: true, desc: "true" },
  { value: false, desc: "false" },
  { value: "true", desc: '"true" string' },
  { value: "false", desc: '"false" string' },
  { value: 1, desc: "1" },
  { value: 0, desc: "0" },
  { value: null, desc: "null" },
  { value: undefined, desc: "undefined" }
];

booleanTests.forEach(test => {
  console.log(`${test.desc}:`);
  console.log(`  - Strict equality (=== true): ${test.value === true}`);
  console.log(`  - Loose equality (== true): ${test.value == true}`);
  console.log(`  - Negated strict inequality (!== false): ${test.value !== false}`);
  console.log(`  - Boolean coercion (!!value): ${!!test.value}`);
}); 