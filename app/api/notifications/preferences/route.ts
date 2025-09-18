import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '../../../lib/auth-helpers';
import { PrismaClient, NotificationType, NotificationChannel } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's notification preferences
    const preferences = await prisma.notificationPreference.findMany({
      where: { userId: user.userId },
      orderBy: { type: 'asc' }
    });

    // If no preferences exist, create default ones
    if (preferences.length === 0) {
      const defaultPreferences = await createDefaultPreferences(user.userId);
      return NextResponse.json({ success: true, data: defaultPreferences });
    }

    return NextResponse.json({ success: true, data: preferences });

  } catch (error) {
    console.error('[PREFERENCES_GET_ERROR]', error);
    return NextResponse.json({ error: 'Failed to fetch preferences' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { preferences } = body;

    if (!Array.isArray(preferences)) {
      return NextResponse.json({ 
        error: 'Preferences must be an array' 
      }, { status: 400 });
    }

    // Validate and update preferences
    const updatedPreferences = [];

    for (const pref of preferences) {
      const { type, channels, isEnabled } = pref;

      if (!type || !Object.values(NotificationType).includes(type)) {
        continue; // Skip invalid types
      }

      // Validate channels
      const validChannels = channels?.filter((channel: string) => 
        Object.values(NotificationChannel).includes(channel as NotificationChannel)
      ) || [];

      const updatedPref = await prisma.notificationPreference.upsert({
        where: {
          userId_type: {
            userId: user.userId,
            type: type as NotificationType
          }
        },
        update: {
          channels: validChannels as NotificationChannel[],
          isEnabled: isEnabled !== false // Default to true if not specified
        },
        create: {
          userId: user.userId,
          type: type as NotificationType,
          channels: validChannels as NotificationChannel[],
          isEnabled: isEnabled !== false
        }
      });

      updatedPreferences.push(updatedPref);
    }

    return NextResponse.json({ 
      success: true, 
      data: updatedPreferences,
      message: 'Preferences updated successfully'
    });

  } catch (error) {
    console.error('[PREFERENCES_POST_ERROR]', error);
    return NextResponse.json({ error: 'Failed to update preferences' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { type, channels, isEnabled } = body;

    if (!type || !Object.values(NotificationType).includes(type)) {
      return NextResponse.json({ 
        error: 'Invalid notification type' 
      }, { status: 400 });
    }

    // Validate channels
    const validChannels = channels?.filter((channel: string) => 
      Object.values(NotificationChannel).includes(channel as NotificationChannel)
    ) || [];

    const preference = await prisma.notificationPreference.upsert({
      where: {
        userId_type: {
          userId: user.userId,
          type: type as NotificationType
        }
      },
      update: {
        channels: validChannels as NotificationChannel[],
        isEnabled: isEnabled !== false
      },
      create: {
        userId: user.userId,
        type: type as NotificationType,
        channels: validChannels as NotificationChannel[],
        isEnabled: isEnabled !== false
      }
    });

    return NextResponse.json({ 
      success: true, 
      data: preference,
      message: 'Preference updated successfully'
    });

  } catch (error) {
    console.error('[PREFERENCE_PUT_ERROR]', error);
    return NextResponse.json({ error: 'Failed to update preference' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');

    if (!type || !Object.values(NotificationType).includes(type as NotificationType)) {
      return NextResponse.json({ 
        error: 'Invalid notification type' 
      }, { status: 400 });
    }

    await prisma.notificationPreference.delete({
      where: {
        userId_type: {
          userId: user.userId,
          type: type as NotificationType
        }
      }
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Preference deleted successfully'
    });

  } catch (error) {
    console.error('[PREFERENCE_DELETE_ERROR]', error);
    return NextResponse.json({ error: 'Failed to delete preference' }, { status: 500 });
  }
}

// Helper function to create default preferences for new users
async function createDefaultPreferences(userId: string) {
  const defaultPreferences = [
    {
      type: NotificationType.SYSTEM,
      channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
      isEnabled: true
    },
    {
      type: NotificationType.ACADEMIC,
      channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL, NotificationChannel.PUSH],
      isEnabled: true
    },
    {
      type: NotificationType.FINANCIAL,
      channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL, NotificationChannel.SMS],
      isEnabled: true
    },
    {
      type: NotificationType.ATTENDANCE,
      channels: [NotificationChannel.IN_APP, NotificationChannel.PUSH],
      isEnabled: true
    },
    {
      type: NotificationType.EXAM,
      channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL, NotificationChannel.PUSH, NotificationChannel.SMS],
      isEnabled: true
    },
    {
      type: NotificationType.ANNOUNCEMENT,
      channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
      isEnabled: true
    },
    {
      type: NotificationType.REMINDER,
      channels: [NotificationChannel.IN_APP, NotificationChannel.PUSH],
      isEnabled: true
    }
  ];

  const createdPreferences = [];

  for (const pref of defaultPreferences) {
    const created = await prisma.notificationPreference.create({
      data: {
        userId,
        type: pref.type,
        channels: pref.channels,
        isEnabled: pref.isEnabled
      }
    });
    createdPreferences.push(created);
  }

  return createdPreferences;
}
