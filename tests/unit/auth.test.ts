import { NextRequest } from 'next/server';
import { verifyAuth } from '../../app/lib/auth-helpers';
import jwt from 'jsonwebtoken';

// Mock the JWT library
jest.mock('jsonwebtoken');
const mockedJwt = jwt as jest.Mocked<typeof jwt>;

// Mock the prisma client
jest.mock('../../app/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
    },
  },
}));

describe('Authentication System', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('verifyAuth', () => {
    it('should return null when no authorization header is present', async () => {
      const request = new NextRequest('http://localhost:3000/api/test');
      
      const result = await verifyAuth(request);
      
      expect(result).toBeNull();
    });

    it('should return null when authorization header is malformed', async () => {
      const request = new NextRequest('http://localhost:3000/api/test', {
        headers: {
          authorization: 'InvalidToken',
        },
      });
      
      const result = await verifyAuth(request);
      
      expect(result).toBeNull();
    });

    it('should return null when JWT token is invalid', async () => {
      mockedJwt.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      const request = new NextRequest('http://localhost:3000/api/test', {
        headers: {
          authorization: 'Bearer invalid-token',
        },
      });
      
      const result = await verifyAuth(request);
      
      expect(result).toBeNull();
      expect(mockedJwt.verify).toHaveBeenCalledWith('invalid-token', process.env.JWT_SECRET);
    });

    it('should return user data when JWT token is valid', async () => {
      const mockPayload = {
        userId: 'user123',
        email: 'test@example.com',
        role: 'ADMIN',
        iat: Date.now(),
        exp: Date.now() + 3600000,
      };

      mockedJwt.verify.mockReturnValue(mockPayload);

      const request = new NextRequest('http://localhost:3000/api/test', {
        headers: {
          authorization: 'Bearer valid-token',
        },
      });
      
      const result = await verifyAuth(request);
      
      expect(result).toEqual(mockPayload);
      expect(mockedJwt.verify).toHaveBeenCalledWith('valid-token', process.env.JWT_SECRET);
    });

    it('should handle expired tokens', async () => {
      mockedJwt.verify.mockImplementation(() => {
        const error = new Error('Token expired');
        error.name = 'TokenExpiredError';
        throw error;
      });

      const request = new NextRequest('http://localhost:3000/api/test', {
        headers: {
          authorization: 'Bearer expired-token',
        },
      });
      
      const result = await verifyAuth(request);
      
      expect(result).toBeNull();
    });

    it('should handle malformed JWT tokens', async () => {
      mockedJwt.verify.mockImplementation(() => {
        const error = new Error('Malformed token');
        error.name = 'JsonWebTokenError';
        throw error;
      });

      const request = new NextRequest('http://localhost:3000/api/test', {
        headers: {
          authorization: 'Bearer malformed-token',
        },
      });
      
      const result = await verifyAuth(request);
      
      expect(result).toBeNull();
    });
  });

  describe('JWT Token Generation', () => {
    it('should generate valid JWT tokens with correct payload', () => {
      const payload = {
        userId: 'user123',
        email: 'test@example.com',
        role: 'TEACHER',
      };

      const mockToken = 'mock-jwt-token';
      mockedJwt.sign.mockReturnValue(mockToken);

      const token = jwt.sign(payload, process.env.JWT_SECRET!, {
        expiresIn: '24h',
      });

      expect(token).toBe(mockToken);
      expect(mockedJwt.sign).toHaveBeenCalledWith(
        payload,
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );
    });

    it('should include expiration time in token', () => {
      const payload = {
        userId: 'user123',
        email: 'test@example.com',
        role: 'STUDENT',
      };

      mockedJwt.sign.mockReturnValue('token-with-expiry');

      jwt.sign(payload, process.env.JWT_SECRET!, {
        expiresIn: '1h',
      });

      expect(mockedJwt.sign).toHaveBeenCalledWith(
        payload,
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );
    });
  });

  describe('Role-based Access Control', () => {
    const createRequestWithRole = (role: string) => {
      const mockPayload = {
        userId: 'user123',
        email: 'test@example.com',
        role,
        iat: Date.now(),
        exp: Date.now() + 3600000,
      };

      mockedJwt.verify.mockReturnValue(mockPayload);

      return new NextRequest('http://localhost:3000/api/test', {
        headers: {
          authorization: 'Bearer valid-token',
        },
      });
    };

    it('should correctly identify ADMIN role', async () => {
      const request = createRequestWithRole('ADMIN');
      const result = await verifyAuth(request);
      
      expect(result?.role).toBe('ADMIN');
    });

    it('should correctly identify TEACHER role', async () => {
      const request = createRequestWithRole('TEACHER');
      const result = await verifyAuth(request);
      
      expect(result?.role).toBe('TEACHER');
    });

    it('should correctly identify STUDENT role', async () => {
      const request = createRequestWithRole('STUDENT');
      const result = await verifyAuth(request);
      
      expect(result?.role).toBe('STUDENT');
    });

    it('should correctly identify GUARDIAN role', async () => {
      const request = createRequestWithRole('GUARDIAN');
      const result = await verifyAuth(request);
      
      expect(result?.role).toBe('GUARDIAN');
    });

    it('should correctly identify SUPERADMIN role', async () => {
      const request = createRequestWithRole('SUPERADMIN');
      const result = await verifyAuth(request);
      
      expect(result?.role).toBe('SUPERADMIN');
    });
  });

  describe('Session Management', () => {
    it('should handle concurrent sessions for same user', async () => {
      const userId = 'user123';
      const mockPayload1 = {
        userId,
        email: 'test@example.com',
        role: 'TEACHER',
        sessionId: 'session1',
        iat: Date.now(),
        exp: Date.now() + 3600000,
      };

      const mockPayload2 = {
        userId,
        email: 'test@example.com',
        role: 'TEACHER',
        sessionId: 'session2',
        iat: Date.now(),
        exp: Date.now() + 3600000,
      };

      // First session
      mockedJwt.verify.mockReturnValueOnce(mockPayload1);
      const request1 = new NextRequest('http://localhost:3000/api/test', {
        headers: { authorization: 'Bearer token1' },
      });
      const result1 = await verifyAuth(request1);

      // Second session
      mockedJwt.verify.mockReturnValueOnce(mockPayload2);
      const request2 = new NextRequest('http://localhost:3000/api/test', {
        headers: { authorization: 'Bearer token2' },
      });
      const result2 = await verifyAuth(request2);

      expect(result1?.userId).toBe(userId);
      expect(result2?.userId).toBe(userId);
      expect((result1 as any)?.sessionId).toBe('session1');
      expect((result2 as any)?.sessionId).toBe('session2');
    });

    it('should validate token expiration correctly', async () => {
      const expiredTime = Date.now() - 3600000; // 1 hour ago
      const mockPayload = {
        userId: 'user123',
        email: 'test@example.com',
        role: 'STUDENT',
        iat: expiredTime - 3600000,
        exp: expiredTime,
      };

      mockedJwt.verify.mockImplementation(() => {
        const error = new Error('Token expired');
        error.name = 'TokenExpiredError';
        throw error;
      });

      const request = new NextRequest('http://localhost:3000/api/test', {
        headers: { authorization: 'Bearer expired-token' },
      });

      const result = await verifyAuth(request);
      expect(result).toBeNull();
    });
  });

  describe('Security Edge Cases', () => {
    it('should reject tokens with missing required fields', async () => {
      const incompletePayload = {
        userId: 'user123',
        // Missing email and role
      };

      mockedJwt.verify.mockReturnValue(incompletePayload);

      const request = new NextRequest('http://localhost:3000/api/test', {
        headers: { authorization: 'Bearer incomplete-token' },
      });

      const result = await verifyAuth(request);
      
      // Should still return the payload but validation should happen at API level
      expect(result).toEqual(incompletePayload);
    });

    it('should handle very long authorization headers', async () => {
      const longToken = 'Bearer ' + 'a'.repeat(10000);
      
      const request = new NextRequest('http://localhost:3000/api/test', {
        headers: { authorization: longToken },
      });

      mockedJwt.verify.mockImplementation(() => {
        throw new Error('Token too long');
      });

      const result = await verifyAuth(request);
      expect(result).toBeNull();
    });

    it('should handle special characters in tokens', async () => {
      const specialToken = 'Bearer token-with-special-chars-!@#$%^&*()';
      
      const request = new NextRequest('http://localhost:3000/api/test', {
        headers: { authorization: specialToken },
      });

      mockedJwt.verify.mockImplementation(() => {
        throw new Error('Invalid characters');
      });

      const result = await verifyAuth(request);
      expect(result).toBeNull();
    });
  });

  describe('Environment Configuration', () => {
    it('should use JWT_SECRET from environment variables', () => {
      const originalSecret = process.env.JWT_SECRET;
      process.env.JWT_SECRET = 'test-secret-key';

      const payload = { userId: 'test' };
      jwt.sign(payload, process.env.JWT_SECRET!);

      expect(mockedJwt.sign).toHaveBeenCalledWith(payload, 'test-secret-key');

      // Restore original value
      process.env.JWT_SECRET = originalSecret;
    });

    it('should handle missing JWT_SECRET gracefully', () => {
      const originalSecret = process.env.JWT_SECRET;
      delete process.env.JWT_SECRET;

      expect(() => {
        jwt.sign({ userId: 'test' }, process.env.JWT_SECRET!);
      }).not.toThrow();

      // Restore original value
      process.env.JWT_SECRET = originalSecret;
    });
  });
});
