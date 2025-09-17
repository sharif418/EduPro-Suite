const http = require('http');

// Test data
const testCredentials = {
  valid: { email: 'admin@edupro.com', password: 'admin123' },
  invalid: { email: 'admin@edupro.com', password: 'wrongpassword' }
};

function makeRequest(data, description) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(data);
    
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = http.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsedData = JSON.parse(responseData);
          console.log(`\n${description}:`);
          console.log(`Status: ${res.statusCode}`);
          console.log(`Response:`, parsedData);
          
          if (res.headers['set-cookie']) {
            console.log(`Cookies:`, res.headers['set-cookie']);
          }
          
          resolve({ status: res.statusCode, data: parsedData });
        } catch (error) {
          console.log(`\n${description}:`);
          console.log(`Status: ${res.statusCode}`);
          console.log(`Raw Response:`, responseData);
          resolve({ status: res.statusCode, data: responseData });
        }
      });
    });

    req.on('error', (error) => {
      console.log(`\n${description} - ERROR:`, error.message);
      reject(error);
    });

    req.write(postData);
    req.end();
  });
}

async function testAuthentication() {
  console.log('🧪 Testing Authentication API...\n');
  
  try {
    // Test valid credentials
    await makeRequest(testCredentials.valid, '✅ Test 1: Valid Credentials');
    
    // Wait a bit between requests
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Test invalid credentials
    await makeRequest(testCredentials.invalid, '❌ Test 2: Invalid Credentials');
    
    console.log('\n🎉 Authentication API testing completed!');
    
  } catch (error) {
    console.error('\n💥 Test failed:', error.message);
    process.exit(1);
  }
}

// Run tests
testAuthentication();
