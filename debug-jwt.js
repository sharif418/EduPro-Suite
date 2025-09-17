const http = require('http');

// Helper function to decode JWT payload (same as middleware)
function decodeJWTPayload(token) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid JWT format');
    }
    
    const payload = parts[1];
    const decoded = JSON.parse(Buffer.from(payload.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString());
    return decoded;
  } catch (error) {
    throw new Error('Invalid JWT token');
  }
}

// Helper function to make HTTP requests
function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
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

async function debugJWT() {
  console.log('🔍 Debugging JWT Tokens\n');

  try {
    // Login as student
    console.log('1. Login as STUDENT...');
    const studentLoginResponse = await makeRequest({
      hostname: 'localhost',
      port: 3000,
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
      const studentToken = studentCookies['auth-token'];
      
      if (studentToken) {
        console.log('✅ Student token received');
        console.log('Token length:', studentToken.length);
        
        try {
          const decoded = decodeJWTPayload(studentToken);
          console.log('✅ Student token decoded successfully:');
          console.log('  - User ID:', decoded.userId);
          console.log('  - Email:', decoded.email);
          console.log('  - Role:', decoded.role);
          console.log('  - Expires:', new Date(decoded.exp * 1000));
        } catch (error) {
          console.log('❌ Failed to decode student token:', error.message);
        }
      } else {
        console.log('❌ No student token received');
      }
    } else {
      console.log('❌ Student login failed:', studentLoginResponse.statusCode);
    }

    console.log('\n2. Login as SUPERADMIN...');
    const adminLoginResponse = await makeRequest({
      hostname: 'localhost',
      port: 3000,
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
      const adminToken = adminCookies['auth-token'];
      
      if (adminToken) {
        console.log('✅ Admin token received');
        console.log('Token length:', adminToken.length);
        
        try {
          const decoded = decodeJWTPayload(adminToken);
          console.log('✅ Admin token decoded successfully:');
          console.log('  - User ID:', decoded.userId);
          console.log('  - Email:', decoded.email);
          console.log('  - Role:', decoded.role);
          console.log('  - Expires:', new Date(decoded.exp * 1000));
        } catch (error) {
          console.log('❌ Failed to decode admin token:', error.message);
        }
      } else {
        console.log('❌ No admin token received');
      }
    } else {
      console.log('❌ Admin login failed:', adminLoginResponse.statusCode);
    }

  } catch (error) {
    console.error('❌ Debug failed:', error.message);
  }
}

debugJWT();
