// Simple script to check if the server is running
const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/',
  method: 'GET'
};

const req = http.request(options, (res) => {
  console.log(`Server status: ${res.statusCode}`);
  console.log('Server is running!');
});

req.on('error', (e) => {
  console.error(`Server check failed: ${e.message}`);
});

req.end();
