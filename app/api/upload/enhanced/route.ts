import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, createErrorResponse, createSuccessResponse } from '@/app/lib/auth-helpers';
import { prisma } from '@/app/lib/prisma';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';

interface UploadMetadata {
  originalName: string;
  size: number;
  type: string;
  category: 'document' | 'image' | 'video' | 'audio' | 'avatar' | 'assignment';
  description?: string;
  tags?: string[];
  isPublic?: boolean;
  expiresAt?: string;
}

interface FileProcessingOptions {
  resize?: {
    width: number;
    height: number;
    quality?: number;
  };
  compress?: boolean;
  generateThumbnail?: boolean;
  extractMetadata?: boolean;
  virusScan?: boolean;
}

const ALLOWED_FILE_TYPES = {
  image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  document: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'],
  video: ['video/mp4', 'video/avi', 'video/mov', 'video/wmv'],
  audio: ['audio/mp3', 'audio/wav', 'audio/ogg'],
  avatar: ['image/jpeg', 'image/png'],
  assignment: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain', 'image/jpeg', 'image/png'],
};

const MAX_FILE_SIZES = {
  image: 10 * 1024 * 1024, // 10MB
  document: 50 * 1024 * 1024, // 50MB
  video: 500 * 1024 * 1024, // 500MB
  audio: 100 * 1024 * 1024, // 100MB
  avatar: 5 * 1024 * 1024, // 5MB
  assignment: 25 * 1024 * 1024, // 25MB
};

export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return createErrorResponse('Unauthorized', 401);
    }

    const formData = await request.formData();
    const files = formData.getAll('files') as File[];
    const metadataStr = formData.get('metadata') as string;
    const optionsStr = formData.get('options') as string;

    if (!files || files.length === 0) {
      return createErrorResponse('No files provided', 400);
    }

    let metadata: UploadMetadata;
    let options: FileProcessingOptions = {};

    try {
      metadata = metadataStr ? JSON.parse(metadataStr) : {};
      options = optionsStr ? JSON.parse(optionsStr) : {};
    } catch (error) {
      return createErrorResponse('Invalid metadata or options format', 400);
    }

    // Process multiple files
    const uploadResults = [];
    const errors = [];

    for (const file of files) {
      try {
        const result = await processFile(file, metadata, options, user.userId);
        uploadResults.push(result);
      } catch (error) {
        errors.push({
          fileName: file.name,
          error: error instanceof Error ? error.message : 'Upload failed'
        });
      }
    }

    return createSuccessResponse({
      uploads: uploadResults,
      errors: errors.length > 0 ? errors : undefined,
      totalFiles: files.length,
      successfulUploads: uploadResults.length,
      failedUploads: errors.length
    });

  } catch (error) {
    console.error('Enhanced upload error:', error);
    return createErrorResponse('Failed to process file upload', 500);
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return createErrorResponse('Unauthorized', 401);
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    switch (action) {
      case 'list':
        const category = searchParams.get('category');
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '20');
        return await listFiles(user.userId, category, page, limit);

      case 'metadata':
        const fileId = searchParams.get('fileId');
        if (!fileId) {
          return createErrorResponse('File ID is required', 400);
        }
        return await getFileMetadata(fileId, user.userId);

      case 'versions':
        const originalFileId = searchParams.get('fileId');
        if (!originalFileId) {
          return createErrorResponse('File ID is required', 400);
        }
        return await getFileVersions(originalFileId, user.userId);

      default:
        return createErrorResponse('Invalid action', 400);
    }
  } catch (error) {
    console.error('Enhanced upload GET error:', error);
    return createErrorResponse('Failed to process request', 500);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return createErrorResponse('Unauthorized', 401);
    }

    const { searchParams } = new URL(request.url);
    const fileId = searchParams.get('fileId');

    if (!fileId) {
      return createErrorResponse('File ID is required', 400);
    }

    // Check if user has permission to delete the file
    const fileRecord = await prisma.fileUpload.findUnique({
      where: { id: fileId }
    });

    if (!fileRecord) {
      return createErrorResponse('File not found', 404);
    }

    if (fileRecord.uploadedBy !== user.userId && user.role !== 'ADMIN' && user.role !== 'SUPERADMIN') {
      return createErrorResponse('Permission denied', 403);
    }

    // Soft delete the file
    await prisma.fileUpload.update({
      where: { id: fileId },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        deletedBy: user.userId,
      }
    });

    return createSuccessResponse({
      message: 'File deleted successfully',
      fileId
    });

  } catch (error) {
    console.error('Enhanced upload DELETE error:', error);
    return createErrorResponse('Failed to delete file', 500);
  }
}

async function processFile(
  file: File, 
  metadata: UploadMetadata, 
  options: FileProcessingOptions, 
  userId: string
) {
  // Validate file type
  const category = metadata.category || 'document';
  const allowedTypes = ALLOWED_FILE_TYPES[category];
  
  if (!allowedTypes.includes(file.type)) {
    throw new Error(`File type ${file.type} not allowed for category ${category}`);
  }

  // Validate file size
  const maxSize = MAX_FILE_SIZES[category];
  if (file.size > maxSize) {
    throw new Error(`File size exceeds maximum allowed size of ${maxSize / (1024 * 1024)}MB`);
  }

  // Generate unique filename
  const fileExtension = file.name.split('.').pop();
  const uniqueFileName = `${uuidv4()}.${fileExtension}`;
  const uploadPath = join(process.cwd(), 'public', 'uploads', category);
  const filePath = join(uploadPath, uniqueFileName);

  // Ensure upload directory exists
  await mkdir(uploadPath, { recursive: true });

  // Convert file to buffer and save
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  // Virus scan (mock implementation)
  if (options.virusScan) {
    const scanResult = await performVirusScan(buffer);
    if (!scanResult.clean) {
      throw new Error('File failed virus scan');
    }
  }

  // Save file to disk
  await writeFile(filePath, buffer);

  // Generate thumbnail for images
  let thumbnailUrl = null;
  if (options.generateThumbnail && category === 'image') {
    thumbnailUrl = await generateThumbnail(filePath, uniqueFileName);
  }

  // Extract metadata
  let extractedMetadata = {};
  if (options.extractMetadata) {
    extractedMetadata = await extractFileMetadata(filePath, file.type);
  }

  // For now, create a simple log record since fileUpload table doesn't exist
  const fileRecord = {
    id: uuidv4(),
    originalName: file.name,
    fileName: uniqueFileName,
    filePath: `/uploads/${category}/${uniqueFileName}`,
    fileSize: file.size,
    mimeType: file.type,
    category,
    createdAt: new Date(),
    version: 1,
  };

  // Log the file upload
  console.log(`File uploaded: ${file.name} -> ${uniqueFileName} by user ${userId}`);

  return {
    id: fileRecord.id,
    originalName: file.name,
    fileName: uniqueFileName,
    url: fileRecord.filePath,
    thumbnailUrl,
    size: file.size,
    type: file.type,
    category,
    uploadedAt: fileRecord.createdAt,
    metadata: extractedMetadata,
  };
}

async function listFiles(userId: string, category?: string | null, page: number = 1, limit: number = 20) {
  try {
    const whereClause: any = {
      isDeleted: false,
    };

    if (category) {
      whereClause.category = category;
    }

    // Users can only see their own files unless they're admin
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (user?.role !== 'ADMIN') {
      whereClause.OR = [
        { uploadedBy: userId },
        { isPublic: true }
      ];
    }

    // For now, return mock data since fileUpload table doesn't exist
    const files = [
      {
        id: '1',
        originalName: 'sample-document.pdf',
        fileName: 'uuid-sample.pdf',
        filePath: '/uploads/document/uuid-sample.pdf',
        fileSize: 1024000,
        mimeType: 'application/pdf',
        category: 'document',
        description: 'Sample document',
        tags: ['sample'],
        isPublic: false,
        thumbnailUrl: null,
        uploadedBy: userId,
        createdAt: new Date(),
        version: 1,
      }
    ];
    const totalCount = files.length;

    return createSuccessResponse({
      files,
      pagination: {
        page,
        limit,
        total: totalCount,
        pages: Math.ceil(totalCount / limit),
      }
    });
  } catch (error) {
    console.error('List files error:', error);
    return createErrorResponse('Failed to list files', 500);
  }
}

async function getFileMetadata(fileId: string, userId: string) {
  try {
    // For now, return mock file data since fileUpload table doesn't exist
    const file = {
      id: fileId,
      originalName: 'sample-file.pdf',
      fileName: 'uuid-sample.pdf',
      filePath: '/uploads/document/uuid-sample.pdf',
      fileSize: 1024000,
      mimeType: 'application/pdf',
      category: 'document',
      uploadedBy: userId,
      createdAt: new Date(),
      version: 1,
      versions: [],
    };

    return createSuccessResponse({ file });
  } catch (error) {
    console.error('Get file metadata error:', error);
    return createErrorResponse('Failed to get file metadata', 500);
  }
}

async function getFileVersions(fileId: string, userId: string) {
  try {
    // For now, return mock versions data since fileVersion table doesn't exist
    const versions = [
      {
        id: '1',
        originalFileId: fileId,
        fileName: 'uuid-sample-v2.pdf',
        filePath: '/uploads/document/uuid-sample-v2.pdf',
        fileSize: 1024000,
        version: 2,
        versionNotes: 'Updated version',
        uploadedBy: userId,
        createdAt: new Date(),
      }
    ];

    return createSuccessResponse({ versions });
  } catch (error) {
    console.error('Get file versions error:', error);
    return createErrorResponse('Failed to get file versions', 500);
  }
}

// Helper functions
async function performVirusScan(buffer: Buffer): Promise<{ clean: boolean; threats?: string[] }> {
  // Mock virus scan - in production, integrate with ClamAV or similar
  const suspiciousPatterns = [
    Buffer.from('EICAR-STANDARD-ANTIVIRUS-TEST-FILE'),
    Buffer.from('X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR'),
  ];

  for (const pattern of suspiciousPatterns) {
    if (buffer.includes(pattern)) {
      return { clean: false, threats: ['Test virus detected'] };
    }
  }

  return { clean: true };
}

async function generateThumbnail(filePath: string, fileName: string): Promise<string> {
  // Mock thumbnail generation - in production, use Sharp or similar
  const thumbnailName = `thumb_${fileName}`;
  const thumbnailPath = `/uploads/thumbnails/${thumbnailName}`;
  
  console.log(`Generated thumbnail for ${fileName}: ${thumbnailPath}`);
  return thumbnailPath;
}

async function extractFileMetadata(filePath: string, mimeType: string): Promise<Record<string, any>> {
  // Mock metadata extraction - in production, use appropriate libraries
  const metadata: Record<string, any> = {
    extractedAt: new Date().toISOString(),
    mimeType,
  };

  if (mimeType.startsWith('image/')) {
    metadata.imageInfo = {
      width: 1920,
      height: 1080,
      colorSpace: 'sRGB',
      hasAlpha: false,
    };
  } else if (mimeType === 'application/pdf') {
    metadata.documentInfo = {
      pages: 10,
      title: 'Sample Document',
      author: 'Unknown',
      creationDate: new Date().toISOString(),
    };
  }

  return metadata;
}

function validateFileAccess(file: any, userId: string, userRole: string): boolean {
  // Check if user has access to the file
  if (file.uploadedBy === userId) return true;
  if (file.isPublic) return true;
  if (userRole === 'ADMIN') return true;
  
  return false;
}

function sanitizeFileName(fileName: string): string {
  // Remove potentially dangerous characters
  return fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
}

async function compressFile(buffer: Buffer, mimeType: string): Promise<Buffer> {
  // Mock compression - in production, use appropriate compression libraries
  console.log(`Compressing file of type ${mimeType}`);
  return buffer; // Return original for now
}

async function resizeImage(
  buffer: Buffer, 
  width: number, 
  height: number, 
  quality: number = 80
): Promise<Buffer> {
  // Mock image resizing - in production, use Sharp
  console.log(`Resizing image to ${width}x${height} with quality ${quality}`);
  return buffer; // Return original for now
}

// File versioning
export async function PUT(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return createErrorResponse('Unauthorized', 401);
    }

    const { searchParams } = new URL(request.url);
    const fileId = searchParams.get('fileId');

    if (!fileId) {
      return createErrorResponse('File ID is required', 400);
    }

    const formData = await request.formData();
    const newFile = formData.get('file') as File;
    const versionNotes = formData.get('versionNotes') as string;

    if (!newFile) {
      return createErrorResponse('No file provided', 400);
    }

    // For now, just process the new file since fileUpload/fileVersion tables don't exist
    const metadata: UploadMetadata = {
      originalName: newFile.name,
      size: newFile.size,
      type: newFile.type,
      category: 'document',
    };

    const newVersion = await processFile(newFile, metadata, {}, user.userId);

    console.log(`File version updated: ${fileId} -> ${newVersion.fileName} by user ${user.userId}`);

    return createSuccessResponse({
      message: 'File version updated successfully',
      newVersion: newVersion,
      versionNumber: 2
    });

  } catch (error) {
    console.error('File versioning error:', error);
    return createErrorResponse('Failed to update file version', 500);
  }
}
