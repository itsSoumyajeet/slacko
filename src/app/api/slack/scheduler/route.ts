import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    // Get all pending scheduled messages that are due to be sent
    const now = new Date();
    const dueMessages = await db.scheduledMessage.findMany({
      where: {
        status: 'PENDING',
        scheduledFor: {
          lte: now,
        },
      },
      include: {
        workspace: {
          include: {
            tokens: true,
          },
        },
      },
    });

    if (dueMessages.length === 0) {
      return NextResponse.json({ message: 'No messages due for sending' });
    }

    const results: Array<{
      messageId: string;
      status: string;
      slackTs?: string;
      error?: string;
    }> = [];

    for (const message of dueMessages) {
      try {
        const workspace = message.workspace;
        
        if (!workspace.tokens.length) {
          throw new Error('No tokens available for workspace');
        }

        const token = workspace.tokens[0];
        
        // Check if token needs refresh
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
            body: JSON.stringify({ workspaceId: workspace.id }),
          });
          
          if (refreshResponse.ok) {
            const refreshData = await refreshResponse.json();
            accessToken = refreshData.accessToken;
          }
        }

        // Send the message to Slack
        const messageResponse = await fetch('https://slack.com/api/chat.postMessage', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            channel: message.channelId,
            text: message.message,
          }),
        });

        const messageData = await messageResponse.json();

        if (!messageData.ok) {
          throw new Error(messageData.error || 'Failed to send message');
        }

        // Update message status to SENT
        const updatedMessage = await db.scheduledMessage.update({
          where: { id: message.id },
          data: {
            status: 'SENT',
            sentAt: now,
          },
        });

        results.push({
          messageId: message.id,
          status: 'SENT',
          slackTs: messageData.ts,
        });

      } catch (error) {
        console.error(`Failed to send scheduled message ${message.id}:`, error);
        
        // Update message status to FAILED
        await db.scheduledMessage.update({
          where: { id: message.id },
          data: {
            status: 'FAILED',
            sentAt: now,
          },
        });

        results.push({
          messageId: message.id,
          status: 'FAILED',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return NextResponse.json({
      message: `Processed ${dueMessages.length} scheduled messages`,
      results,
    });

  } catch (error) {
    console.error('Scheduler error:', error);
    return NextResponse.json(
      { error: 'Failed to process scheduled messages' },
      { status: 500 }
    );
  }
}

// GET endpoint to check scheduler status
export async function GET(request: NextRequest) {
  try {
    const now = new Date();
    
    // Get count of pending messages
    const pendingCount = await db.scheduledMessage.count({
      where: {
        status: 'PENDING',
        scheduledFor: {
          gt: now,
        },
      },
    });

    // Get count of due messages
    const dueCount = await db.scheduledMessage.count({
      where: {
        status: 'PENDING',
        scheduledFor: {
          lte: now,
        },
      },
    });

    // Get recent activity
    const recentMessages = await db.scheduledMessage.findMany({
      where: {
        status: {
          in: ['SENT', 'FAILED'],
        },
        sentAt: {
          gte: new Date(now.getTime() - 24 * 60 * 60 * 1000), // Last 24 hours
        },
      },
      orderBy: {
        sentAt: 'desc',
      },
      take: 10,
      select: {
        id: true,
        status: true,
        sentAt: true,
        workspace: {
          select: {
            teamName: true,
          },
        },
      },
    });

    return NextResponse.json({
      pendingCount,
      dueCount,
      recentActivity: recentMessages,
      lastChecked: now,
    });

  } catch (error) {
    console.error('Scheduler status error:', error);
    return NextResponse.json(
      { error: 'Failed to get scheduler status' },
      { status: 500 }
    );
  }
}