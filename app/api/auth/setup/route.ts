import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '@/app/lib/prisma';
import { integrationService } from '@/app/lib/integration-service';

interface SetupRequest {
  adminUser: {
    name: string;
    email: string;
    password: string;
    confirmPassword: string;
  };
  schoolInfo: {
    name: string;
    address: string;
    phone: string;
    email: string;
    website?: string;
    logo?: string;
  };
  academicYear: {
    name: string;
    startDate: string;
    endDate: string;
  };
  settings: {
    timezone: string;
    currency: string;
    language: string;
    dateFormat: string;
  };
  termsAccepted: boolean;
}

export async function GET() {
  try {
    // Check if system is already initialized
    const adminCount = await prisma.user.count({
      where: {
        role: 'ADMIN'
      }
    });

    const isInitialized = adminCount > 0;

    return NextResponse.json({
      success: true,
      isInitialized,
      message: isInitialized 
        ? 'System is already initialized' 
        : 'System is ready for initial setup'
    });
  } catch (error) {
    console.error('Setup check error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to check system status' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check if system is already initialized
    const adminCount = await prisma.user.count({
      where: {
        role: 'ADMIN'
      }
    });

    if (adminCount > 0) {
      return NextResponse.json(
        { success: false, error: 'System is already initialized' },
        { status: 400 }
      );
    }

    const body: SetupRequest = await request.json();

    // Validate required fields
    if (!body.adminUser || !body.schoolInfo || !body.academicYear || !body.settings) {
      return NextResponse.json(
        { success: false, error: 'Missing required setup information' },
        { status: 400 }
      );
    }

    // Validate admin user data
    const { name, email, password, confirmPassword } = body.adminUser;
    if (!name || !email || !password || !confirmPassword) {
      return NextResponse.json(
        { success: false, error: 'Missing admin user information' },
        { status: 400 }
      );
    }

    if (password !== confirmPassword) {
      return NextResponse.json(
        { success: false, error: 'Passwords do not match' },
        { status: 400 }
      );
    }

    // Validate password strength
    if (password.length < 8) {
      return NextResponse.json(
        { success: false, error: 'Password must be at least 8 characters long' },
        { status: 400 }
      );
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/;
    if (!passwordRegex.test(password)) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character' 
        },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return NextResponse.json(
        { success: false, error: 'Email already exists' },
        { status: 400 }
      );
    }

    // Validate terms acceptance
    if (!body.termsAccepted) {
      return NextResponse.json(
        { success: false, error: 'Terms and conditions must be accepted' },
        { status: 400 }
      );
    }

    // Validate academic year dates
    const startDate = new Date(body.academicYear.startDate);
    const endDate = new Date(body.academicYear.endDate);
    
    if (startDate >= endDate) {
      return NextResponse.json(
        { success: false, error: 'Academic year end date must be after start date' },
        { status: 400 }
      );
    }

    // Start database transaction
    const result = await prisma.$transaction(async (tx) => {
      // Hash password
      const hashedPassword = await bcrypt.hash(password, 12);

      // Create admin user
      const adminUser = await tx.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
          role: 'ADMIN',
        }
      });

      // Create academic year
      const academicYear = await tx.academicYear.create({
        data: {
          year: body.academicYear.name,
          startDate: startDate,
          endDate: endDate,
          isCurrent: true,
        }
      });

      // Create sample data structure
      await createSampleData(tx, academicYear.id);

      return { adminUser, academicYear };
    });

    // Generate JWT token
    const JWT_SECRET = process.env.JWT_SECRET;
    if (!JWT_SECRET) {
      throw new Error('JWT_SECRET is not configured');
    }

    const token = jwt.sign(
      {
        userId: result.adminUser.id,
        email: result.adminUser.email,
        role: result.adminUser.role,
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Send welcome email
    try {
      await integrationService.sendNotification({
        userId: result.adminUser.id,
        title: 'Welcome to EduPro Suite!',
        message: `Welcome ${name}! Your EduPro Suite system has been successfully set up. You can now start managing your educational institution.`,
        type: 'success',
        metadata: {
          setupDate: new Date().toISOString(),
          schoolName: body.schoolInfo.name,
        }
      });
    } catch (emailError) {
      console.error('Failed to send welcome notification:', emailError);
      // Don't fail the setup if email fails
    }

    // Log setup completion for audit trail (simplified for now)
    console.log('System setup completed:', {
      adminEmail: email,
      academicYear: body.academicYear.name,
      setupDate: new Date().toISOString(),
    });

    // Set auth cookie
    const response = NextResponse.json({
      success: true,
      message: 'System setup completed successfully',
      data: {
        user: {
          id: result.adminUser.id,
          name: result.adminUser.name,
          email: result.adminUser.email,
          role: result.adminUser.role,
        },
        academicYear: {
          id: result.academicYear.id,
          year: result.academicYear.year,
        },
        redirectUrl: '/admin',
      }
    });

    // Set secure HTTP-only cookie
    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: '/',
    });

    return response;

  } catch (error) {
    console.error('Setup error:', error);

    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Setup failed. Please try again.' 
      },
      { status: 500 }
    );
  }
}

async function createSampleData(tx: any, academicYearId: string) {
  try {
    // Create sample class levels
    const classLevels = [
      { name: 'Class 1' },
      { name: 'Class 2' },
      { name: 'Class 3' },
      { name: 'Class 4' },
      { name: 'Class 5' },
    ];

    for (const classLevel of classLevels) {
      await tx.classLevel.create({
        data: {
          name: classLevel.name,
        }
      });
    }

    // Create sample subjects
    const subjects = [
      { name: 'Mathematics', subjectCode: 'MATH' },
      { name: 'English', subjectCode: 'ENG' },
      { name: 'Science', subjectCode: 'SCI' },
      { name: 'Social Studies', subjectCode: 'SS' },
      { name: 'Islamic Studies', subjectCode: 'IS' },
      { name: 'Bengali', subjectCode: 'BN' },
      { name: 'Arabic', subjectCode: 'AR' },
    ];

    for (const subject of subjects) {
      await tx.subject.create({
        data: {
          name: subject.name,
          subjectCode: subject.subjectCode,
        }
      });
    }

    // Create sample fee heads
    const feeHeads = [
      { name: 'Tuition Fee', description: 'Monthly tuition fee' },
      { name: 'Admission Fee', description: 'One-time admission fee' },
      { name: 'Exam Fee', description: 'Examination fee' },
      { name: 'Library Fee', description: 'Library usage fee' },
      { name: 'Transport Fee', description: 'Transportation fee' },
    ];

    for (const feeHead of feeHeads) {
      await tx.feeHead.create({
        data: {
          name: feeHead.name,
          description: feeHead.description,
        }
      });
    }

    // Create sample notification templates
    const notificationTemplates = [
      {
        name: 'welcome_student',
        type: 'ACADEMIC',
        title: { en: 'Welcome to School', bn: 'স্কুলে স্বাগতম', ar: 'مرحبا بكم في المدرسة' },
        content: { en: 'Welcome to our school!', bn: 'আমাদের স্কুলে স্বাগতম!', ar: 'مرحبا بكم في مدرستنا!' },
        channels: ['IN_APP', 'EMAIL'],
      },
      {
        name: 'fee_reminder',
        type: 'FINANCIAL',
        title: { en: 'Fee Payment Reminder', bn: 'ফি পেমেন্ট রিমাইন্ডার', ar: 'تذكير دفع الرسوم' },
        content: { en: 'Your fee payment is due.', bn: 'আপনার ফি পেমেন্ট বকেয়া।', ar: 'دفع الرسوم مستحق.' },
        channels: ['EMAIL', 'SMS'],
      },
    ];

    for (const template of notificationTemplates) {
      await tx.notificationTemplate.create({
        data: template
      });
    }

    console.log('Sample data created successfully');
  } catch (error) {
    console.error('Error creating sample data:', error);
    // Don't throw error as sample data is not critical for setup
  }
}
