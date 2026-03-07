// Check environment variables
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

// Load environment variables from .env files
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

console.log('Checking environment variables...');

// Check AWS S3 configuration
console.log('\nAWS S3 Configuration:');
const requiredAwsVars = ['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'AWS_REGION'];
const configuredAwsVars = requiredAwsVars.filter((name) => Boolean(process.env[name]));
console.log(`Configured required AWS variables: ${configuredAwsVars.length}/${requiredAwsVars.length}`);

// Check if .env files exist
console.log('\nEnvironment Files:');
const envFiles = ['.env', '.env.local', '.env.development', '.env.production'];
envFiles.forEach(file => {
  const exists = fs.existsSync(path.join(process.cwd(), file));
  console.log(`${file}: ${exists ? 'Exists ✅' : 'Does not exist ❌'}`);
  
  if (exists) {
    try {
      const content = fs.readFileSync(path.join(process.cwd(), file), 'utf8');
      const lines = content.split('\n').filter(line => line.trim() && !line.trim().startsWith('#'));
      console.log(`  - Contains ${lines.length} non-empty, non-comment lines`);
      
      // Check for AWS variables without showing values
      const awsVars = lines.filter(line => 
        line.startsWith('AWS_ACCESS_KEY_ID=') || 
        line.startsWith('AWS_SECRET_ACCESS_KEY=') || 
        line.startsWith('AWS_REGION=') || 
        line.startsWith('AWS_S3_BUCKET=')
      );
      
      if (awsVars.length > 0) {
        console.log(`  - Contains AWS configuration variables: ${awsVars.length} found`);
        awsVars.forEach(line => {
          const [key] = line.split('=');
          console.log(`    - ${key}: Present`);
        });
      } else {
        console.log('  - No AWS configuration variables found');
      }
    } catch (error) {
      console.error(`  - Error reading file: ${error.message}`);
    }
  }
});

console.log('\nRecommendation:');
console.log('Make sure your .env.local file contains the following variables:');
console.log('AWS_ACCESS_KEY_ID=YOUR_AWS_ACCESS_KEY_ID');
console.log('AWS_SECRET_ACCESS_KEY=YOUR_AWS_SECRET_ACCESS_KEY');
console.log('AWS_REGION=YOUR_AWS_REGION');
console.log('AWS_S3_BUCKET=YOUR_AWS_S3_BUCKET');
