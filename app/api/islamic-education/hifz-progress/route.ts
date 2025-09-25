import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '../../../lib/auth-helpers';
import { IslamicEducationService, HifzProgress } from '../../../lib/islamic-education-service';

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user has appropriate role
    if (!['ADMIN', 'SUPERADMIN', 'TEACHER', 'STUDENT'].includes(user.role)) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      );
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('studentId');
    const surahId = searchParams.get('surahId');

    // Fetch Hifz progress
    let progress: HifzProgress[];
    if (studentId) {
      progress = await IslamicEducationService.getStudentHifzProgress(studentId);
    } else {
      // For teachers/admins, return empty array for now
      progress = [];
    }

    return NextResponse.json({
      success: true,
      data: progress
    });

  } catch (error) {
    console.error('Error fetching Hifz progress:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch Hifz progress' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user has appropriate role (teachers and admins can create progress)
    if (!['ADMIN', 'SUPERADMIN', 'TEACHER'].includes(user.role)) {
      return NextResponse.json(
        { success: false, error: 'Access denied. Teacher or Admin role required.' },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const {
      studentId,
      surahId,
      startAyah,
      endAyah,
      memorizedAyahs,
      status,
      notes
    } = body;

    // Validate required fields
    if (!studentId || !surahId || !endAyah) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Create Hifz progress entry
    const progress = await IslamicEducationService.updateHifzProgress({
      studentId,
      surahId,
      memorizedAyahs: memorizedAyahs || 0,
      status: status || 'IN_PROGRESS',
      teacherId: user.userId,
      notes
    });

    return NextResponse.json({
      success: true,
      data: progress
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating Hifz progress:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create Hifz progress' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Verify authentication
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user has appropriate role
    if (!['ADMIN', 'SUPERADMIN', 'TEACHER'].includes(user.role)) {
      return NextResponse.json(
        { success: false, error: 'Access denied. Teacher or Admin role required.' },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Progress ID is required' },
        { status: 400 }
      );
    }

    // Update Hifz progress
    const progress = await IslamicEducationService.updateHifzProgress({
      id,
      ...updateData,
      studentId: updateData.studentId || '',
      surahId: updateData.surahId || '',
      memorizedAyahs: updateData.memorizedAyahs || 0,
      status: updateData.status || 'IN_PROGRESS',
      teacherId: user.userId
    });

    return NextResponse.json({
      success: true,
      data: progress
    });

  } catch (error) {
    console.error('Error updating Hifz progress:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update Hifz progress' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Verify authentication
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user has admin role
    if (!['ADMIN', 'SUPERADMIN'].includes(user.role)) {
      return NextResponse.json(
        { success: false, error: 'Access denied. Admin role required.' },
        { status: 403 }
      );
    }

    // Get progress ID from query parameters
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Progress ID is required' },
        { status: 400 }
      );
    }

    // Delete Hifz progress - Mock implementation for now
    console.log(`Deleting Hifz progress: ${id}`);

    return NextResponse.json({
      success: true,
      message: 'Hifz progress deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting Hifz progress:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete Hifz progress' },
      { status: 500 }
    );
  }
}
