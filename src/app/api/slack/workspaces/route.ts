import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }
    
    const workspaces = await db.slackWorkspace.findMany({
      where: { userId },
      include: {
        tokens: {
          select: {
            id: true,
            expiresAt: true,
            scope: true,
            createdAt: true,
          }
        },
        _count: {
          select: {
            scheduledMessages: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    return NextResponse.json(workspaces);
    
  } catch (error) {
    console.error('Get workspaces error:', error);
    return NextResponse.json(
      { error: 'Failed to get workspaces' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get('workspaceId');
    
    if (!workspaceId) {
      return NextResponse.json({ error: 'Workspace ID is required' }, { status: 400 });
    }
    
    // Delete the workspace and all related data (cascade delete)
    await db.slackWorkspace.delete({
      where: { id: workspaceId }
    });
    
    return NextResponse.json({ message: 'Workspace deleted successfully' });
    
  } catch (error) {
    console.error('Delete workspace error:', error);
    return NextResponse.json(
      { error: 'Failed to delete workspace' },
      { status: 500 }
    );
  }
}