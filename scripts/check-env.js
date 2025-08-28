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
console.log('AWS_ACCESS_KEY_ID:', process.env.AWS_ACCESS_KEY_ID ? 'Set ✅' : 'Not set ❌');
console.log('AWS_SECRET_ACCESS_KEY:', process.env.AWS_SECRET_ACCESS_KEY ? 'Set ✅' : 'Not set ❌');
console.log('AWS_REGION:', process.env.AWS_REGION ? `Set (${process.env.AWS_REGION}) ✅` : 'Not set ❌');
console.log('AWS_BUCKET_NAME:', process.env.AWS_BUCKET_NAME ? `Set (${process.env.AWS_BUCKET_NAME}) ✅` : 'Not set ❌');
console.log('AWS_S3_BUCKET:', process.env.AWS_S3_BUCKET ? `Set (${process.env.AWS_S3_BUCKET}) ✅` : 'Not set ❌');

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
        line.startsWith('AWS_BUCKET_NAME=') ||
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
console.log('AWS_ACCESS_KEY_ID=AKIARWPFID2IE4FWA74X');
console.log('AWS_SECRET_ACCESS_KEY=[your secret key]');
console.log('AWS_REGION=ap-southeast-2');
console.log('AWS_S3_BUCKET=meal-subscription-andy-photos');
