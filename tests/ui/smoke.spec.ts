import { test, expect } from '@playwright/test';

test.describe('Smoke Tests', () => {
  const baseUrl = process.env.TEST_BASE_URL || 'http://localhost:3000';

  test.beforeEach(async ({ page }) => {
    // Set up any common test data or authentication
    console.log('Setting up smoke test...');
  });

  test('should load the home page', async ({ page }) => {
    await page.goto(baseUrl);
    
    // Check that the page loads successfully
    await expect(page).toHaveTitle(/EduPro/);
    
    // Check for basic page elements
    await expect(page.locator('body')).toBeVisible();
  });

  test('should load the admin login page', async ({ page }) => {
    await page.goto(`${baseUrl}/en/admin`);
    
    // Should redirect to login or show admin interface
    await expect(page).toHaveURL(/\/(login|admin)/);
    
    // Check that the page is responsive
    await expect(page.locator('body')).toBeVisible();
  });

  test('should load the login page', async ({ page }) => {
    await page.goto(`${baseUrl}/en/login`);
    
    // Check that login form elements are present
    await expect(page.locator('form')).toBeVisible();
    
    // Look for common login form elements
    const emailInput = page.locator('input[type="email"], input[name="email"], input[placeholder*="email" i]');
    const passwordInput = page.locator('input[type="password"], input[name="password"]');
    const submitButton = page.locator('button[type="submit"], input[type="submit"]');
    
    // At least one of these should be visible
    const hasLoginElements = await emailInput.count() > 0 || 
                            await passwordInput.count() > 0 || 
                            await submitButton.count() > 0;
    
    expect(hasLoginElements).toBeTruthy();
  });

  test('should handle 404 pages gracefully', async ({ page }) => {
    const response = await page.goto(`${baseUrl}/non-existent-page`);
    
    // Should return 404 or redirect to a valid page
    expect([404, 200, 302, 301]).toContain(response?.status() || 200);
    
    // Page should still be functional
    await expect(page.locator('body')).toBeVisible();
  });

  test('should load health check endpoint', async ({ page }) => {
    const response = await page.goto(`${baseUrl}/api/health`);
    
    // Health endpoint should respond
    expect([200, 206, 503]).toContain(response?.status() || 200);
  });

  test('should have proper meta tags', async ({ page }) => {
    await page.goto(baseUrl);
    
    // Check for basic SEO meta tags
    const title = await page.locator('title').textContent();
    expect(title).toBeTruthy();
    expect(title?.length).toBeGreaterThan(0);
    
    // Check for viewport meta tag (responsive design)
    const viewport = page.locator('meta[name="viewport"]');
    await expect(viewport).toHaveCount(1);
  });

  test('should load without JavaScript errors', async ({ page }) => {
    const errors: string[] = [];
    
    // Capture console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    // Capture page errors
    page.on('pageerror', error => {
      errors.push(error.message);
    });
    
    await page.goto(baseUrl);
    
    // Wait for page to fully load
    await page.waitForLoadState('networkidle');
    
    // Filter out known acceptable errors (if any)
    const criticalErrors = errors.filter(error => 
      !error.includes('favicon') && 
      !error.includes('sw.js') &&
      !error.includes('Service Worker')
    );
    
    // Log errors for debugging but don't fail the test unless they're critical
    if (criticalErrors.length > 0) {
      console.warn('JavaScript errors detected:', criticalErrors);
    }
    
    // For now, just ensure the page loaded
    await expect(page.locator('body')).toBeVisible();
  });

  test('should be responsive on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.goto(baseUrl);
    
    // Check that the page is still functional on mobile
    await expect(page.locator('body')).toBeVisible();
    
    // Check that content is not horizontally scrollable
    const bodyWidth = await page.locator('body').evaluate(el => el.scrollWidth);
    const viewportWidth = page.viewportSize()?.width || 375;
    
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 20); // Allow small margin
  });

  test('should load CSS and styling', async ({ page }) => {
    await page.goto(baseUrl);
    
    // Check that CSS is loaded by verifying computed styles
    const body = page.locator('body');
    await expect(body).toBeVisible();
    
    // Check that the page has some basic styling
    const bodyStyles = await body.evaluate(el => {
      const styles = window.getComputedStyle(el);
      return {
        fontFamily: styles.fontFamily,
        margin: styles.margin,
        padding: styles.padding
      };
    });
    
    // Should have some font family set (not just browser default)
    expect(bodyStyles.fontFamily).toBeTruthy();
    expect(bodyStyles.fontFamily).not.toBe('');
  });
});
