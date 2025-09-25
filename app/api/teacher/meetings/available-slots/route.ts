import { NextRequest } from 'next/server';
import { verifyAuth } from '@/app/lib/auth-helpers';
import { prisma } from '@/app/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user || user.role !== 'TEACHER') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const teacher = await prisma.staff.findFirst({
      where: { user: { email: user.email } }
    });

    if (!teacher) {
      return Response.json({ error: 'Teacher record not found' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    const duration = parseInt(searchParams.get('duration') || '30'); // minutes

    // Generate mock available slots for the next 7 days
    const availableSlots: any[] = [];
    const today = new Date();
    
    for (let i = 0; i < 7; i++) {
      const currentDate = new Date(today);
      currentDate.setDate(today.getDate() + i);
      
      // Skip weekends
      if (currentDate.getDay() === 0 || currentDate.getDay() === 6) {
        continue;
      }

      const dateStr = currentDate.toISOString().split('T')[0];
      
      // Generate time slots from 9 AM to 5 PM
      const timeSlots = [
        '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
        '14:00', '14:30', '15:00', '15:30', '16:00', '16:30'
      ];

      timeSlots.forEach(time => {
        // Randomly make some slots unavailable
        if (Math.random() > 0.3) {
          availableSlots.push({
            id: `slot_${dateStr}_${time}`,
            date: dateStr,
            time: time,
            duration: duration,
            endTime: addMinutes(time, duration),
            type: 'parent-meeting',
            location: 'Teacher\'s Office',
            isAvailable: true,
            maxParticipants: 2
          });
        }
      });
    }

    // Filter by specific date if provided
    const filteredSlots = date 
      ? availableSlots.filter(slot => slot.date === date)
      : availableSlots;

    return Response.json({
      success: true,
      availableSlots: filteredSlots,
      totalSlots: filteredSlots.length,
      teacher: {
        name: teacher.name,
        department: teacher.department,
        designation: teacher.designation
      }
    });

  } catch (error) {
    console.error('[TEACHER_AVAILABLE_SLOTS_ERROR]', error);
    return Response.json({ success: false, error: 'Failed to fetch available slots' }, { status: 500 });
  }
}

function addMinutes(time: string, minutes: number): string {
  const [hours, mins] = time.split(':').map(Number);
  const totalMinutes = hours * 60 + mins + minutes;
  const newHours = Math.floor(totalMinutes / 60);
  const newMins = totalMinutes % 60;
  return `${newHours.toString().padStart(2, '0')}:${newMins.toString().padStart(2, '0')}`;
}
