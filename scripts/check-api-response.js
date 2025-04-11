const https = require('https');
const http = require('http');

// Function to make HTTP request
function makeRequest(url, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const options = {
      method,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache'
      }
    };
    
    if (data) {
      options.headers['Content-Type'] = 'application/json';
    }

    const req = client.request(url, options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(responseData);
          resolve({ statusCode: res.statusCode, data: jsonData });
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
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

async function checkStatus(day) {
  try {
    const statusUrl = `http://localhost:3001/api/weekly-meals/status`;
    console.log(`\nChecking status for ${day}...`);
    
    const checkResponse = await makeRequest(statusUrl, 'PATCH', { day, active: true });
    console.log(`Status API Response for ${day}:`, checkResponse);
    
    return checkResponse.data;
  } catch (error) {
    console.error('Error checking status:', error);
    return null;
  }
}

async function checkApiResponses() {
  try {
    // 1. Check the admin API response
    // Add timestamp to prevent caching
    const timestamp = new Date().getTime();
    const adminUrl = `http://localhost:3001/api/weekly-meals/admin?_t=${timestamp}`;
    
    console.log(`\n--- CHECKING ADMIN API ---`);
    console.log(`Fetching admin API from: ${adminUrl}`);
    const adminResponse = await makeRequest(adminUrl);
    
    console.log('Admin API Response:');
    
    if (adminResponse.data.success) {
      console.log('Days and active status:');
      for (const day in adminResponse.data.data) {
        console.log(`  - ${day}: active=${adminResponse.data.data[day].active}`);
      }
    } else {
      console.log('API request failed:', adminResponse);
    }
    
    // 2. Check the status API for Monday
    const statusResponse = await checkStatus('monday');
    
    // 3. Check admin API again after updating status
    const timestamp2 = new Date().getTime();
    const adminUrl2 = `http://localhost:3001/api/weekly-meals/admin?_t=${timestamp2}`;
    
    console.log(`\n--- CHECKING ADMIN API AGAIN ---`);
    console.log(`Fetching admin API again from: ${adminUrl2}`);
    const adminResponse2 = await makeRequest(adminUrl2);
    
    console.log('Admin API Response (after update):');
    
    if (adminResponse2.data.success) {
      console.log('Days and active status:');
      for (const day in adminResponse2.data.data) {
        console.log(`  - ${day}: active=${adminResponse2.data.data[day].active}`);
      }
    } else {
      console.log('API request failed:', adminResponse2);
    }
    
  } catch (error) {
    console.error('Error checking API responses:', error);
  }
}

// Run the function
checkApiResponses(); 