import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { workspaceId, channelId, message, scheduledFor } = await request.json();
    
    console.log('Received message request:', { 
      workspaceId, 
      channelId, 
      message: message ? 'present' : 'missing', 
      scheduledFor,
      fullMessage: message 
    });
    
    if (!workspaceId || !channelId || !message) {
      console.error('Missing required fields:', { workspaceId, channelId, message });
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    // Get the workspace with token
    const workspace = await db.slackWorkspace.findUnique({
      where: { id: workspaceId },
      include: { tokens: true }
    });
    
    if (!workspace || !workspace.tokens.length) {
      return NextResponse.json({ error: 'Workspace not found or no tokens available' }, { status: 404 });
    }
    
    const token = workspace.tokens[0];
    
    // Check if token needs refresh
    const now = new Date();
    const expiresAt = new Date(token.expiresAt);
    const timeUntilExpiry = expiresAt.getTime() - now.getTime();
    
    let accessToken = token.accessToken;
    
    if (timeUntilExpiry <= 5 * 60 * 1000) {
      // Token needs refresh
      const refreshResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/slack/tokens`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ workspaceId }),
      });
      
      if (refreshResponse.ok) {
        const refreshData = await refreshResponse.json();
        accessToken = refreshData.accessToken;
      }
    }
    
    if (scheduledFor) {
      // The frontend already converted the time to UTC ISO string
      const utcDate = new Date(scheduledFor);
      
      console.log('Backend received UTC time:', { 
        input: scheduledFor, 
        parsedTime: utcDate.toString(),
        isoTime: utcDate.toISOString()
      });
      
      // Schedule the message
      const scheduledMessage = await db.scheduledMessage.create({
        data: {
          userId: workspace.userId,
          workspaceId,
          channelId,
          message,
          scheduledFor: utcDate,
          status: 'PENDING',
        },
      });
      
      return NextResponse.json({
        id: scheduledMessage.id,
        message: 'Message scheduled successfully',
        scheduledFor: scheduledMessage.scheduledFor,
      });
    } else {
      // Send the message immediately
      console.log('Sending message to Slack:', { channelId, message, accessToken: accessToken ? 'present' : 'missing' });
      
      const messageResponse = await fetch('https://slack.com/api/chat.postMessage', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          channel: channelId,
          text: message,
        }),
      });
      
      const messageData = await messageResponse.json();
      console.log('Slack API response:', messageData);
      
      if (!messageData.ok) {
        console.error('Slack API error:', messageData);
        throw new Error(messageData.error || 'Failed to send message');
      }
      
      console.log('Message sent successfully:', messageData.ts);
      
      return NextResponse.json({
        id: messageData.ts,
        message: 'Message sent successfully',
        channel: channelId,
      });
    }
    
  } catch (error) {
    console.error('Send message error:', error);
    return NextResponse.json(
      { error: 'Failed to send message' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const workspaceId = searchParams.get('workspaceId');
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }
    
    const whereClause: any = { userId };
    if (workspaceId) {
      whereClause.workspaceId = workspaceId;
    }
    
    const scheduledMessages = await db.scheduledMessage.findMany({
      where: whereClause,
      include: {
        workspace: {
          select: {
            id: true,
            teamId: true,
            teamName: true,
          }
        }
      },
      orderBy: { scheduledFor: 'asc' }
    });
    
    return NextResponse.json(scheduledMessages);
    
  } catch (error) {
    console.error('Get scheduled messages error:', error);
    return NextResponse.json(
      { error: 'Failed to get scheduled messages' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const messageId = searchParams.get('messageId');
    
    if (!messageId) {
      return NextResponse.json({ error: 'Message ID is required' }, { status: 400 });
    }
    
    // Update message status to CANCELLED
    const updatedMessage = await db.scheduledMessage.update({
      where: { id: messageId },
      data: { status: 'CANCELLED' }
    });
    
    return NextResponse.json({ message: 'Scheduled message cancelled successfully' });
    
  } catch (error) {
    console.error('Cancel scheduled message error:', error);
    return NextResponse.json(
      { error: 'Failed to cancel scheduled message' },
      { status: 500 }
    );
  }
}