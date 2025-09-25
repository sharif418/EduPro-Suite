// =============================================================================
// Environment Configuration Validator
// =============================================================================
// This utility validates environment variables at application startup
// to ensure all required configuration is present and properly formatted
// =============================================================================

interface EnvironmentConfigItem {
  required: boolean;
  type: 'string' | 'number' | 'boolean' | 'url' | 'email';
  description: string;
  defaultValue?: string;
  validation?: (value: string) => boolean;
}

interface EnvironmentConfig {
  [key: string]: EnvironmentConfigItem;
}

// Define required environment variables for each deployment environment
const ENVIRONMENT_CONFIGS: Record<string, EnvironmentConfig> = {
  development: {
    NODE_ENV: {
      required: true,
      type: 'string',
      description: 'Node.js environment (development, production, test)',
      defaultValue: 'development'
    },
    DATABASE_URL: {
      required: true,
      type: 'url',
      description: 'PostgreSQL database connection string'
    },
    JWT_SECRET: {
      required: true,
      type: 'string',
      description: 'JWT signing secret (minimum 32 characters)',
      validation: (value: string) => value.length >= 32
    },
    NEXTAUTH_URL: {
      required: true,
      type: 'url',
      description: 'NextAuth.js canonical URL',
      defaultValue: 'http://localhost:3000'
    },
    NEXTAUTH_SECRET: {
      required: true,
      type: 'string',
      description: 'NextAuth.js secret for JWT encryption',
      validation: (value: string) => value.length >= 32
    }
  },
  production: {
    NODE_ENV: {
      required: true,
      type: 'string',
      description: 'Node.js environment (must be production)',
      validation: (value: string) => value === 'production'
    },
    DATABASE_URL: {
      required: true,
      type: 'url',
      description: 'PostgreSQL database connection string'
    },
    JWT_SECRET: {
      required: true,
      type: 'string',
      description: 'JWT signing secret (minimum 64 characters for production)',
      validation: (value: string) => value.length >= 64
    },
    NEXTAUTH_URL: {
      required: true,
      type: 'url',
      description: 'NextAuth.js canonical URL (production domain)'
    },
    NEXTAUTH_SECRET: {
      required: true,
      type: 'string',
      description: 'NextAuth.js secret for JWT encryption (minimum 64 characters)',
      validation: (value: string) => value.length >= 64
    },
    ALLOWED_ORIGINS: {
      required: true,
      type: 'string',
      description: 'Comma-separated list of allowed CORS origins'
    },
    // Email Configuration
    SMTP_HOST: {
      required: true,
      type: 'string',
      description: 'SMTP server hostname'
    },
    SMTP_PORT: {
      required: true,
      type: 'number',
      description: 'SMTP server port'
    },
    SMTP_USER: {
      required: true,
      type: 'email',
      description: 'SMTP authentication username'
    },
    SMTP_PASS: {
      required: true,
      type: 'string',
      description: 'SMTP authentication password'
    },
    EMAIL_FROM: {
      required: true,
      type: 'email',
      description: 'Default sender email address'
    },
    // Security Configuration
    RATE_LIMIT_MAX_REQUESTS: {
      required: false,
      type: 'number',
      description: 'Maximum requests per window',
      defaultValue: '100'
    },
    RATE_LIMIT_WINDOW_MS: {
      required: false,
      type: 'number',
      description: 'Rate limiting window in milliseconds',
      defaultValue: '900000'
    }
  },
  test: {
    NODE_ENV: {
      required: true,
      type: 'string',
      description: 'Node.js environment (must be test)',
      validation: (value: string) => value === 'test'
    },
    DATABASE_URL: {
      required: true,
      type: 'url',
      description: 'Test database connection string'
    },
    JWT_SECRET: {
      required: true,
      type: 'string',
      description: 'JWT signing secret for testing',
      defaultValue: 'test-jwt-secret-key-for-testing-only'
    },
    NEXTAUTH_SECRET: {
      required: true,
      type: 'string',
      description: 'NextAuth.js secret for testing',
      defaultValue: 'test-nextauth-secret-for-testing-only'
    }
  }
};

// Validation result interface
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  missingRequired: string[];
  invalidValues: string[];
  suggestions: string[];
}

// Environment validation class
export class EnvironmentValidator {
  private environment: string;
  private config: EnvironmentConfig;

  constructor(environment?: string) {
    this.environment = environment || process.env.NODE_ENV || 'development';
    this.config = ENVIRONMENT_CONFIGS[this.environment] || ENVIRONMENT_CONFIGS.development;
  }

  /**
   * Validate all environment variables for the current environment
   */
  public validate(): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      missingRequired: [],
      invalidValues: [],
      suggestions: []
    };

    // Check each required environment variable
    for (const [key, config] of Object.entries(this.config)) {
      const value = process.env[key];

      // Check if required variable is missing
      if (config.required && !value) {
        result.missingRequired.push(key);
        result.errors.push(`Missing required environment variable: ${key} - ${config.description}`);
        
        if (config.defaultValue) {
          result.suggestions.push(`Set ${key}=${config.defaultValue} (default value)`);
        }
        continue;
      }

      // Skip validation if variable is not set and not required
      if (!value && !config.required) {
        if (config.defaultValue) {
          result.warnings.push(`Using default value for ${key}: ${config.defaultValue}`);
        }
        continue;
      }

      // Validate the value if present
      if (value && !this.validateValue(key, value, config)) {
        result.invalidValues.push(key);
        result.errors.push(`Invalid value for ${key}: ${config.description}`);
      }
    }

    // Additional security checks for production
    if (this.environment === 'production') {
      this.addProductionSecurityChecks(result);
    }

    // Set overall validity
    result.isValid = result.errors.length === 0;

    return result;
  }

  /**
   * Validate a single environment variable value
   */
  private validateValue(key: string, value: string, config: EnvironmentConfigItem): boolean {
    // Type validation
    switch (config.type) {
      case 'number':
        if (isNaN(Number(value))) {
          return false;
        }
        break;

      case 'boolean':
        if (!['true', 'false', '1', '0'].includes(value.toLowerCase())) {
          return false;
        }
        break;

      case 'url':
        try {
          new URL(value);
        } catch {
          return false;
        }
        break;

      case 'email':
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
          return false;
        }
        break;

      case 'string':
        // String validation passed by default
        break;
    }

    // Custom validation function
    if (config.validation && !config.validation(value)) {
      return false;
    }

    return true;
  }

  /**
   * Add production-specific security checks
   */
  private addProductionSecurityChecks(result: ValidationResult): void {
    // Check JWT secret strength
    const jwtSecret = process.env.JWT_SECRET;
    if (jwtSecret && jwtSecret.length < 64) {
      result.warnings.push('JWT_SECRET should be at least 64 characters long in production');
    }

    // Check for development-like values in production
    const dangerousValues = ['localhost', 'test', 'dev', 'development'];
    for (const [key, value] of Object.entries(process.env)) {
      if (value && dangerousValues.some(dangerous => 
        value.toLowerCase().includes(dangerous)
      )) {
        result.warnings.push(`${key} contains development-like value in production: ${value}`);
      }
    }

    // Check HTTPS usage
    const nextAuthUrl = process.env.NEXTAUTH_URL;
    if (nextAuthUrl && !nextAuthUrl.startsWith('https://')) {
      result.errors.push('NEXTAUTH_URL must use HTTPS in production');
    }
  }

  /**
   * Get configuration documentation
   */
  public getDocumentation(): string {
    let doc = `Environment Configuration for ${this.environment.toUpperCase()}\n`;
    doc += '='.repeat(50) + '\n\n';

    for (const [key, config] of Object.entries(this.config)) {
      doc += `${key}${config.required ? ' (REQUIRED)' : ' (OPTIONAL)'}\n`;
      doc += `  Description: ${config.description}\n`;
      doc += `  Type: ${config.type}\n`;
      
      if (config.defaultValue) {
        doc += `  Default: ${config.defaultValue}\n`;
      }
      
      if (config.validation) {
        doc += `  Has custom validation\n`;
      }
      
      doc += '\n';
    }

    return doc;
  }

  /**
   * Generate a sample .env file
   */
  public generateSampleEnv(): string {
    let env = `# Environment Configuration for ${this.environment.toUpperCase()}\n`;
    env += `# Generated on ${new Date().toISOString()}\n\n`;

    for (const [key, config] of Object.entries(this.config)) {
      env += `# ${config.description}\n`;
      
      if (config.required) {
        env += `${key}=${config.defaultValue || 'your-value-here'}\n\n`;
      } else {
        env += `# ${key}=${config.defaultValue || 'optional-value'}\n\n`;
      }
    }

    return env;
  }
}

/**
 * Validate environment variables at application startup
 */
export function validateEnvironment(environment?: string): ValidationResult {
  const validator = new EnvironmentValidator(environment);
  return validator.validate();
}

/**
 * Validate environment and throw error if invalid
 */
export function validateEnvironmentOrThrow(environment?: string): void {
  const result = validateEnvironment(environment);
  
  if (!result.isValid) {
    const errorMessage = [
      'Environment validation failed:',
      '',
      'ERRORS:',
      ...result.errors.map(error => `  - ${error}`),
      '',
      'MISSING REQUIRED VARIABLES:',
      ...result.missingRequired.map(key => `  - ${key}`),
      '',
      'SUGGESTIONS:',
      ...result.suggestions.map(suggestion => `  - ${suggestion}`),
      '',
      'Please check your .env file and ensure all required variables are set.'
    ].join('\n');

    throw new Error(errorMessage);
  }

  // Log warnings if any
  if (result.warnings.length > 0) {
    console.warn('Environment validation warnings:');
    result.warnings.forEach(warning => console.warn(`  - ${warning}`));
  }
}

/**
 * Check database connectivity
 */
export async function validateDatabaseConnection(): Promise<boolean> {
  try {
    const { prisma } = await import('./prisma');
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    console.error('Database connection failed:', error);
    return false;
  }
}

/**
 * Comprehensive system health check
 */
export async function performSystemHealthCheck(): Promise<{
  environment: ValidationResult;
  database: boolean;
  timestamp: string;
}> {
  const environmentResult = validateEnvironment();
  const databaseConnected = await validateDatabaseConnection();

  return {
    environment: environmentResult,
    database: databaseConnected,
    timestamp: new Date().toISOString()
  };
}

// Export the validator class and utility functions
export default EnvironmentValidator;
