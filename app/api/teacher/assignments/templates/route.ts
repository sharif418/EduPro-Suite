import { NextRequest } from 'next/server';
import { verifyAuth } from '@/app/lib/auth-helpers';
import { prisma } from '@/app/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    // Verify authentication and role
    const user = await verifyAuth(request);
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'TEACHER') {
      return Response.json({ error: 'Forbidden - Teacher access required' }, { status: 403 });
    }

    // Find teacher's staff record
    const teacher = await prisma.staff.findFirst({
      where: {
        user: {
          email: user.email
        }
      }
    });

    if (!teacher) {
      return Response.json({ error: 'Teacher record not found' }, { status: 404 });
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const subjectId = searchParams.get('subjectId');
    const limit = parseInt(searchParams.get('limit') || '10');

    // For now, return mock templates since we don't have a templates table
    const mockTemplates = [
      {
        id: 'template_1',
        title: 'Math Problem Set',
        description: 'Standard mathematics problem solving assignment',
        subject: 'Mathematics',
        estimatedDuration: '2 hours',
        difficulty: 'Medium',
        instructions: 'Solve all problems showing your work clearly. Use proper mathematical notation.',
        maxMarks: 100,
        attachments: [],
        createdBy: teacher.name,
        usageCount: 15,
        lastUsed: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // 7 days ago
      },
      {
        id: 'template_2',
        title: 'Essay Writing Assignment',
        description: 'Structured essay writing with specific guidelines',
        subject: 'English',
        estimatedDuration: '3 hours',
        difficulty: 'Hard',
        instructions: 'Write a 1000-word essay on the given topic. Include introduction, body paragraphs, and conclusion.',
        maxMarks: 50,
        attachments: [],
        createdBy: teacher.name,
        usageCount: 8,
        lastUsed: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) // 3 days ago
      },
      {
        id: 'template_3',
        title: 'Science Lab Report',
        description: 'Laboratory experiment report template',
        subject: 'Science',
        estimatedDuration: '1.5 hours',
        difficulty: 'Medium',
        instructions: 'Document your experiment following the scientific method. Include hypothesis, procedure, observations, and conclusions.',
        maxMarks: 75,
        attachments: [
          {
            name: 'Lab Report Template.pdf',
            url: '/templates/lab-report-template.pdf',
            size: '245KB'
          }
        ],
        createdBy: teacher.name,
        usageCount: 12,
        lastUsed: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) // 1 day ago
      },
      {
        id: 'template_4',
        title: 'Quick Quiz Template',
        description: 'Short assessment with multiple choice and short answers',
        subject: 'General',
        estimatedDuration: '30 minutes',
        difficulty: 'Easy',
        instructions: 'Answer all questions. For multiple choice, select the best answer. For short answers, be concise.',
        maxMarks: 25,
        attachments: [],
        createdBy: teacher.name,
        usageCount: 25,
        lastUsed: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) // 2 days ago
      }
    ];

    // Filter by subject if specified
    let filteredTemplates = mockTemplates;
    if (subjectId) {
      // In a real implementation, you'd filter by actual subject ID
      filteredTemplates = mockTemplates.filter(template => 
        template.subject.toLowerCase().includes(subjectId.toLowerCase())
      );
    }

    // Limit results
    const templates = filteredTemplates.slice(0, limit);

    return Response.json({
      success: true,
      templates,
      total: filteredTemplates.length,
      message: templates.length === 0 ? 'No templates found' : undefined
    });

  } catch (error) {
    console.error('[TEACHER_ASSIGNMENT_TEMPLATES_ERROR]', error);
    return Response.json(
      { 
        success: false, 
        error: 'Failed to fetch assignment templates',
        details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
      }, 
      { status: 500 }
    );
  }
}

// POST endpoint to create a new template
export async function POST(request: NextRequest) {
  try {
    // Verify authentication and role
    const user = await verifyAuth(request);
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'TEACHER') {
      return Response.json({ error: 'Forbidden - Teacher access required' }, { status: 403 });
    }

    const body = await request.json();
    const { title, description, subject, instructions, maxMarks, difficulty, estimatedDuration } = body;

    // Validate required fields
    if (!title || !instructions) {
      return Response.json({ error: 'Title and instructions are required' }, { status: 400 });
    }

    // Find teacher's staff record
    const teacher = await prisma.staff.findFirst({
      where: {
        user: {
          email: user.email
        }
      }
    });

    if (!teacher) {
      return Response.json({ error: 'Teacher record not found' }, { status: 404 });
    }

    // Create new template (mock response for now)
    const newTemplate = {
      id: `template_${Date.now()}`,
      title,
      description: description || '',
      subject: subject || 'General',
      instructions,
      maxMarks: maxMarks || 100,
      difficulty: difficulty || 'Medium',
      estimatedDuration: estimatedDuration || '1 hour',
      attachments: [],
      createdBy: teacher.name,
      usageCount: 0,
      createdAt: new Date(),
      lastUsed: null
    };

    return Response.json({
      success: true,
      template: newTemplate,
      message: 'Assignment template created successfully'
    });

  } catch (error) {
    console.error('[TEACHER_CREATE_TEMPLATE_ERROR]', error);
    return Response.json(
      { 
        success: false, 
        error: 'Failed to create assignment template',
        details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
      }, 
      { status: 500 }
    );
  }
}
