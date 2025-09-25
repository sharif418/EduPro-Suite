import { NextRequest } from 'next/server';
import { writeFile, mkdir, unlink } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import crypto from 'crypto';
import { verifyAuth } from '@/app/lib/auth-helpers';
import { 
  createSuccessResponse, 
  createErrorResponse, 
  checkRateLimit,
  getClientIP,
  getUserAgent,
  logApiError,
  addSecurityHeaders,
  validateFileType,
  validateFileSize,
  generateSecureFilename
} from '@/app/lib/api-helpers';

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads');

// Context-specific file type allowlists
const CONTEXT_ALLOWED_TYPES: Record<string, string[]> = {
  'student_photo': ['image/jpeg', 'image/png'],
  'staff_photo': ['image/jpeg', 'image/png'],
  'assignment': [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg',
    'image/png',
    'text/plain'
  ],
  'document': [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ],
  'general': [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg',
    'image/png',
    'text/plain'
  ]
};

// Context-specific size limits
const CONTEXT_SIZE_LIMITS: Record<string, number> = {
  'student_photo': 5 * 1024 * 1024, // 5MB
  'staff_photo': 5 * 1024 * 1024, // 5MB
  'assignment': 25 * 1024 * 1024, // 25MB
  'document': 50 * 1024 * 1024, // 50MB
  'general': 10 * 1024 * 1024 // 10MB
};

// Magic bytes for file type validation
const MAGIC_BYTES: Record<string, Buffer[]> = {
  'image/jpeg': [Buffer.from([0xFF, 0xD8, 0xFF])],
  'image/png': [Buffer.from([0x89, 0x50, 0x4E, 0x47])],
  'application/pdf': [Buffer.from([0x25, 0x50, 0x44, 0x46])],
  'text/plain': [] // Text files don't have reliable magic bytes
};

// Validate file content using magic bytes
function validateMagicBytes(buffer: Buffer, mimeType: string): boolean {
  const magicBytes = MAGIC_BYTES[mimeType];
  if (!magicBytes || magicBytes.length === 0) {
    return true; // Skip validation for types without reliable magic bytes
  }

  return magicBytes.some(magic => buffer.subarray(0, magic.length).equals(magic));
}

// Optional antivirus scanning (placeholder for future implementation)
async function scanForVirus(buffer: Buffer, filename: string): Promise<boolean> {
  // TODO: Integrate with ClamAV or similar antivirus service
  // For now, return true (clean) but log that scanning is disabled
  if (process.env.ANTIVIRUS_ENABLED === 'true') {
    console.log(`[ANTIVIRUS] Scanning ${filename} - Feature not yet implemented`);
  }
  return true;
}

export async function POST(request: NextRequest) {
  try {
    // Rate limiting check
    const rateLimitResult = checkRateLimit(request, {
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 20, // 20 uploads per IP per 15 minutes
      keyGenerator: (req) => `upload:${getClientIP(req)}`
    });

    if (!rateLimitResult.allowed) {
      return createErrorResponse(
        'Too many upload attempts. Please try again later.',
        429,
        'RATE_LIMIT_EXCEEDED',
        { resetTime: rateLimitResult.resetTime }
      );
    }

    const user = await verifyAuth(request);
    if (!user) {
      return createErrorResponse('Unauthorized', 401, 'AUTH_REQUIRED');
    }

    const formData = await request.formData();
    const files = formData.getAll('files') as File[];
    const uploadType = (formData.get('type') as string) || 'general';

    if (!files || files.length === 0) {
      return createErrorResponse('No files provided', 400, 'NO_FILES');
    }

    // Get context-specific configuration
    const allowedTypes = CONTEXT_ALLOWED_TYPES[uploadType] || CONTEXT_ALLOWED_TYPES.general;
    const maxFileSize = CONTEXT_SIZE_LIMITS[uploadType] || CONTEXT_SIZE_LIMITS.general;

    // Ensure upload directory exists
    if (!existsSync(UPLOAD_DIR)) {
      await mkdir(UPLOAD_DIR, { recursive: true });
    }

    // Create subdirectory based on upload type and date
    const today = new Date().toISOString().split('T')[0];
    const subDir = path.join(UPLOAD_DIR, uploadType, today);
    if (!existsSync(subDir)) {
      await mkdir(subDir, { recursive: true });
    }

    const uploadedFiles = [];
    const failedFiles = [];

    for (const file of files) {
      try {
        // Validate file size
        if (!validateFileSize(file.size, maxFileSize)) {
          failedFiles.push({
            originalName: file.name,
            error: `File exceeds maximum size of ${Math.round(maxFileSize / 1024 / 1024)}MB`
          });
          continue;
        }

        // Validate file type by extension and MIME type
        if (!validateFileType(file.name, allowedTypes.map(type => {
          const ext = type.split('/')[1];
          return ext === 'jpeg' ? 'jpg' : ext === 'vnd.openxmlformats-officedocument.wordprocessingml.document' ? 'docx' : ext;
        })) || !allowedTypes.includes(file.type)) {
          failedFiles.push({
            originalName: file.name,
            error: `File type ${file.type} is not allowed for ${uploadType} uploads`
          });
          continue;
        }

        // Convert file to buffer for content validation
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Validate content using magic bytes
        if (!validateMagicBytes(buffer, file.type)) {
          failedFiles.push({
            originalName: file.name,
            error: 'File content does not match declared type'
          });
          continue;
        }

        // Optional antivirus scanning
        const isClean = await scanForVirus(buffer, file.name);
        if (!isClean) {
          failedFiles.push({
            originalName: file.name,
            error: 'File failed security scan'
          });
          continue;
        }

        // Generate secure filename
        const secureFileName = generateSecureFilename(file.name);
        const filePath = path.join(subDir, secureFileName);

        // Save file
        await writeFile(filePath, buffer);

        // Generate file hash for integrity
        const fileHash = crypto.createHash('sha256').update(buffer).digest('hex');

        // Generate public URL
        const publicUrl = `/uploads/${uploadType}/${today}/${secureFileName}`;

        // Store file metadata (in production, save to database)
        const fileMetadata = {
          originalName: file.name,
          fileName: secureFileName,
          fileUrl: publicUrl,
          fileSize: file.size,
          fileType: file.type,
          fileHash,
          uploadedAt: new Date().toISOString(),
          uploadedBy: user.userId,
          uploadContext: uploadType,
          clientIP: getClientIP(request),
          userAgent: getUserAgent(request)
        };

        uploadedFiles.push(fileMetadata);

        // Log successful upload
        console.log(`[UPLOAD_SUCCESS] User ${user.email} uploaded ${file.name} (${file.size} bytes)`);

      } catch (fileError) {
        logApiError(fileError as Error, {
          path: '/api/upload',
          userId: user.userId,
          userRole: user.role
        });

        failedFiles.push({
          originalName: file.name,
          error: 'Failed to process file'
        });
      }
    }

    // Prepare response
    const responseData = {
      uploadedFiles,
      failedFiles,
      summary: {
        total: files.length,
        successful: uploadedFiles.length,
        failed: failedFiles.length
      }
    };

    const status = failedFiles.length === 0 ? 200 : 207; // 207 Multi-Status for partial success
    const message = failedFiles.length === 0 
      ? `Successfully uploaded ${uploadedFiles.length} file(s)`
      : `Uploaded ${uploadedFiles.length} file(s), ${failedFiles.length} failed`;

    const response = createSuccessResponse(responseData, status, message);
    return addSecurityHeaders(response);

  } catch (error) {
    logApiError(error as Error, {
      path: '/api/upload',
      ip: getClientIP(request),
      userAgent: getUserAgent(request)
    });

    return createErrorResponse(
      'File upload service error',
      500,
      'UPLOAD_SERVICE_ERROR',
      process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Rate limiting for delete operations
    const rateLimitResult = checkRateLimit(request, {
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 50, // 50 deletes per IP per 15 minutes
      keyGenerator: (req) => `delete:${getClientIP(req)}`
    });

    if (!rateLimitResult.allowed) {
      return createErrorResponse(
        'Too many delete attempts. Please try again later.',
        429,
        'RATE_LIMIT_EXCEEDED'
      );
    }

    const user = await verifyAuth(request);
    if (!user) {
      return createErrorResponse('Unauthorized', 401, 'AUTH_REQUIRED');
    }

    const { searchParams } = new URL(request.url);
    const fileUrl = searchParams.get('fileUrl');

    if (!fileUrl) {
      return createErrorResponse('File URL is required', 400, 'MISSING_FILE_URL');
    }

    // Normalize delete path to prevent path traversal
    const root = path.join(process.cwd(), 'public', 'uploads');
    const sanitizedUrl = fileUrl.replace(/^\/+/, '').replace(/\.\./g, ''); // Remove leading slashes and ..
    const resolved = path.resolve(root, sanitizedUrl);

    // Ensure the resolved path is within the uploads directory
    if (!resolved.startsWith(root)) {
      logApiError(new Error('Path traversal attempt detected'), {
        path: '/api/upload',
        userId: user.userId,
        userRole: user.role,
        details: { fileUrl, resolved, root }
      });

      return createErrorResponse(
        'Invalid file path',
        400,
        'INVALID_PATH'
      );
    }

    // Check if file exists and delete it
    if (existsSync(resolved)) {
      await unlink(resolved);
      
      console.log(`[DELETE_SUCCESS] User ${user.email} deleted file: ${fileUrl}`);
      
      const response = createSuccessResponse(
        { deletedFile: fileUrl },
        200,
        'File deleted successfully'
      );
      return addSecurityHeaders(response);
    } else {
      return createErrorResponse('File not found', 404, 'FILE_NOT_FOUND');
    }

  } catch (error) {
    logApiError(error as Error, {
      path: '/api/upload',
      ip: getClientIP(request),
      userAgent: getUserAgent(request)
    });

    return createErrorResponse(
      'File deletion service error',
      500,
      'DELETE_SERVICE_ERROR',
      process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    );
  }
}

// Handle OPTIONS request for CORS preflight
export async function OPTIONS(request: NextRequest) {
  const response = createSuccessResponse(null, 200);
  return addSecurityHeaders(response);
}
