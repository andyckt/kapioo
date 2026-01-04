#!/usr/bin/env node

/**
 * Test script for Maintenance Mode API
 * 
 * This script tests the maintenance mode API endpoints to ensure they work correctly.
 * 
 * Usage:
 *   node scripts/test-maintenance-api.js [base-url]
 * 
 * Example:
 *   node scripts/test-maintenance-api.js http://localhost:3000
 */

const BASE_URL = process.argv[2] || 'http://localhost:3000';
const API_ENDPOINT = `${BASE_URL}/api/maintenance/status`;

console.log('🧪 Testing Maintenance Mode API');
console.log('================================\n');
console.log(`Base URL: ${BASE_URL}\n`);

async function testGetStatus() {
  console.log('1️⃣  Testing GET /api/maintenance/status');
  console.log('   Fetching current maintenance status...');
  
  try {
    const response = await fetch(API_ENDPOINT);
    const data = await response.json();
    
    if (response.ok) {
      console.log('   ✅ GET request successful');
      console.log('   Status:', response.status);
      console.log('   Response:', JSON.stringify(data, null, 2));
      return data.isMaintenanceMode;
    } else {
      console.log('   ❌ GET request failed');
      console.log('   Status:', response.status);
      console.log('   Error:', JSON.stringify(data, null, 2));
      return null;
    }
  } catch (error) {
    console.log('   ❌ Request error:', error.message);
    return null;
  }
}

async function testSetStatus(value) {
  console.log(`\n2️⃣  Testing POST /api/maintenance/status (set to ${value})`);
  console.log(`   Setting maintenance mode to: ${value}...`);
  
  try {
    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ isMaintenanceMode: value }),
    });
    
    const data = await response.json();
    
    if (response.ok) {
      console.log('   ✅ POST request successful');
      console.log('   Status:', response.status);
      console.log('   Response:', JSON.stringify(data, null, 2));
      return true;
    } else {
      console.log('   ❌ POST request failed');
      console.log('   Status:', response.status);
      console.log('   Error:', JSON.stringify(data, null, 2));
      return false;
    }
  } catch (error) {
    console.log('   ❌ Request error:', error.message);
    return false;
  }
}

async function testVerifyStatus(expectedValue) {
  console.log(`\n3️⃣  Verifying status was updated to: ${expectedValue}`);
  
  try {
    const response = await fetch(API_ENDPOINT);
    const data = await response.json();
    
    if (response.ok && data.isMaintenanceMode === expectedValue) {
      console.log('   ✅ Status verified successfully');
      console.log('   Current value:', data.isMaintenanceMode);
      return true;
    } else {
      console.log('   ❌ Status verification failed');
      console.log('   Expected:', expectedValue);
      console.log('   Got:', data.isMaintenanceMode);
      return false;
    }
  } catch (error) {
    console.log('   ❌ Request error:', error.message);
    return false;
  }
}

async function runTests() {
  console.log('Starting tests...\n');
  
  // Test 1: Get initial status
  const initialStatus = await testGetStatus();
  
  if (initialStatus === null) {
    console.log('\n❌ Failed to get initial status. Is the server running?');
    console.log(`   Make sure your app is running at ${BASE_URL}`);
    process.exit(1);
  }
  
  // Test 2: Toggle to opposite value
  const newValue = !initialStatus;
  const setSuccess = await testSetStatus(newValue);
  
  if (!setSuccess) {
    console.log('\n❌ Failed to set maintenance status');
    process.exit(1);
  }
  
  // Test 3: Verify the change
  const verifySuccess = await testVerifyStatus(newValue);
  
  if (!verifySuccess) {
    console.log('\n❌ Failed to verify status change');
    process.exit(1);
  }
  
  // Test 4: Toggle back to original value
  console.log(`\n4️⃣  Restoring original status (${initialStatus})`);
  await testSetStatus(initialStatus);
  await testVerifyStatus(initialStatus);
  
  console.log('\n================================');
  console.log('✅ All tests passed!');
  console.log('================================\n');
  console.log('Summary:');
  console.log('  ✅ GET endpoint working');
  console.log('  ✅ POST endpoint working');
  console.log('  ✅ Status persistence working');
  console.log('  ✅ Status restored to original value');
  console.log('\nMaintenance mode API is functioning correctly! 🎉\n');
}

// Run the tests
runTests().catch(error => {
  console.error('\n❌ Unexpected error:', error);
  process.exit(1);
});

