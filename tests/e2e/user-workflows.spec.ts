import { test, expect, Page, BrowserContext } from '@playwright/test';

// Test configuration
const BASE_URL = process.env.TEST_URL || 'http://localhost:3000';

// Test user credentials
const TEST_USERS = {
  admin: {
    email: 'admin@test.edupro.com',
    password: 'TestAdmin123!',
    role: 'ADMIN'
  },
  teacher: {
    email: 'teacher@test.edupro.com',
    password: 'TestTeacher123!',
    role: 'TEACHER'
  },
  student: {
    email: 'student@test.edupro.com',
    password: 'TestStudent123!',
    role: 'STUDENT'
  },
  guardian: {
    email: 'guardian@test.edupro.com',
    password: 'TestGuardian123!',
    role: 'GUARDIAN'
  }
};

// Helper function to login
async function loginUser(page: Page, userType: keyof typeof TEST_USERS) {
  const user = TEST_USERS[userType];
  
  await page.goto(`${BASE_URL}/login`);
  await page.waitForLoadState('networkidle');
  
  // Fill login form
  await page.fill('input[name="email"]', user.email);
  await page.fill('input[name="password"]', user.password);
  
  // Submit form
  await page.click('button[type="submit"]');
  
  // Wait for redirect
  await page.waitForLoadState('networkidle');
  
  // Verify successful login by checking for dashboard elements
  await expect(page).toHaveURL(new RegExp(`/${userType.toLowerCase()}`));
}

// Helper function to create test student
async function createTestStudent(page: Page) {
  await page.goto(`${BASE_URL}/admin/student-management`);
  await page.waitForLoadState('networkidle');
  
  // Click add student button
  await page.click('button:has-text("Add Student")');
  
  // Fill student form
  await page.fill('input[name="name"]', 'Test Student E2E');
  await page.fill('input[name="email"]', 'teststudent.e2e@test.com');
  await page.fill('input[name="phone"]', '+8801234567890');
  await page.fill('input[name="address"]', 'Test Address');
  
  // Select class and section
  await page.selectOption('select[name="classLevelId"]', { index: 1 });
  await page.selectOption('select[name="sectionId"]', { index: 1 });
  
  // Submit form
  await page.click('button[type="submit"]');
  
  // Wait for success message
  await expect(page.locator('.toast-success')).toBeVisible({ timeout: 10000 });
}

test.describe('EduPro Suite E2E User Workflows', () => {
  test.describe('Admin Workflow', () => {
    test('Admin login and student management workflow', async ({ page }) => {
      // Step 1: Login as admin
      await loginUser(page, 'admin');
      
      // Step 2: Navigate to admin dashboard
      await expect(page).toHaveURL(new RegExp('/admin'));
      await expect(page.locator('h1')).toContainText('Admin Dashboard');
      
      // Step 3: Verify dashboard statistics load
      await expect(page.locator('[data-testid="total-students"]')).toBeVisible({ timeout: 10000 });
      await expect(page.locator('[data-testid="total-staff"]')).toBeVisible();
      
      // Step 4: Navigate to student management
      await page.click('a[href*="student-management"]');
      await page.waitForLoadState('networkidle');
      
      // Step 5: Create new student
      await createTestStudent(page);
      
      // Step 6: Verify student appears in list
      await page.goto(`${BASE_URL}/admin/student-management`);
      await page.waitForLoadState('networkidle');
      await expect(page.locator('text=Test Student E2E')).toBeVisible({ timeout: 10000 });
    });

    test('Admin staff management workflow', async ({ page }) => {
      await loginUser(page, 'admin');
      
      // Navigate to staff management
      await page.goto(`${BASE_URL}/admin/staff-management`);
      await page.waitForLoadState('networkidle');
      
      // Verify staff list loads
      await expect(page.locator('table')).toBeVisible({ timeout: 10000 });
      
      // Test staff creation (if add button exists)
      const addButton = page.locator('button:has-text("Add Staff")');
      if (await addButton.isVisible()) {
        await addButton.click();
        await expect(page.locator('form')).toBeVisible();
      }
    });
  });

  test.describe('Teacher Workflow', () => {
    test('Teacher login and class management', async ({ page }) => {
      // Step 1: Login as teacher
      await loginUser(page, 'teacher');
      
      // Step 2: Verify teacher dashboard
      await expect(page).toHaveURL(new RegExp('/teacher'));
      await expect(page.locator('h1')).toContainText('Teacher Dashboard');
      
      // Step 3: Navigate to classes
      await page.click('a[href*="classes"]');
      await page.waitForLoadState('networkidle');
      
      // Step 4: Verify class list loads
      await expect(page.locator('[data-testid="class-list"]')).toBeVisible({ timeout: 10000 });
    });

    test('Teacher attendance workflow', async ({ page }) => {
      await loginUser(page, 'teacher');
      
      // Navigate to attendance
      await page.goto(`${BASE_URL}/teacher/attendance`);
      await page.waitForLoadState('networkidle');
      
      // Verify attendance interface loads
      await expect(page.locator('h2')).toContainText('Attendance');
    });

    test('Teacher assignment workflow', async ({ page }) => {
      await loginUser(page, 'teacher');
      
      // Navigate to assignments
      await page.goto(`${BASE_URL}/teacher/assignments`);
      await page.waitForLoadState('networkidle');
      
      // Test assignment creation
      const createButton = page.locator('button:has-text("Create Assignment")');
      if (await createButton.isVisible()) {
        await createButton.click();
        await expect(page.locator('form')).toBeVisible();
      }
    });
  });

  test.describe('Student Workflow', () => {
    test('Student login and dashboard access', async ({ page }) => {
      // Step 1: Login as student
      await loginUser(page, 'student');
      
      // Step 2: Verify student dashboard
      await expect(page).toHaveURL(new RegExp('/student'));
      await expect(page.locator('h1')).toContainText('Student Dashboard');
      
      // Step 3: Check assignments section
      await page.click('a[href*="assignments"]');
      await page.waitForLoadState('networkidle');
      
      // Step 4: Verify assignments page loads
      await expect(page.locator('h2')).toContainText('Assignments');
    });

    test('Student assignment submission workflow', async ({ page }) => {
      await loginUser(page, 'student');
      
      // Navigate to assignments
      await page.goto(`${BASE_URL}/student/assignments`);
      await page.waitForLoadState('networkidle');
      
      // Look for assignment to submit
      const assignmentLink = page.locator('a:has-text("Submit")').first();
      if (await assignmentLink.isVisible()) {
        await assignmentLink.click();
        await page.waitForLoadState('networkidle');
        
        // Test file upload if available
        const fileInput = page.locator('input[type="file"]');
        if (await fileInput.isVisible()) {
          // Create a test file
          const testFile = Buffer.from('Test assignment content');
          await fileInput.setInputFiles({
            name: 'test-assignment.txt',
            mimeType: 'text/plain',
            buffer: testFile
          });
        }
      }
    });
  });

  test.describe('Guardian Workflow', () => {
    test('Guardian login and child progress viewing', async ({ page }) => {
      await loginUser(page, 'guardian');
      
      // Verify guardian dashboard
      await expect(page).toHaveURL(new RegExp('/guardian'));
      await expect(page.locator('h1')).toContainText('Guardian Dashboard');
      
      // Check child progress section
      await expect(page.locator('[data-testid="child-progress"]')).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Multi-language Support', () => {
    test('Language switching functionality', async ({ page }) => {
      await page.goto(`${BASE_URL}/login`);
      
      // Test English (default)
      await expect(page.locator('text=Login')).toBeVisible();
      
      // Switch to Bengali
      const languageSwitcher = page.locator('[data-testid="language-switcher"]');
      if (await languageSwitcher.isVisible()) {
        await languageSwitcher.click();
        await page.click('button:has-text("বাংলা")');
        await page.waitForLoadState('networkidle');
        
        // Verify Bengali text appears
        await expect(page.locator('text=লগইন')).toBeVisible({ timeout: 5000 });
      }
      
      // Switch to Arabic
      if (await languageSwitcher.isVisible()) {
        await languageSwitcher.click();
        await page.click('button:has-text("العربية")');
        await page.waitForLoadState('networkidle');
        
        // Verify Arabic text and RTL layout
        await expect(page.locator('html[dir="rtl"]')).toBeVisible({ timeout: 5000 });
      }
    });
  });

  test.describe('Cross-Role Integration', () => {
    test('Teacher creates assignment, student submits, teacher grades', async ({ browser }) => {
      // Create two browser contexts for different users
      const teacherContext = await browser.newContext();
      const studentContext = await browser.newContext();
      
      const teacherPage = await teacherContext.newPage();
      const studentPage = await studentContext.newPage();
      
      try {
        // Step 1: Teacher creates assignment
        await loginUser(teacherPage, 'teacher');
        await teacherPage.goto(`${BASE_URL}/teacher/assignments/new`);
        await teacherPage.waitForLoadState('networkidle');
        
        // Fill assignment form
        await teacherPage.fill('input[name="title"]', 'E2E Test Assignment');
        await teacherPage.fill('textarea[name="description"]', 'This is a test assignment for E2E testing');
        await teacherPage.fill('input[name="dueDate"]', '2024-12-31');
        
        // Submit assignment
        await teacherPage.click('button[type="submit"]');
        await expect(teacherPage.locator('.toast-success')).toBeVisible({ timeout: 10000 });
        
        // Step 2: Student views and submits assignment
        await loginUser(studentPage, 'student');
        await studentPage.goto(`${BASE_URL}/student/assignments`);
        await studentPage.waitForLoadState('networkidle');
        
        // Look for the created assignment
        const assignmentRow = studentPage.locator('text=E2E Test Assignment');
        if (await assignmentRow.isVisible()) {
          await assignmentRow.click();
          await studentPage.waitForLoadState('networkidle');
          
          // Submit assignment if submission form is available
          const submitButton = studentPage.locator('button:has-text("Submit")');
          if (await submitButton.isVisible()) {
            await submitButton.click();
          }
        }
        
        // Step 3: Teacher grades assignment
        await teacherPage.goto(`${BASE_URL}/teacher/assignments`);
        await teacherPage.waitForLoadState('networkidle');
        
        // Look for submissions to grade
        const gradeButton = teacherPage.locator('button:has-text("Grade")').first();
        if (await gradeButton.isVisible()) {
          await gradeButton.click();
          await teacherPage.waitForLoadState('networkidle');
          
          // Provide grade if grading form is available
          const gradeInput = teacherPage.locator('input[name="grade"]');
          if (await gradeInput.isVisible()) {
            await gradeInput.fill('85');
            await teacherPage.click('button[type="submit"]');
          }
        }
        
      } finally {
        await teacherContext.close();
        await studentContext.close();
      }
    });
  });

  test.describe('Security and Error Handling', () => {
    test('Unauthorized access redirects to login', async ({ page }) => {
      // Try to access admin page without login
      await page.goto(`${BASE_URL}/admin`);
      await page.waitForLoadState('networkidle');
      
      // Should redirect to login
      await expect(page).toHaveURL(new RegExp('/login'));
    });

    test('Role-based access control works', async ({ page }) => {
      // Login as student
      await loginUser(page, 'student');
      
      // Try to access admin page
      await page.goto(`${BASE_URL}/admin`);
      await page.waitForLoadState('networkidle');
      
      // Should redirect to unauthorized or student dashboard
      const url = page.url();
      expect(url).not.toContain('/admin');
    });

    test('File upload security validation', async ({ page }) => {
      await loginUser(page, 'student');
      
      // Navigate to assignment submission
      await page.goto(`${BASE_URL}/student/assignments`);
      await page.waitForLoadState('networkidle');
      
      const fileInput = page.locator('input[type="file"]').first();
      if (await fileInput.isVisible()) {
        // Try to upload an invalid file type
        const invalidFile = Buffer.from('Invalid content');
        await fileInput.setInputFiles({
          name: 'malicious.exe',
          mimeType: 'application/x-executable',
          buffer: invalidFile
        });
        
        // Should show error message
        await expect(page.locator('.error-message')).toBeVisible({ timeout: 5000 });
      }
    });
  });

  test.describe('Mobile Responsiveness', () => {
    test('Mobile layout works correctly', async ({ browser }) => {
      // Create mobile context
      const mobileContext = await browser.newContext({
        viewport: { width: 375, height: 667 }, // iPhone SE size
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15'
      });
      
      const mobilePage = await mobileContext.newPage();
      
      try {
        await mobilePage.goto(`${BASE_URL}/login`);
        await mobilePage.waitForLoadState('networkidle');
        
        // Verify mobile layout
        await expect(mobilePage.locator('form')).toBeVisible();
        
        // Test mobile navigation if hamburger menu exists
        const hamburgerMenu = mobilePage.locator('[data-testid="mobile-menu"]');
        if (await hamburgerMenu.isVisible()) {
          await hamburgerMenu.click();
          await expect(mobilePage.locator('nav')).toBeVisible();
        }
        
      } finally {
        await mobileContext.close();
      }
    });
  });

  test.describe('Performance Testing', () => {
    test('Page load times are acceptable', async ({ page }) => {
      // Test login page load time
      const startTime = Date.now();
      await page.goto(`${BASE_URL}/login`);
      await page.waitForLoadState('networkidle');
      const loginLoadTime = Date.now() - startTime;
      
      expect(loginLoadTime).toBeLessThan(5000); // 5 seconds max
      
      // Test dashboard load time after login
      await loginUser(page, 'admin');
      const dashboardStartTime = Date.now();
      await page.goto(`${BASE_URL}/admin`);
      await page.waitForLoadState('networkidle');
      const dashboardLoadTime = Date.now() - dashboardStartTime;
      
      expect(dashboardLoadTime).toBeLessThan(3000); // 3 seconds max
    });
  });

  test.describe('Accessibility Testing', () => {
    test('Keyboard navigation works', async ({ page }) => {
      await page.goto(`${BASE_URL}/login`);
      await page.waitForLoadState('networkidle');
      
      // Test tab navigation
      await page.keyboard.press('Tab');
      await expect(page.locator('input[name="email"]')).toBeFocused();
      
      await page.keyboard.press('Tab');
      await expect(page.locator('input[name="password"]')).toBeFocused();
      
      await page.keyboard.press('Tab');
      await expect(page.locator('button[type="submit"]')).toBeFocused();
    });

    test('Form labels and ARIA attributes exist', async ({ page }) => {
      await page.goto(`${BASE_URL}/login`);
      await page.waitForLoadState('networkidle');
      
      // Check for proper form labels
      await expect(page.locator('label[for="email"]')).toBeVisible();
      await expect(page.locator('label[for="password"]')).toBeVisible();
      
      // Check for ARIA attributes
      const emailInput = page.locator('input[name="email"]');
      await expect(emailInput).toHaveAttribute('aria-label');
    });
  });

  test.describe('Error Scenarios', () => {
    test('Network error handling', async ({ page }) => {
      await page.goto(`${BASE_URL}/login`);
      
      // Simulate network failure
      await page.route('**/api/auth/login', route => route.abort());
      
      // Try to login
      await page.fill('input[name="email"]', 'test@test.com');
      await page.fill('input[name="password"]', 'password');
      await page.click('button[type="submit"]');
      
      // Should show network error message
      await expect(page.locator('.error-message')).toBeVisible({ timeout: 5000 });
    });

    test('Invalid form data handling', async ({ page }) => {
      await page.goto(`${BASE_URL}/login`);
      
      // Submit form with invalid email
      await page.fill('input[name="email"]', 'invalid-email');
      await page.fill('input[name="password"]', '123');
      await page.click('button[type="submit"]');
      
      // Should show validation errors
      await expect(page.locator('.validation-error')).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Real-time Features', () => {
    test('Real-time notifications work', async ({ page }) => {
      await loginUser(page, 'admin');
      
      // Check if notification center exists
      const notificationCenter = page.locator('[data-testid="notification-center"]');
      if (await notificationCenter.isVisible()) {
        await notificationCenter.click();
        await expect(page.locator('.notification-list')).toBeVisible();
      }
    });
  });
});

// Test utilities
test.describe('Test Utilities', () => {
  test('Database connection works', async ({ page }) => {
    const response = await page.request.get(`${BASE_URL}/api/health`);
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.status).toBe('healthy');
  });

  test('Environment variables are loaded', async ({ page }) => {
    const response = await page.request.get(`${BASE_URL}/api/health/detailed`);
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data.environment).toBeDefined();
  });
});
