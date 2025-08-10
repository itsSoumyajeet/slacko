import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const clientId = process.env.SLACK_CLIENT_ID;
  const clientSecret = process.env.SLACK_CLIENT_SECRET;
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;

  return NextResponse.json({
    clientId: clientId ? '✓ Set' : '✗ Missing',
    clientSecret: clientSecret ? '✓ Set' : '✗ Missing',
    baseUrl: baseUrl || 'http://localhost:3000',
    note: 'Make sure to replace placeholder values with actual Slack app credentials'
  });
}