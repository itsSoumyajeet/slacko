import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  
  if (!userId) {
    return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
  }

  const clientId = process.env.SLACK_CLIENT_ID;
  const redirectUri = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/slack/callback`;
  
  if (!clientId) {
    console.error('Slack client ID not configured');
    return NextResponse.json({ 
      error: 'Slack client ID not configured',
      debug: {
        clientId: process.env.SLACK_CLIENT_ID,
        clientSecret: process.env.SLACK_CLIENT_SECRET ? '***' : null,
        baseUrl: process.env.NEXT_PUBLIC_BASE_URL
      }
    }, { status: 500 });
  }

  const scope = 'chat:write,channels:read,groups:read,im:read,mpim:read';
  const state = `${userId}_${Math.random().toString(36).substring(7)}`;
  
  const authUrl = `https://slack.com/oauth/v2/authorize?` +
    `client_id=${clientId}&` +
    `redirect_uri=${encodeURIComponent(redirectUri)}&` +
    `scope=${scope}&` +
    `state=${state}`;

  console.log('OAuth URL:', authUrl);

  const response = NextResponse.redirect(authUrl);
  
  // Store state in cookie for verification
  response.cookies.set('slack_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600 // 10 minutes
  });
  
  return response;
}