// Environment setup for development
// This file ensures default values are set before Next.js loads

if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'dev-jwt-secret-key-for-development-only-min-32-chars-replit-env';
  console.log('ℹ️  Using default JWT_SECRET for development');
}

if (!process.env.NEXTAUTH_SECRET) {
  process.env.NEXTAUTH_SECRET = 'dev-nextauth-secret-for-development-only-min-32-chars-replit';
  console.log('ℹ️  Using default NEXTAUTH_SECRET for development');
}

if (!process.env.NEXTAUTH_URL) {
  process.env.NEXTAUTH_URL = 'http://0.0.0.0:5000';
  console.log('ℹ️  Using default NEXTAUTH_URL: http://0.0.0.0:5000');
}

if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'development';
}

console.log('✅ Environment setup complete');
