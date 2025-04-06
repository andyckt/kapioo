// Simple test script to test the user registration API

const testUserRegistration = async () => {
  try {
    console.log('Testing user registration API...');
    
    const testUser = {
      name: 'Test User',
      email: 'testuser' + Date.now() + '@example.com', // Ensure unique email
      password: 'Password123'
    };
    
    console.log('Using test data:', { ...testUser, password: '********' });
    
    const response = await fetch('http://localhost:3000/api/users', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testUser),
    });
    
    const result = await response.json();
    
    console.log('Response status:', response.status);
    console.log('Response data:', result);
    
    if (result.success) {
      console.log('✅ Registration successful!');
      console.log('User ID:', result.data._id);
      console.log('Email:', result.data.email);
    } else {
      console.error('❌ Registration failed:', result.error);
    }
  } catch (error) {
    console.error('Error during registration test:', error);
  }
};

// Run the test
testUserRegistration(); 