import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the connection to revoke token
    const { data: connection } = await supabase
      .from('gmail_connections')
      .select('access_token')
      .eq('user_id', user.id)
      .single();

    if (connection?.access_token) {
      // Revoke the token at Google (best effort)
      try {
        await fetch(`https://oauth2.googleapis.com/revoke?token=${connection.access_token}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        });
        console.log('Token revoked at Google');
      } catch (e) {
        console.log('Token revocation failed (may already be revoked):', e);
      }
    }

    // Delete the connection from database
    const { error: deleteError } = await supabase
      .from('gmail_connections')
      .delete()
      .eq('user_id', user.id);

    if (deleteError) {
      throw new Error('Failed to delete Gmail connection');
    }

    console.log('Gmail connection deleted for user:', user.id);

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Error in gmail-disconnect:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
