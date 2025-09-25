import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '../../../../lib/auth-helpers';
import { OmrService } from '../../../../lib/omr-service';

export async function GET(request: NextRequest) {
  try {
    // Verify authentication and admin role
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (user.role !== 'ADMIN' && user.role !== 'SUPERADMIN') {
      return NextResponse.json(
        { success: false, error: 'Access denied. Admin role required.' },
        { status: 403 }
      );
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const examId = searchParams.get('examId');
    const isActive = searchParams.get('isActive');

    // Fetch OMR templates
    const templates = await OmrService.getTemplatesByExam(examId || '');

    return NextResponse.json({
      success: true,
      data: templates
    });

  } catch (error) {
    console.error('Error fetching OMR templates:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch OMR templates' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verify authentication and admin role
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (user.role !== 'ADMIN' && user.role !== 'SUPERADMIN') {
      return NextResponse.json(
        { success: false, error: 'Access denied. Admin role required.' },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const {
      name,
      description,
      examId,
      totalQuestions,
      questionsPerPage,
      answerKeyType,
      templateData
    } = body;

    // Validate required fields
    if (!name || !examId || !totalQuestions || !templateData) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Create OMR template
    const template = await OmrService.createTemplate({
      name,
      description,
      examId,
      totalQuestions,
      questionsPerPage: questionsPerPage || 50,
      answerKeyType: answerKeyType || 'ABCD',
      templateConfig: templateData,
      createdById: user.userId
    });

    return NextResponse.json({
      success: true,
      data: template
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating OMR template:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create OMR template' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Verify authentication and admin role
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (user.role !== 'ADMIN' && user.role !== 'SUPERADMIN') {
      return NextResponse.json(
        { success: false, error: 'Access denied. Admin role required.' },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Template ID is required' },
        { status: 400 }
      );
    }

    // Update OMR template - Mock implementation for now
    const template = {
      id,
      ...updateData,
      updatedAt: new Date()
    };

    return NextResponse.json({
      success: true,
      data: template
    });

  } catch (error) {
    console.error('Error updating OMR template:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update OMR template' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Verify authentication and admin role
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (user.role !== 'ADMIN' && user.role !== 'SUPERADMIN') {
      return NextResponse.json(
        { success: false, error: 'Access denied. Admin role required.' },
        { status: 403 }
      );
    }

    // Get template ID from query parameters
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Template ID is required' },
        { status: 400 }
      );
    }

    // Delete OMR template - Mock implementation for now
    console.log(`Deleting OMR template: ${id}`);

    return NextResponse.json({
      success: true,
      message: 'OMR template deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting OMR template:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete OMR template' },
      { status: 500 }
    );
  }
}
