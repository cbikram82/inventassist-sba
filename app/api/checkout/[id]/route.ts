import { NextResponse } from 'next/server';
import { updateCheckoutItem, completeCheckoutTask } from '@/app/actions';
import { supabase } from '@/lib/supabase';

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Get the session from the request headers
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { itemId, actualQuantity, status, reason } = await request.json();
    
    // Update checkout item
    const updatedItem = await updateCheckoutItem(
      itemId,
      actualQuantity,
      status,
      user.id,
      reason
    );
    
    return NextResponse.json(updatedItem);
  } catch (error) {
    console.error('Error updating checkout item:', error);
    return NextResponse.json(
      { error: 'Failed to update checkout item' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Get the session from the request headers
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Complete checkout task
    await completeCheckoutTask(params.id);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error completing checkout task:', error);
    return NextResponse.json(
      { error: 'Failed to complete checkout task' },
      { status: 500 }
    );
  }
} 