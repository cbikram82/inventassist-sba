import { NextResponse } from 'next/server';
import { createCheckoutTask, getCheckoutTask } from '@/app/actions';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { eventName, type } = await request.json();
    
    // Create checkout task
    const task = await createCheckoutTask(eventName, type, session.user.id);
    
    // Get task with items
    const taskWithItems = await getCheckoutTask(task.id);
    
    return NextResponse.json(taskWithItems);
  } catch (error) {
    console.error('Error creating checkout task:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout task' },
      { status: 500 }
    );
  }
} 