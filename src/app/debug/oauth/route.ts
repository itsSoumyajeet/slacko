import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  
  if (!userId) {
    return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
  }

  const clientId = process.env.SLACK_CLIENT_ID;
  const redirectUri = `${process.env.NEXT_PUBLIC_BASE_URL || 'https://preview-chat-ecc23c12-0dcb-4950-bc2c-8ce71a637cca.space.z.ai'}/api/slack/callback`;
  
  if (!clientId) {
    return NextResponse.json({ error: 'Slack client ID not configured' }, { status: 500 });
  }

  const scope = 'chat:write,channels:read,groups:read,im:read,mpim:read';
  const state = `${userId}_${Math.random().toString(36).substring(7)}`;
  
  const authUrl = `https://slack.com/oauth/v2/authorize?` +
    `client_id=${clientId}&` +
    `redirect_uri=${encodeURIComponent(redirectUri)}&` +
    `scope=${scope}&` +
    `state=${state}`;

  return NextResponse.json({
    clientId: clientId ? '✓ Set' : '✗ Missing',
    redirectUri: redirectUri,
    fullAuthUrl: authUrl,
    note: 'Copy this exact redirect_uri to your Slack app configuration'
  });
}