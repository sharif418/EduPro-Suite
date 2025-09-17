const https = require('https');
const http = require('http');

const BASE_URL = 'http://localhost:3001';

// Helper function to make HTTP requests
function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const protocol = options.protocol === 'https:' ? https : http;
    const req = protocol.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: body,
          cookies: res.headers['set-cookie'] || []
        });
      });
    });

    req.on('error', reject);
    
    if (data) {
      req.write(data);
    }
    
    req.end();
  });
}

// Helper function to extract cookies
function extractCookies(cookieHeaders) {
  const cookies = {};
  if (cookieHeaders) {
    cookieHeaders.forEach(cookie => {
      const [nameValue] = cookie.split(';');
      const [name, value] = nameValue.split('=');
      if (name && value) {
        cookies[name.trim()] = value.trim();
      }
    });
  }
  return cookies;
}

async function testAdminProtection() {
  console.log('🧪 Testing Admin Protection System\n');

  try {
    // Test 1: Access /admin without authentication
    console.log('Test 1: Accessing /admin without authentication...');
    const unauthResponse = await makeRequest({
      hostname: 'localhost',
      port: 3001,
      path: '/admin',
      method: 'GET'
    });
    
    if (unauthResponse.statusCode === 302 || unauthResponse.statusCode === 307) {
      const location = unauthResponse.headers.location;
      console.log('✅ PASS: Redirected to', location);
    } else {
      console.log('❌ FAIL: Expected redirect, got status', unauthResponse.statusCode);
    }

    // Test 2: Login as STUDENT and try to access /admin
    console.log('\nTest 2: Login as STUDENT and access /admin...');
    const studentLoginResponse = await makeRequest({
      hostname: 'localhost',
      port: 3001,
      path: '/api/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    }, JSON.stringify({
      email: 'student@edupro.com',
      password: 'student123'
    }));

    if (studentLoginResponse.statusCode === 200) {
      const studentCookies = extractCookies(studentLoginResponse.cookies);
      const authToken = studentCookies['auth-token'];
      
      if (authToken) {
        console.log('✅ Student login successful');
        
        // Try to access /admin with student token
        const studentAdminResponse = await makeRequest({
          hostname: 'localhost',
          port: 3001,
          path: '/admin',
          method: 'GET',
          headers: {
            'Cookie': `auth-token=${authToken}`
          }
        });

        if (studentAdminResponse.statusCode === 302 || studentAdminResponse.statusCode === 307) {
          const location = studentAdminResponse.headers.location;
          if (location && location.includes('/unauthorized')) {
            console.log('✅ PASS: Student redirected to /unauthorized');
          } else {
            console.log('❌ FAIL: Student redirected to', location, 'instead of /unauthorized');
          }
        } else {
          console.log('❌ FAIL: Student got status', studentAdminResponse.statusCode, 'instead of redirect');
        }
      } else {
        console.log('❌ FAIL: No auth token received from student login');
      }
    } else {
      console.log('❌ FAIL: Student login failed with status', studentLoginResponse.statusCode);
    }

    // Test 3: Login as SUPERADMIN and access /admin
    console.log('\nTest 3: Login as SUPERADMIN and access /admin...');
    const adminLoginResponse = await makeRequest({
      hostname: 'localhost',
      port: 3001,
      path: '/api/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    }, JSON.stringify({
      email: 'admin@edupro.com',
      password: 'admin123'
    }));

    if (adminLoginResponse.statusCode === 200) {
      const adminCookies = extractCookies(adminLoginResponse.cookies);
      const authToken = adminCookies['auth-token'];
      
      if (authToken) {
        console.log('✅ Admin login successful');
        
        // Try to access /admin with admin token
        const adminAdminResponse = await makeRequest({
          hostname: 'localhost',
          port: 3001,
          path: '/admin',
          method: 'GET',
          headers: {
            'Cookie': `auth-token=${authToken}`
          }
        });

        if (adminAdminResponse.statusCode === 200) {
          console.log('✅ PASS: Admin successfully accessed /admin');
          
          // Check if the response contains admin dashboard content
          if (adminAdminResponse.body.includes('Welcome to the Admin Dashboard')) {
            console.log('✅ PASS: Admin dashboard content loaded correctly');
          } else {
            console.log('⚠️  WARNING: Admin dashboard content may not be fully loaded');
          }
        } else {
          console.log('❌ FAIL: Admin got status', adminAdminResponse.statusCode, 'when accessing /admin');
        }
      } else {
        console.log('❌ FAIL: No auth token received from admin login');
      }
    } else {
      console.log('❌ FAIL: Admin login failed with status', adminLoginResponse.statusCode);
    }

    // Test 4: Test /unauthorized page accessibility
    console.log('\nTest 4: Testing /unauthorized page accessibility...');
    const unauthorizedResponse = await makeRequest({
      hostname: 'localhost',
      port: 3001,
      path: '/unauthorized',
      method: 'GET'
    });

    if (unauthorizedResponse.statusCode === 200) {
      console.log('✅ PASS: /unauthorized page is accessible');
      if (unauthorizedResponse.body.includes('Access Denied')) {
        console.log('✅ PASS: /unauthorized page contains correct content');
      } else {
        console.log('⚠️  WARNING: /unauthorized page content may not be correct');
      }
    } else {
      console.log('❌ FAIL: /unauthorized page returned status', unauthorizedResponse.statusCode);
    }

    console.log('\n🎉 Admin Protection Testing Complete!');

  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
  }
}

// Run the tests
testAdminProtection();
