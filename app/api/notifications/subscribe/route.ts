import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '../../../lib/auth-helpers';
import { pushService } from '../../../lib/push-service';

export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { subscription, action } = body;

    if (action === 'subscribe') {
      if (!subscription || !subscription.endpoint || !subscription.keys) {
        return NextResponse.json({ 
          error: 'Invalid subscription data' 
        }, { status: 400 });
      }

      const success = await pushService.subscribe(user.userId, subscription);
      
      if (success) {
        return NextResponse.json({ 
          success: true, 
          message: 'Successfully subscribed to push notifications' 
        });
      } else {
        return NextResponse.json({ 
          error: 'Failed to subscribe to push notifications' 
        }, { status: 500 });
      }
    } 
    
    else if (action === 'unsubscribe') {
      const success = await pushService.unsubscribe(user.userId, subscription?.endpoint);
      
      if (success) {
        return NextResponse.json({ 
          success: true, 
          message: 'Successfully unsubscribed from push notifications' 
        });
      } else {
        return NextResponse.json({ 
          error: 'Failed to unsubscribe from push notifications' 
        }, { status: 500 });
      }
    }
    
    else {
      return NextResponse.json({ 
        error: 'Invalid action. Use "subscribe" or "unsubscribe"' 
      }, { status: 400 });
    }

  } catch (error) {
    console.error('[PUSH_SUBSCRIBE_ERROR]', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const subscriptions = await pushService.getUserSubscriptions(user.userId);
    
    return NextResponse.json({ 
      success: true, 
      data: subscriptions 
    });

  } catch (error) {
    console.error('[PUSH_SUBSCRIPTIONS_GET_ERROR]', error);
    return NextResponse.json({ 
      error: 'Failed to fetch subscriptions' 
    }, { status: 500 });
  }
}
