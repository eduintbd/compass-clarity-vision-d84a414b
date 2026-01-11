import { createClient } from "npm:@supabase/supabase-js@2";

Deno.serve(async (req) => {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const error = url.searchParams.get('error');

    // Get the app URL for redirects (use referrer or fallback)
    const appUrl = Deno.env.get('APP_URL') || 'https://aswejhthjhhawxetjyhz.lovableproject.com';

    if (error) {
      console.error('OAuth error:', error);
      return Response.redirect(`${appUrl}/settings?gmail_error=${encodeURIComponent(error)}`);
    }

    if (!code || !state) {
      return Response.redirect(`${appUrl}/settings?gmail_error=missing_params`);
    }

    // Decode state to get user_id
    let userId: string;
    try {
      const stateData = JSON.parse(atob(state));
      userId = stateData.userId;
    } catch (e) {
      console.error('Invalid state:', e);
      return Response.redirect(`${appUrl}/settings?gmail_error=invalid_state`);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const googleClientId = Deno.env.get('GOOGLE_CLIENT_ID')!;
    const googleClientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET')!;

    // Exchange code for tokens
    const redirectUri = `${supabaseUrl}/functions/v1/gmail-callback`;
    
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: googleClientId,
        client_secret: googleClientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Token exchange failed:', errorText);
      return Response.redirect(`${appUrl}/settings?gmail_error=token_exchange_failed`);
    }

    const tokens = await tokenResponse.json();
    console.log('Token exchange successful');

    // Get user's email from Google
    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });

    if (!userInfoResponse.ok) {
      console.error('Failed to get user info');
      return Response.redirect(`${appUrl}/settings?gmail_error=userinfo_failed`);
    }

    const userInfo = await userInfoResponse.json();
    console.log('Got user email:', userInfo.email);

    // Calculate token expiry
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

    // Store tokens in database using service role
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { error: upsertError } = await supabase
      .from('gmail_connections')
      .upsert({
        user_id: userId,
        email: userInfo.email,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_expires_at: expiresAt.toISOString(),
        is_active: true,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });

    if (upsertError) {
      console.error('Failed to store tokens:', upsertError);
      return Response.redirect(`${appUrl}/settings?gmail_error=storage_failed`);
    }

    console.log('Gmail connection saved for user:', userId);
    return Response.redirect(`${appUrl}/settings?gmail_success=true`);
  } catch (error) {
    console.error('Error in gmail-callback:', error);
    const appUrl = Deno.env.get('APP_URL') || 'https://aswejhthjhhawxetjyhz.lovableproject.com';
    return Response.redirect(`${appUrl}/settings?gmail_error=unknown`);
  }
});
