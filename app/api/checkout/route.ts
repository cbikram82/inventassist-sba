import { NextResponse } from 'next/server';
import { createCheckoutTask, getCheckoutTask } from '@/app/actions';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    // Get the authorization header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Extract the token
    const token = authHeader.split(' ')[1];
    if (!token) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Get the user from the token
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { eventName, type } = await request.json();
    
    // Create checkout task
    const task = await createCheckoutTask(eventName, type, user.id);
    
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