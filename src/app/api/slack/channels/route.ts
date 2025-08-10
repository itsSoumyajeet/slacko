import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get('workspaceId');
    
    if (!workspaceId) {
      return NextResponse.json({ error: 'Workspace ID is required' }, { status: 400 });
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
    
    // Get channels from Slack
    const channelsResponse = await fetch('https://slack.com/api/conversations.list?types=public_channel,private_channel,mpim,im', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });
    
    const channelsData = await channelsResponse.json();
    console.log('Slack channels response:', { ok: channelsData.ok, channelsCount: channelsData.channels?.length || 0 });
    
    if (!channelsData.ok) {
      throw new Error(channelsData.error || 'Failed to get channels');
    }
    
    // Log the first few channels for debugging
    const firstFewChannels = channelsData.channels.slice(0, 5);
    console.log('First few channels:', firstFewChannels.map((c: any) => ({ id: c.id, name: c.name, is_im: c.is_im, is_member: c.is_member })));
    
    // Filter and format channels
    const channels = channelsData.channels
      .filter((channel: any) => channel.is_member || channel.is_im)
      .map((channel: any) => ({
        id: channel.id,
        name: channel.name || channel.user,
        is_channel: channel.is_channel,
        is_group: channel.is_group,
        is_im: channel.is_im,
        is_mpim: channel.is_mpim,
        is_private: channel.is_private,
        is_member: channel.is_member,
      }));
    
    return NextResponse.json(channels);
    
  } catch (error) {
    console.error('Get channels error:', error);
    return NextResponse.json(
      { error: 'Failed to get channels' },
      { status: 500 }
    );
  }
}