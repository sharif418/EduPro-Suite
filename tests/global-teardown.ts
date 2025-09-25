async function globalTeardown() {
  console.log('🧹 Starting global test teardown...');
  
  // You can add global teardown logic here, such as:
  // - Cleaning up test databases
  // - Removing test data
  // - Stopping external services
  // - Cleaning up temporary files
  
  try {
    // Add any cleanup logic here
    console.log('✅ Global teardown completed successfully');
  } catch (error) {
    console.error('❌ Global teardown failed:', error);
    // Don't throw error to avoid masking test results
  }
}

export default globalTeardown;
