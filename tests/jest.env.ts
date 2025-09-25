// Set environment variables for testing
Object.assign(process.env, {
  NODE_ENV: 'test',
  DATABASE_URL: 'postgresql://test:test@localhost:5432/edupro_test',
  JWT_SECRET: 'test-jwt-secret-for-testing-only-not-for-production-use-minimum-64-characters',
  NEXTAUTH_SECRET: 'test-nextauth-secret-for-testing-only',
  NEXTAUTH_URL: 'http://localhost:3000',
  ALLOWED_ORIGINS: 'http://localhost:3000',
  LOG_LEVEL: 'error', // Reduce log noise during tests
});
