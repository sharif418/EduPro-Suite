import { chromium, FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting global test setup...');
  
  // You can add global setup logic here, such as:
  // - Starting test databases
  // - Setting up test data
  // - Authenticating test users
  // - Starting external services
  
  const baseURL = config.projects[0].use.baseURL || 'http://localhost:3000';
  
  try {
    // Wait for the application to be ready
    const browser = await chromium.launch();
    const page = await browser.newPage();
    
    // Try to access the health endpoint to ensure the app is running
    let retries = 30; // 30 seconds timeout
    while (retries > 0) {
      try {
        const response = await page.goto(`${baseURL}/api/health`, { 
          waitUntil: 'networkidle',
          timeout: 5000 
        });
        
        if (response && [200, 206].includes(response.status())) {
          console.log('✅ Application is ready for testing');
          break;
        }
      } catch (error) {
        console.log(`⏳ Waiting for application to start... (${retries} retries left)`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        retries--;
      }
    }
    
    if (retries === 0) {
      console.warn('⚠️  Application may not be fully ready, but proceeding with tests');
    }
    
    await browser.close();
    
    console.log('✅ Global setup completed successfully');
  } catch (error) {
    console.error('❌ Global setup failed:', error);
    // Don't throw error to allow tests to run even if setup fails
  }
}

export default globalSetup;
