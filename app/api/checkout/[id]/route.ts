import { NextResponse } from 'next/server';
import { updateCheckoutItem, completeCheckoutTask } from '@/app/actions';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { itemId, actualQuantity, status, reason } = await request.json();
    
    // Update checkout item
    const updatedItem = await updateCheckoutItem(
      itemId,
      actualQuantity,
      status,
      session.user.id,
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
    const session = await getServerSession(authOptions);
    if (!session?.user) {
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