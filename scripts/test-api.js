require('dotenv').config({ path: '.env.local' });
const http = require('http');

async function testCreditRequestAPI() {
  console.log('Testing credit request API...');
  
  try {
    // Test data
    const testData = {
      userId: '65e32a9d0a6d9b0f1a0f0b1a', // Replace with a valid user ID from your database
      amount: 100,
      imageProof: 'https://example.com/test-image.jpg',
      notes: 'Test request'
    };
    
    console.log('Request payload:', JSON.stringify(testData, null, 2));
    
    // Make the request
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/credits/request',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(JSON.stringify(testData))
      }
    };
    
    const req = http.request(options, (res) => {
      console.log('Response status:', res.statusCode);
      
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const responseJson = JSON.parse(data);
          console.log('Response JSON:', JSON.stringify(responseJson, null, 2));
        } catch (e) {
          console.log('Response text:', data);
        }
      });
    });
    
    req.on('error', (e) => {
      console.error('Request error:', e);
    });
    
    req.write(JSON.stringify(testData));
    req.end();
    
  } catch (error) {
    console.error('Error testing API:', error);
  }
}

testCreditRequestAPI();