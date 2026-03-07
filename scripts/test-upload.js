require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const path = require('path');
const http = require('http');

// Log AWS environment variables
console.log('AWS Environment Variables:');
const configuredAwsVars = [
  process.env.AWS_ACCESS_KEY_ID,
  process.env.AWS_SECRET_ACCESS_KEY,
  process.env.AWS_REGION,
  process.env.AWS_S3_BUCKET,
].filter(Boolean).length;
console.log(`Configured AWS upload variables: ${configuredAwsVars}/4`);

// Function to test file upload
async function testFileUpload() {
  try {
    // Check if we have a test image
    const testImagePath = path.join(__dirname, '..', 'public', 'placeholder.png');
    if (!fs.existsSync(testImagePath)) {
      console.error('Test image not found:', testImagePath);
      return;
    }

    console.log('Test image found:', testImagePath);
    
    // Create a simple form data manually
    const boundary = '----WebKitFormBoundary' + Math.random().toString(16).substr(2);
    const userId = 'test-user-123';
    
    // Read the file
    const fileBuffer = fs.readFileSync(testImagePath);
    const fileType = 'image/png';
    const fileName = 'placeholder.png';
    
    // Create form data parts
    const formDataParts = [
      `--${boundary}\r\n`,
      `Content-Disposition: form-data; name="userId"\r\n\r\n`,
      `${userId}\r\n`,
      `--${boundary}\r\n`,
      `Content-Disposition: form-data; name="file"; filename="${fileName}"\r\n`,
      `Content-Type: ${fileType}\r\n\r\n`
    ];
    
    // Calculate content length
    let contentLength = 0;
    formDataParts.forEach(part => {
      contentLength += Buffer.byteLength(part);
    });
    contentLength += fileBuffer.length;
    contentLength += Buffer.byteLength(`\r\n--${boundary}--\r\n`);
    
    // Create request options
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/upload/proof',
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': contentLength
      }
    };
    
    console.log('Sending request to:', options.hostname + ':' + options.port + options.path);
    
    // Send request
    const req = http.request(options, (res) => {
      console.log('Response status:', res.statusCode);
      
      let responseData = '';
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsedData = JSON.parse(responseData);
          console.log('Response data:', JSON.stringify(parsedData, null, 2));
        } catch (e) {
          console.log('Response text:', responseData);
        }
      });
    });
    
    req.on('error', (e) => {
      console.error('Request error:', e);
    });
    
    // Write form data parts
    formDataParts.forEach(part => {
      req.write(part);
    });
    
    // Write file buffer
    req.write(fileBuffer);
    
    // End form data
    req.write(`\r\n--${boundary}--\r\n`);
    req.end();
    
  } catch (error) {
    console.error('Error testing file upload:', error);
  }
}

// Run the test
testFileUpload();
