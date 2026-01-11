import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Broker domains to search for
const BROKER_DOMAINS = [
  'brac.net',
  'bracbank.com',
  'idlc.com',
  'lrbdl.com',
  'citybank.com',
  'mtbsecurities.com',
  'bracbankbd.com'
];

// Keywords for portfolio statements
const SUBJECT_KEYWORDS = ['portfolio', 'statement', 'holdings', 'BO Statement', 'Account Statement'];

async function refreshTokenIfNeeded(
  connection: any,
  supabase: any,
  googleClientId: string,
  googleClientSecret: string
): Promise<string> {
  const expiresAt = new Date(connection.token_expires_at);
  const now = new Date();
  
  // If token expires in less than 5 minutes, refresh it
  if (expiresAt.getTime() - now.getTime() < 5 * 60 * 1000) {
    console.log('Token expired or expiring soon, refreshing...');
    
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: googleClientId,
        client_secret: googleClientSecret,
        refresh_token: connection.refresh_token,
        grant_type: 'refresh_token',
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to refresh token');
    }

    const tokens = await response.json();
    const newExpiresAt = new Date(Date.now() + tokens.expires_in * 1000);

    // Update tokens in database
    await supabase
      .from('gmail_connections')
      .update({
        access_token: tokens.access_token,
        token_expires_at: newExpiresAt.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', connection.id);

    console.log('Token refreshed successfully');
    return tokens.access_token;
  }

  return connection.access_token;
}

async function searchEmails(accessToken: string, daysBack: number = 30): Promise<any[]> {
  // Build search query
  const fromQueries = BROKER_DOMAINS.map(d => `from:${d}`).join(' OR ');
  const subjectQueries = SUBJECT_KEYWORDS.map(k => `subject:"${k}"`).join(' OR ');
  const afterDate = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000);
  const afterStr = `${afterDate.getFullYear()}/${afterDate.getMonth() + 1}/${afterDate.getDate()}`;
  
  const query = `(${fromQueries}) (${subjectQueries}) after:${afterStr} has:attachment`;
  console.log('Gmail search query:', query);

  const response = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}&maxResults=20`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Gmail search failed:', errorText);
    throw new Error('Failed to search emails');
  }

  const data = await response.json();
  return data.messages || [];
}

async function getEmailDetails(accessToken: string, messageId: string): Promise<any> {
  const response = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=full`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!response.ok) {
    throw new Error(`Failed to get email ${messageId}`);
  }

  return response.json();
}

async function getAttachment(accessToken: string, messageId: string, attachmentId: string): Promise<string> {
  const response = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/attachments/${attachmentId}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!response.ok) {
    throw new Error('Failed to get attachment');
  }

  const data = await response.json();
  return data.data; // base64 encoded
}

function getHeader(headers: any[], name: string): string {
  const header = headers.find((h: any) => h.name.toLowerCase() === name.toLowerCase());
  return header?.value || '';
}

function findPdfAttachments(parts: any[], attachments: any[] = []): any[] {
  for (const part of parts) {
    if (part.filename && part.filename.toLowerCase().endsWith('.pdf') && part.body?.attachmentId) {
      attachments.push({
        filename: part.filename,
        attachmentId: part.body.attachmentId,
        mimeType: part.mimeType,
      });
    }
    if (part.parts) {
      findPdfAttachments(part.parts, attachments);
    }
  }
  return attachments;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const googleClientId = Deno.env.get('GOOGLE_CLIENT_ID')!;
    const googleClientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET')!;

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

    // Parse request body for options
    let daysBack = 30;
    let parseEmails = false;
    try {
      const body = await req.json();
      daysBack = body.daysBack || 30;
      parseEmails = body.parseEmails || false;
    } catch (e) {
      // No body or invalid JSON, use defaults
    }

    // Get user's Gmail connection
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data: connection, error: connError } = await supabase
      .from('gmail_connections')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    if (connError || !connection) {
      throw new Error('Gmail not connected. Please connect your Gmail account first.');
    }

    // Refresh token if needed
    const accessToken = await refreshTokenIfNeeded(connection, supabase, googleClientId, googleClientSecret);

    // Search for portfolio emails
    const messages = await searchEmails(accessToken, daysBack);
    console.log(`Found ${messages.length} potential portfolio emails`);

    // Get details for each message
    const emails: any[] = [];
    for (const msg of messages) {
      try {
        const details = await getEmailDetails(accessToken, msg.id);
        const headers = details.payload?.headers || [];
        
        const email = {
          id: msg.id,
          subject: getHeader(headers, 'Subject'),
          from: getHeader(headers, 'From'),
          date: getHeader(headers, 'Date'),
          attachments: findPdfAttachments(details.payload?.parts || []),
        };
        
        if (email.attachments.length > 0) {
          emails.push(email);
        }
      } catch (e) {
        console.error(`Error getting email ${msg.id}:`, e);
      }
    }

    console.log(`Found ${emails.length} emails with PDF attachments`);

    // Update last sync time
    await supabase
      .from('gmail_connections')
      .update({
        last_sync_at: new Date().toISOString(),
        emails_fetched: (connection.emails_fetched || 0) + emails.length,
      })
      .eq('id', connection.id);

    // If parseEmails is true, fetch attachments and parse them
    let parsedResults: any[] = [];
    if (parseEmails && emails.length > 0) {
      for (const email of emails.slice(0, 5)) { // Limit to 5 emails to avoid timeout
        for (const attachment of email.attachments) {
          try {
            const attachmentData = await getAttachment(accessToken, email.id, attachment.attachmentId);
            
            // Convert base64url to standard base64
            const base64 = attachmentData.replace(/-/g, '+').replace(/_/g, '/');
            
            // Call parse-portfolio function with the PDF content
            const { data: parseResult, error: parseError } = await supabaseAuth.functions.invoke('parse-portfolio', {
              body: { 
                documentText: `[PDF Content from: ${attachment.filename}]\n${base64}`,
                documentType: 'pdf_base64'
              }
            });

            if (parseError) {
              console.error('Parse error:', parseError);
            } else if (parseResult) {
              parsedResults.push({
                emailId: email.id,
                filename: attachment.filename,
                subject: email.subject,
                date: email.date,
                result: parseResult
              });
            }
          } catch (e) {
            console.error(`Error parsing attachment ${attachment.filename}:`, e);
          }
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        emails, 
        count: emails.length,
        parsed: parsedResults,
        parsedCount: parsedResults.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Error in gmail-fetch-emails:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
