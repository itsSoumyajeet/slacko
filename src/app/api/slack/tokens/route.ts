import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { workspaceId } = await request.json();
    
    if (!workspaceId) {
      return NextResponse.json({ error: 'Workspace ID is required' }, { status: 400 });
    }
    
    // Get the current token
    const token = await db.slackToken.findFirst({
      where: { workspaceId },
      include: { workspace: true }
    });
    
    if (!token) {
      return NextResponse.json({ error: 'Token not found' }, { status: 404 });
    }
    
    // Check if token needs refresh (expires within 5 minutes)
    const now = new Date();
    const expiresAt = new Date(token.expiresAt);
    const timeUntilExpiry = expiresAt.getTime() - now.getTime();
    
    if (timeUntilExpiry > 5 * 60 * 1000) {
      // Token is still valid, no need to refresh
      return NextResponse.json({ 
        message: 'Token is still valid',
        accessToken: token.accessToken,
        expiresAt: token.expiresAt
      });
    }
    
    // Refresh the token
    const clientId = process.env.SLACK_CLIENT_ID;
    const clientSecret = process.env.SLACK_CLIENT_SECRET;
    
    if (!clientId || !clientSecret) {
      return NextResponse.json({ error: 'Slack credentials not configured' }, { status: 500 });
    }
    
    const refreshResponse = await fetch('https://slack.com/api/oauth.v2.access', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'refresh_token',
        refresh_token: token.refreshToken,
      }),
    });
    
    const refreshData = await refreshResponse.json();
    
    if (!refreshData.ok) {
      throw new Error(refreshData.error || 'Failed to refresh token');
    }
    
    // Update the token in the database
    const updatedToken = await db.slackToken.update({
      where: { id: token.id },
      data: {
        accessToken: refreshData.access_token,
        refreshToken: refreshData.refresh_token || token.refreshToken,
        tokenType: refreshData.token_type,
        expiresAt: new Date(Date.now() + refreshData.expires_in * 1000),
        scope: refreshData.scope,
      },
    });
    
    return NextResponse.json({
      message: 'Token refreshed successfully',
      accessToken: updatedToken.accessToken,
      expiresAt: updatedToken.expiresAt
    });
    
  } catch (error) {
    console.error('Token refresh error:', error);
    return NextResponse.json(
      { error: 'Failed to refresh token' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get('workspaceId');
    
    if (!workspaceId) {
      return NextResponse.json({ error: 'Workspace ID is required' }, { status: 400 });
    }
    
    const token = await db.slackToken.findFirst({
      where: { workspaceId },
      include: { workspace: true }
    });
    
    if (!token) {
      return NextResponse.json({ error: 'Token not found' }, { status: 404 });
    }
    
    return NextResponse.json({
      id: token.id,
      workspaceId: token.workspaceId,
      workspace: {
        id: token.workspace.id,
        teamId: token.workspace.teamId,
        teamName: token.workspace.teamName,
      },
      expiresAt: token.expiresAt,
      scope: token.scope,
      createdAt: token.createdAt,
    });
    
  } catch (error) {
    console.error('Get token error:', error);
    return NextResponse.json(
      { error: 'Failed to get token' },
      { status: 500 }
    );
  }
}