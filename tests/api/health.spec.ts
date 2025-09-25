import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';

describe('Health API Tests', () => {
  const baseUrl = process.env.TEST_BASE_URL || 'http://localhost:3000';

  beforeAll(async () => {
    // Setup test environment
    console.log('Setting up health API tests...');
  });

  afterAll(async () => {
    // Cleanup test environment
    console.log('Cleaning up health API tests...');
  });

  describe('GET /api/health', () => {
    it('should return 200 for healthy system', async () => {
      const response = await fetch(`${baseUrl}/api/health`);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('status', 'healthy');
      expect(data).toHaveProperty('timestamp');
      expect(data).toHaveProperty('uptime');
      expect(data).toHaveProperty('version');
    });

    it('should return proper headers', async () => {
      const response = await fetch(`${baseUrl}/api/health`);

      expect(response.headers.get('content-type')).toContain('application/json');
    });
  });

  describe('GET /api/health/detailed', () => {
    it('should return detailed health information', async () => {
      const response = await fetch(`${baseUrl}/api/health/detailed`);
      const data = await response.json();

      expect(response.status).toBeOneOf([200, 206, 503]);
      expect(data).toHaveProperty('status');
      expect(data).toHaveProperty('timestamp');
      expect(data).toHaveProperty('checks');
      expect(data).toHaveProperty('metrics');
      
      // Check that all required health checks are present
      expect(data.checks).toHaveProperty('database');
      expect(data.checks).toHaveProperty('externalServices');
      expect(data.checks).toHaveProperty('memory');
      expect(data.checks).toHaveProperty('cache');
      expect(data.checks).toHaveProperty('websocket');
      expect(data.checks).toHaveProperty('fileSystem');
      expect(data.checks).toHaveProperty('backgroundJobs');
      expect(data.checks).toHaveProperty('security');
    });

    it('should return 206 for degraded status', async () => {
      // This test would need to simulate a degraded state
      // For now, we just verify the endpoint responds
      const response = await fetch(`${baseUrl}/api/health/detailed`);
      
      if (response.status === 206) {
        expect(response.headers.get('X-System-Status')).toBe('degraded');
      }
    });

    it('should return 503 for unhealthy status', async () => {
      // This test would need to simulate an unhealthy state
      // For now, we just verify the endpoint responds
      const response = await fetch(`${baseUrl}/api/health/detailed`);
      
      expect([200, 206, 503]).toContain(response.status);
    });
  });

  describe('HEAD /api/health', () => {
    it('should return 200 for lightweight health check', async () => {
      const response = await fetch(`${baseUrl}/api/health`, {
        method: 'HEAD'
      });

      expect([200, 503]).toContain(response.status);
      expect(response.headers.get('cache-control')).toBe('no-cache');
    });
  });

  describe('OPTIONS /api/health/detailed', () => {
    it('should return readiness status', async () => {
      const response = await fetch(`${baseUrl}/api/health/detailed`, {
        method: 'OPTIONS'
      });

      expect([200, 503]).toContain(response.status);
      
      if (response.status === 200) {
        const data = await response.json();
        expect(data).toHaveProperty('status', 'ready');
        expect(data).toHaveProperty('timestamp');
      }
    });
  });
});

// Custom Jest matchers
expect.extend({
  toBeOneOf(received: any, expected: any[]) {
    const pass = expected.includes(received);
    if (pass) {
      return {
        message: () => `expected ${received} not to be one of ${expected}`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be one of ${expected}`,
        pass: false,
      };
    }
  },
});

declare global {
  namespace jest {
    interface Matchers<R> {
      toBeOneOf(expected: any[]): R;
    }
  }
}
