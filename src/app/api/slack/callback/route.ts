import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');
  
  console.log('OAuth callback received:', { code: code ? 'present' : 'missing', state: state ? 'present' : 'missing', error });
  
  if (error) {
    console.error('OAuth error from Slack:', error);
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
    return NextResponse.redirect(new URL(`${baseUrl}/?error=${encodeURIComponent(error)}`, baseUrl));
  }
  
  if (!code || !state) {
    console.error('Missing required parameters:', { code, state });
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
    return NextResponse.redirect(new URL(`${baseUrl}/?error=missing_params`, baseUrl));
  }
  
  // Verify state from cookie
  const storedState = request.cookies.get('slack_oauth_state')?.value;
  console.log('State verification:', { storedState, receivedState: state, match: storedState === state });
  
  if (!storedState || storedState !== state) {
    console.error('State verification failed');
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://preview-chat-ecc23c12-0dcb-4950-bc2c-8ce71a637cca.space.z.ai';
    return NextResponse.redirect(new URL(`${baseUrl}/?error=invalid_state`, baseUrl));
  }
  
  // Extract user ID from state (format: userId_randomString)
  const userId = state.split('_')[0];
  console.log('Extracted user ID:', userId);
  
  const clientId = process.env.SLACK_CLIENT_ID;
  const clientSecret = process.env.SLACK_CLIENT_SECRET;
  const redirectUri = `${process.env.NEXT_PUBLIC_BASE_URL || 'https://preview-chat-ecc23c12-0dcb-4950-bc2c-8ce71a637cca.space.z.ai'}/api/slack/callback`;
  
  console.log('Environment check:', { 
    clientId: clientId ? 'present' : 'missing', 
    clientSecret: clientSecret ? 'present' : 'missing',
    redirectUri 
  });
  
  if (!clientId || !clientSecret) {
    console.error('Missing credentials');
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://preview-chat-ecc23c12-0dcb-4950-bc2c-8ce71a637cca.space.z.ai';
    return NextResponse.redirect(new URL(`${baseUrl}/?error=missing_credentials`, baseUrl));
  }
  
  try {
    console.log('Exchanging code for token...');
    // Exchange code for access token
    const tokenResponse = await fetch('https://slack.com/api/oauth.v2.access', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code: code,
        redirect_uri: redirectUri,
      }),
    });
    
    const tokenData = await tokenResponse.json();
    console.log('Token exchange response:', { 
      ok: tokenData.ok, 
      error: tokenData.error, 
      team: tokenData.team ? 'present' : 'missing',
      expires_in: tokenData.expires_in,
      access_token: tokenData.access_token ? 'present' : 'missing'
    });
    
    if (!tokenData.ok) {
      console.error('Token exchange failed:', tokenData);
      throw new Error(tokenData.error || 'Failed to exchange code for token');
    }
    
    console.log('Creating or finding user...');
    // Create or find the user first
    const user = await db.user.upsert({
      where: { id: userId },
      update: {},
      create: {
        id: userId,
        email: `user-${userId}@example.com`, // Generate a placeholder email
        name: `User ${userId}`,
      },
    });
    
    console.log('User created/found:', user.id);
    
    console.log('Storing workspace data...');
    // Store workspace and token information
    const workspace = await db.slackWorkspace.upsert({
      where: { teamId: tokenData.team.id },
      update: {
        teamName: tokenData.team.name,
        botUserId: tokenData.bot_user_id,
        botAccessToken: tokenData.access_token,
        scope: tokenData.scope,
      },
      create: {
        userId: userId,
        teamId: tokenData.team.id,
        teamName: tokenData.team.name,
        botUserId: tokenData.bot_user_id,
        botAccessToken: tokenData.access_token,
        scope: tokenData.scope,
      },
    });
    
    console.log('Workspace stored:', workspace.id);
    
    // Calculate expiration date (handle missing expires_in)
    let expiresAt;
    if (tokenData.expires_in && typeof tokenData.expires_in === 'number') {
      expiresAt = new Date(Date.now() + tokenData.expires_in * 1000);
    } else {
      // Default to 24 hours if expires_in is missing or invalid
      expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
      console.log('Using default expiration (24 hours) since expires_in is missing or invalid');
    }
    
    console.log('Token expiration date:', expiresAt);
    
    // Store the access token
    // First, check if a token already exists for this workspace
    const existingToken = await db.slackToken.findFirst({
      where: { workspaceId: workspace.id },
    });

    if (existingToken) {
      // Update existing token
      await db.slackToken.update({
        where: { id: existingToken.id },
        data: {
          accessToken: tokenData.access_token,
          refreshToken: tokenData.refresh_token || '',
          tokenType: tokenData.token_type || 'bot',
          expiresAt: expiresAt,
          scope: tokenData.scope,
        },
      });
    } else {
      // Create new token
      await db.slackToken.create({
        data: {
          workspaceId: workspace.id,
          accessToken: tokenData.access_token,
          refreshToken: tokenData.refresh_token || '',
          tokenType: tokenData.token_type || 'bot',
          expiresAt: expiresAt,
          scope: tokenData.scope,
        },
      });
    }
    
    console.log('Token stored successfully');
    
    // Clear the state cookie and redirect to success page
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://preview-chat-ecc23c12-0dcb-4950-bc2c-8ce71a637cca.space.z.ai';
    const response = NextResponse.redirect(new URL(`${baseUrl}/?success=true`, baseUrl));
    response.cookies.delete('slack_oauth_state');
    
    return response;
    
  } catch (error) {
    console.error('OAuth callback error:', error);
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://preview-chat-ecc23c12-0dcb-4950-bc2c-8ce71a637cca.space.z.ai';
    return NextResponse.redirect(new URL(`${baseUrl}/?error=oauth_failed`, baseUrl));
  }
}
