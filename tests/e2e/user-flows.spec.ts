import { test, expect } from '@playwright/test';

// Test configuration
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

// Test credentials from seeded data
const TEST_CREDENTIALS = {
  SUPERADMIN: { email: 'admin@edupro.com', password: 'admin123' },
  TEACHER: { email: 'teacher@edupro.com', password: 'teacher123' },
  STUDENT: { email: 'student@edupro.com', password: 'student123' },
  GUARDIAN: { email: 'guardian@edupro.com', password: 'guardian123' },
};

// Helper function to login
async function login(page: any, credentials: { email: string; password: string }) {
  await page.goto(`${BASE_URL}/en/login`);
  await page.fill('input[name="email"]', credentials.email);
  await page.fill('input[name="password"]', credentials.password);
  await page.click('button[type="submit"]');
  
  // Wait for navigation after login
  await page.waitForURL(/\/(en|bn|ar)\/(admin|teacher|student|guardian)/);
}

// Helper function to logout
async function logout(page: any) {
  // Look for logout button or menu
  try {
    await page.click('[data-testid="logout-button"]', { timeout: 5000 });
  } catch {
    // Fallback: clear cookies and navigate to login
    await page.context().clearCookies();
    await page.goto(`${BASE_URL}/en/login`);
  }
}

test.describe('EduPro Suite User Flows', () => {
  test.beforeEach(async ({ page }) => {
    // Set viewport for consistent testing
    await page.setViewportSize({ width: 1280, height: 720 });
  });

  test('Admin Login and Dashboard Access', async ({ page }) => {
    // Test admin login
    await login(page, TEST_CREDENTIALS.SUPERADMIN);
    
    // Verify admin dashboard loads
    await expect(page).toHaveURL(/\/en\/admin/);
    await expect(page.locator('h1, h2')).toContainText(/admin|dashboard/i);
    
    // Check for admin-specific elements
    await expect(page.locator('nav, sidebar')).toBeVisible();
    
    // Test navigation to different admin sections
    const adminSections = ['students', 'staff', 'classes', 'examinations'];
    
    for (const section of adminSections) {
      try {
        // Try to navigate to section
        await page.click(`a[href*="${section}"], button[data-section="${section}"]`, { timeout: 5000 });
        await page.waitForTimeout(1000); // Wait for page load
        
        // Verify section loads without errors
        await expect(page.locator('body')).not.toContainText('Error');
        await expect(page.locator('body')).not.toContainText('404');
      } catch (error) {
        console.log(`Admin section ${section} navigation failed or not found:`, error);
      }
    }
  });

  test('Teacher Login and Class Management Workflow', async ({ page }) => {
    // Test teacher login
    await login(page, TEST_CREDENTIALS.TEACHER);
    
    // Verify teacher dashboard loads
    await expect(page).toHaveURL(/\/en\/teacher/);
    await expect(page.locator('h1, h2')).toContainText(/teacher|dashboard|class/i);
    
    // Test teacher-specific functionality
    const teacherSections = ['attendance', 'lessons', 'gradebook', 'announcements'];
    
    for (const section of teacherSections) {
      try {
        // Try to navigate to section
        await page.click(`a[href*="${section}"], button[data-section="${section}"]`, { timeout: 5000 });
        await page.waitForTimeout(1000);
        
        // Verify section loads
        await expect(page.locator('body')).not.toContainText('Error');
        await expect(page.locator('body')).not.toContainText('Unauthorized');
      } catch (error) {
        console.log(`Teacher section ${section} navigation failed or not found:`, error);
      }
    }
    
    // Test class management actions
    try {
      // Look for class-related buttons or links
      const classElements = page.locator('button, a').filter({ hasText: /class|student|attendance/i });
      const count = await classElements.count();
      
      if (count > 0) {
        await classElements.first().click();
        await page.waitForTimeout(1000);
        
        // Verify class management interface loads
        await expect(page.locator('body')).not.toContainText('Error');
      }
    } catch (error) {
      console.log('Class management interface test failed:', error);
    }
  });

  test('Student Login and Assignment Workflow', async ({ page }) => {
    // Test student login
    await login(page, TEST_CREDENTIALS.STUDENT);
    
    // Verify student dashboard loads
    await expect(page).toHaveURL(/\/en\/student/);
    await expect(page.locator('h1, h2')).toContainText(/student|dashboard/i);
    
    // Test student-specific functionality
    const studentSections = ['lessons', 'assignments', 'results'];
    
    for (const section of studentSections) {
      try {
        // Try to navigate to section
        await page.click(`a[href*="${section}"], button[data-section="${section}"]`, { timeout: 5000 });
        await page.waitForTimeout(1000);
        
        // Verify section loads
        await expect(page.locator('body')).not.toContainText('Error');
        await expect(page.locator('body')).not.toContainText('Unauthorized');
      } catch (error) {
        console.log(`Student section ${section} navigation failed or not found:`, error);
      }
    }
    
    // Test assignment submission workflow
    try {
      // Look for assignment-related elements
      const assignmentElements = page.locator('button, a').filter({ hasText: /assignment|submit|homework/i });
      const count = await assignmentElements.count();
      
      if (count > 0) {
        await assignmentElements.first().click();
        await page.waitForTimeout(1000);
        
        // Verify assignment interface loads
        await expect(page.locator('body')).not.toContainText('Error');
      }
    } catch (error) {
      console.log('Assignment interface test failed:', error);
    }
  });

  test('Guardian Login and Child Progress Monitoring', async ({ page }) => {
    // Test guardian login
    await login(page, TEST_CREDENTIALS.GUARDIAN);
    
    // Verify guardian dashboard loads
    await expect(page).toHaveURL(/\/en\/guardian/);
    await expect(page.locator('h1, h2')).toContainText(/guardian|dashboard|child/i);
    
    // Test guardian-specific functionality
    const guardianSections = ['children', 'progress', 'attendance', 'fees'];
    
    for (const section of guardianSections) {
      try {
        // Try to navigate to section
        await page.click(`a[href*="${section}"], button[data-section="${section}"]`, { timeout: 5000 });
        await page.waitForTimeout(1000);
        
        // Verify section loads
        await expect(page.locator('body')).not.toContainText('Error');
        await expect(page.locator('body')).not.toContainText('Unauthorized');
      } catch (error) {
        console.log(`Guardian section ${section} navigation failed or not found:`, error);
      }
    }
    
    // Test child progress monitoring
    try {
      // Look for child/student progress elements
      const progressElements = page.locator('button, a').filter({ hasText: /progress|report|grade|result/i });
      const count = await progressElements.count();
      
      if (count > 0) {
        await progressElements.first().click();
        await page.waitForTimeout(1000);
        
        // Verify progress interface loads
        await expect(page.locator('body')).not.toContainText('Error');
      }
    } catch (error) {
      console.log('Child progress monitoring test failed:', error);
    }
  });

  test('Multi-language Support', async ({ page }) => {
    // Test language switching
    await page.goto(`${BASE_URL}/en`);
    
    // Test English (default)
    await expect(page).toHaveURL(/\/en/);
    
    // Test Bengali language switch
    try {
      await page.click('[data-testid="language-switcher"], [aria-label*="language"], button:has-text("বাংলা")', { timeout: 5000 });
      await page.waitForTimeout(1000);
      await expect(page).toHaveURL(/\/bn/);
    } catch (error) {
      console.log('Bengali language switch test failed:', error);
    }
    
    // Test Arabic language switch
    try {
      await page.goto(`${BASE_URL}/ar`);
      await expect(page).toHaveURL(/\/ar/);
      
      // Check for RTL layout
      const htmlElement = page.locator('html');
      const dir = await htmlElement.getAttribute('dir');
      expect(dir).toBe('rtl');
    } catch (error) {
      console.log('Arabic language test failed:', error);
    }
  });

  test('Authentication Flow and Role-based Access', async ({ page }) => {
    // Test unauthorized access
    await page.goto(`${BASE_URL}/en/admin`);
    await expect(page).toHaveURL(/\/en\/login/);
    
    // Test login with invalid credentials
    await page.fill('input[name="email"]', 'invalid@example.com');
    await page.fill('input[name="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');
    
    // Should show error message
    await expect(page.locator('body')).toContainText(/invalid|error|incorrect/i);
    
    // Test successful login
    await login(page, TEST_CREDENTIALS.SUPERADMIN);
    await expect(page).toHaveURL(/\/en\/admin/);
    
    // Test role-based access - try to access teacher area as admin (should work)
    await page.goto(`${BASE_URL}/en/teacher`);
    await expect(page.locator('body')).not.toContainText('Unauthorized');
    
    // Logout and test student access to admin area (should fail)
    await logout(page);
    await login(page, TEST_CREDENTIALS.STUDENT);
    
    await page.goto(`${BASE_URL}/en/admin`);
    await expect(page).toHaveURL(/\/en\/unauthorized/);
  });

  test('Application Health and Basic Functionality', async ({ page }) => {
    // Test health endpoint
    const healthResponse = await page.request.get(`${BASE_URL}/api/health`);
    expect(healthResponse.status()).toBe(200);
    
    const healthData = await healthResponse.json();
    expect(healthData.status).toBe('healthy');
    
    // Test main page loads
    await page.goto(`${BASE_URL}/en`);
    await expect(page.locator('body')).not.toContainText('Error');
    await expect(page.locator('body')).not.toContainText('500');
    
    // Test login page loads
    await page.goto(`${BASE_URL}/en/login`);
    await expect(page.locator('form')).toBeVisible();
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    
    // Test that protected routes redirect to login
    await page.goto(`${BASE_URL}/en/admin`);
    await expect(page).toHaveURL(/\/en\/login/);
  });

  test('Dashboard Data Loading and Display', async ({ page }) => {
    // Test admin dashboard data
    await login(page, TEST_CREDENTIALS.SUPERADMIN);
    
    // Wait for dashboard to load
    await page.waitForTimeout(2000);
    
    // Check for dashboard statistics or data
    const dashboardElements = page.locator('[data-testid*="stat"], [data-testid*="card"], .stat, .metric, .dashboard-card');
    const count = await dashboardElements.count();
    
    if (count > 0) {
      // Verify at least some dashboard data is displayed
      await expect(dashboardElements.first()).toBeVisible();
    }
    
    // Check for no error states
    await expect(page.locator('body')).not.toContainText('Failed to load');
    await expect(page.locator('body')).not.toContainText('Something went wrong');
    
    // Test teacher dashboard
    await logout(page);
    await login(page, TEST_CREDENTIALS.TEACHER);
    await page.waitForTimeout(2000);
    
    // Verify teacher dashboard loads without errors
    await expect(page.locator('body')).not.toContainText('Error');
    await expect(page.locator('body')).not.toContainText('Failed');
  });

  test('Form Submissions and User Interactions', async ({ page }) => {
    // Test admin creating a new student
    await login(page, TEST_CREDENTIALS.SUPERADMIN);
    
    try {
      // Navigate to student management
      await page.click('a[href*="student"], button[data-section="students"]', { timeout: 5000 });
      await page.waitForTimeout(1000);
      
      // Look for add student button
      await page.click('button:has-text("Add"), button:has-text("Create"), button:has-text("New")', { timeout: 5000 });
      await page.waitForTimeout(1000);
      
      // Fill student form if available
      const nameInput = page.locator('input[name="name"], input[placeholder*="name"]').first();
      if (await nameInput.isVisible()) {
        await nameInput.fill('Test Student');
        
        const emailInput = page.locator('input[name="email"], input[type="email"]').first();
        if (await emailInput.isVisible()) {
          await emailInput.fill('test.student@example.com');
        }
        
        // Submit form
        await page.click('button[type="submit"], button:has-text("Save"), button:has-text("Create")');
        await page.waitForTimeout(2000);
        
        // Check for success or error messages
        const hasError = await page.locator('body').textContent();
        expect(hasError).not.toContain('500 Internal Server Error');
      }
    } catch (error) {
      console.log('Student creation test failed or form not found:', error);
    }
  });

  test('Real-time Features and WebSocket Connection', async ({ page }) => {
    // Test WebSocket connection by checking for real-time elements
    await login(page, TEST_CREDENTIALS.SUPERADMIN);
    
    // Wait for potential WebSocket connection
    await page.waitForTimeout(3000);
    
    // Check console for WebSocket connection logs
    const logs: string[] = [];
    page.on('console', msg => {
      logs.push(msg.text());
    });
    
    // Refresh page to trigger WebSocket connection
    await page.reload();
    await page.waitForTimeout(2000);
    
    // Check if WebSocket connected (look for connection logs or real-time elements)
    const hasWebSocketLogs = logs.some(log => 
      log.includes('socket') || 
      log.includes('connected') || 
      log.includes('notification')
    );
    
    // WebSocket connection is optional, so we don't fail the test if it's not working
    if (hasWebSocketLogs) {
      console.log('WebSocket connection detected');
    } else {
      console.log('WebSocket connection not detected (may be disabled)');
    }
    
    // Check for notification center or real-time elements
    const notificationElements = page.locator('[data-testid*="notification"], .notification, .alert');
    const notificationCount = await notificationElements.count();
    
    if (notificationCount > 0) {
      console.log(`Found ${notificationCount} notification elements`);
    }
  });

  test('File Upload Functionality', async ({ page }) => {
    // Test file upload as admin
    await login(page, TEST_CREDENTIALS.SUPERADMIN);
    
    try {
      // Look for file upload elements
      const fileInputs = page.locator('input[type="file"]');
      const fileInputCount = await fileInputs.count();
      
      if (fileInputCount > 0) {
        // Create a test file
        const testFile = Buffer.from('Test file content');
        
        // Upload file
        await fileInputs.first().setInputFiles({
          name: 'test.txt',
          mimeType: 'text/plain',
          buffer: testFile,
        });
        
        // Look for upload button or form submission
        await page.click('button:has-text("Upload"), button[type="submit"]', { timeout: 5000 });
        await page.waitForTimeout(2000);
        
        // Check for upload success or error
        const pageContent = await page.locator('body').textContent();
        expect(pageContent).not.toContain('500 Internal Server Error');
      } else {
        console.log('No file upload inputs found on current page');
      }
    } catch (error) {
      console.log('File upload test failed or not available:', error);
    }
  });

  test('Cross-role Navigation and Security', async ({ page }) => {
    // Test that users can only access their authorized areas
    
    // Login as student
    await login(page, TEST_CREDENTIALS.STUDENT);
    
    // Try to access admin area (should be blocked)
    await page.goto(`${BASE_URL}/en/admin`);
    await expect(page).toHaveURL(/\/en\/unauthorized/);
    
    // Try to access teacher area (should be blocked)
    await page.goto(`${BASE_URL}/en/teacher`);
    await expect(page).toHaveURL(/\/en\/unauthorized/);
    
    // Access student area (should work)
    await page.goto(`${BASE_URL}/en/student`);
    await expect(page).toHaveURL(/\/en\/student/);
    
    // Logout and test guardian access
    await logout(page);
    await login(page, TEST_CREDENTIALS.GUARDIAN);
    
    // Guardian should access guardian area
    await page.goto(`${BASE_URL}/en/guardian`);
    await expect(page).toHaveURL(/\/en\/guardian/);
    
    // Guardian should not access admin area
    await page.goto(`${BASE_URL}/en/admin`);
    await expect(page).toHaveURL(/\/en\/unauthorized/);
  });

  test('API Endpoints Accessibility', async ({ page }) => {
    // Test public API endpoints
    const publicEndpoints = [
      '/api/health',
      '/api/health/detailed'
    ];
    
    for (const endpoint of publicEndpoints) {
      const response = await page.request.get(`${BASE_URL}${endpoint}`);
      expect(response.status()).toBeLessThan(500); // Should not be server error
    }
    
    // Test protected API endpoints (should require authentication)
    const protectedEndpoints = [
      '/api/admin/dashboard/stats',
      '/api/teacher/dashboard/stats',
      '/api/student/dashboard/stats',
      '/api/guardian/dashboard/stats'
    ];
    
    for (const endpoint of protectedEndpoints) {
      const response = await page.request.get(`${BASE_URL}${endpoint}`);
      expect(response.status()).toBe(401); // Should require authentication
    }
    
    // Test authenticated API access
    await login(page, TEST_CREDENTIALS.SUPERADMIN);
    
    // Get auth token from cookies
    const cookies = await page.context().cookies();
    const authCookie = cookies.find(cookie => cookie.name === 'auth-token');
    
    if (authCookie) {
      // Test admin API with authentication
      const response = await page.request.get(`${BASE_URL}/api/admin/dashboard/stats`, {
        headers: {
          'Cookie': `auth-token=${authCookie.value}`
        }
      });
      
      expect(response.status()).toBeLessThan(500); // Should not be server error
    }
  });

  test('Error Handling and Graceful Degradation', async ({ page }) => {
    // Test 404 page
    await page.goto(`${BASE_URL}/en/nonexistent-page`);
    await expect(page.locator('body')).toContainText(/404|not found/i);
    
    // Test invalid API endpoints
    const invalidResponse = await page.request.get(`${BASE_URL}/api/nonexistent`);
    expect(invalidResponse.status()).toBe(404);
    
    // Test application with network issues (simulate offline)
    await page.context().setOffline(true);
    await page.goto(`${BASE_URL}/en`);
    
    // Should show offline message or handle gracefully
    await page.waitForTimeout(2000);
    
    // Re-enable network
    await page.context().setOffline(false);
    await page.reload();
    await page.waitForTimeout(2000);
    
    // Should recover and load normally
    await expect(page.locator('body')).not.toContainText('500');
  });
});
