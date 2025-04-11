const https = require('https');
const http = require('http');

// Function to make HTTP request
function makeRequest(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const options = {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache'
      }
    };

    const req = client.get(url, options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve(jsonData);
        } catch (error) {
          console.error('Error parsing JSON:', error);
          reject(error);
        }
      });
    });
    
    req.on('error', (error) => {
      console.error('Request error:', error);
      reject(error);
    });
    
    req.end();
  });
}

async function verifyFixes() {
  try {
    console.log("--- STEP 1: TEST WEEK INFO API ---");
    // First get the current week/year
    const weekInfoUrl = `http://localhost:3001/api/weekly-meals/week-info`;
    console.log(`Fetching week info from: ${weekInfoUrl}`);
    
    try {
      const weekInfoResponse = await makeRequest(weekInfoUrl);
      console.log("Week Info API Response:", weekInfoResponse);
      
      if (weekInfoResponse.success && weekInfoResponse.data) {
        const { week, year } = weekInfoResponse.data;
        console.log(`Current week/year from API: ${week}/${year}`);
        
        // Now test the admin API with this week/year
        console.log("\n--- STEP 2: TEST ADMIN API WITH CORRECT WEEK/YEAR ---");
        const timestamp = new Date().getTime();
        const adminUrl = `http://localhost:3001/api/weekly-meals/admin?week=${week}&year=${year}&_t=${timestamp}`;
        
        console.log(`Fetching admin API with correct week/year: ${adminUrl}`);
        const adminResponse = await makeRequest(adminUrl);
        
        console.log("\nAdmin API Response Structure:", {
          success: adminResponse.success,
          dataKeys: adminResponse.data ? Object.keys(adminResponse.data) : null,
          mealsIncluded: adminResponse.data && adminResponse.data.meals ? 'yes' : 'no'
        });
        
        if (adminResponse.data && adminResponse.data.meals) {
          console.log("\nMeals included in response:");
          const meals = adminResponse.data.meals;
          Object.keys(meals).forEach(day => {
            console.log(`  - ${day}: active=${meals[day].active}`);
          });
        } else if (adminResponse.data) {
          console.log("\nMeals included in response (old format):");
          Object.keys(adminResponse.data).forEach(day => {
            if (typeof adminResponse.data[day] === 'object') {
              console.log(`  - ${day}: active=${adminResponse.data[day].active}`);
            }
          });
        }
        
        // Test with incorrect week/year to see if it still works
        console.log("\n--- STEP 3: TEST ADMIN API WITH INCORRECT WEEK/YEAR ---");
        const incorrectWeek = week + 1;
        const incorrectAdminUrl = `http://localhost:3001/api/weekly-meals/admin?week=${incorrectWeek}&year=${year}&_t=${timestamp}`;
        
        console.log(`Fetching admin API with incorrect week: ${incorrectAdminUrl}`);
        const incorrectAdminResponse = await makeRequest(incorrectAdminUrl);
        
        console.log("\nAdmin API Response with incorrect week:", {
          success: incorrectAdminResponse.success,
          dataKeys: incorrectAdminResponse.data ? Object.keys(incorrectAdminResponse.data) : null,
          week: incorrectAdminResponse.data?.week,
          year: incorrectAdminResponse.data?.year,
          mealsIncluded: incorrectAdminResponse.data && incorrectAdminResponse.data.meals ? 'yes' : 'no'
        });
        
        if (incorrectAdminResponse.data && incorrectAdminResponse.data.meals) {
          console.log("\nMeals included in response:");
          const meals = incorrectAdminResponse.data.meals;
          Object.keys(meals).forEach(day => {
            console.log(`  - ${day}: active=${meals[day].active}`);
          });
        }
      }
    } catch (error) {
      console.error("Error testing week info API:", error);
    }
    
  } catch (error) {
    console.error('Error verifying fixes:', error);
  }
}

// Run the function
verifyFixes(); 