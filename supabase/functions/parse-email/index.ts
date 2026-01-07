import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let emailContent: string;
    let forwardingKey: string;

    const contentType = req.headers.get("content-type") || "";

    // Handle JSON payloads
    if (contentType.includes("application/json")) {
      const payload = await req.json();
      
      console.log("Received webhook payload:", JSON.stringify(payload, null, 2));
      
      // Check if this is a Resend inbound webhook
      if (payload.type === "email.received" && payload.data) {
        const resendData = payload.data;
        const emailId = resendData.email_id;
        
        console.log("Resend webhook received, email_id:", emailId);
        
        // Extract forwarding key from the "to" address
        // Format: {forwarding_key}@mail.eduintbd.cloud (subdomain for inbound email)
        const toAddress = resendData.to?.[0] || "";
        const match = toAddress.match(/^([^@]+)@mail\.eduintbd\.cloud$/i);
        
        if (!match) {
          console.error("Invalid to address format:", toAddress);
          return new Response(
            JSON.stringify({ error: "Invalid recipient address", received: toAddress }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        
        forwardingKey = match[1];
        console.log("Extracted forwarding key:", forwardingKey);
        
        // For inbound emails, Resend includes the content in the webhook payload
        // Note: Resend inbound webhook has text/html directly in the data object
        const emailText = resendData.text || "";
        const emailHtml = resendData.html || "";
        const emailSubject = resendData.subject || "";
        const emailFrom = resendData.from || "";
        const attachments = resendData.attachments || [];
        
        // Build comprehensive content from all available data
        let contentParts: string[] = [];
        contentParts.push(`From: ${emailFrom}`);
        contentParts.push(`Subject: ${emailSubject}`);
        
        if (attachments.length > 0) {
          const attachmentInfo = attachments.map((a: any) => a.filename).join(", ");
          contentParts.push(`Attachments: ${attachmentInfo}`);
        }
        
        // Add body content
        if (emailText) {
          contentParts.push(`\nBody:\n${emailText}`);
        } else if (emailHtml) {
          // Strip HTML tags for basic text extraction
          const textFromHtml = emailHtml.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
          contentParts.push(`\nBody:\n${textFromHtml}`);
        }
        
        emailContent = contentParts.join("\n");
        console.log("Email content extracted from webhook, length:", emailContent.length);
        console.log("Email content preview:", emailContent.substring(0, 200));
        
      } else if (payload.emailContent && payload.forwardingKey) {
        // Handle manual paste format (existing functionality)
        emailContent = payload.emailContent;
        forwardingKey = payload.forwardingKey;
        console.log("Manual paste submission for key:", forwardingKey);
      } else {
        console.error("Unknown payload format:", JSON.stringify(payload));
        return new Response(
          JSON.stringify({ error: "Invalid request format" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } else {
      return new Response(
        JSON.stringify({ error: "Unsupported content type" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!emailContent || !forwardingKey) {
      return new Response(
        JSON.stringify({ error: "Missing emailContent or forwardingKey" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Look up user by forwarding key
    const { data: forwardingConfig, error: lookupError } = await supabase
      .from("email_forwarding")
      .select("user_id, is_active, emails_processed")
      .eq("forwarding_key", forwardingKey)
      .maybeSingle();

    if (lookupError || !forwardingConfig) {
      console.error("Forwarding key lookup error:", lookupError, "Key:", forwardingKey);
      return new Response(
        JSON.stringify({ error: "Invalid forwarding key" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!forwardingConfig.is_active) {
      return new Response(
        JSON.stringify({ error: "Email forwarding is disabled for this account" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = forwardingConfig.user_id;
    console.log("Processing email for user:", userId);

    // Use AI to parse the email content
    if (!lovableApiKey) {
      console.error("LOVABLE_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are a financial transaction parser. Extract transaction details from bank emails.
            
Parse the email and extract:
- amount: The transaction amount (positive number)
- description: A brief description of the transaction
- date: The transaction date in YYYY-MM-DD format
- merchant: The merchant/vendor name if available
- type: Either "expense", "income", or "transfer"
- category: One of: Food, Shopping, Transportation, Utilities, Entertainment, Healthcare, Education, Travel, Salary, Investment, Transfer, Other

Return a JSON object with these fields. If you cannot determine a field, use null.
Also include a "confidence" field (0-1) indicating how confident you are in the extraction.

Only return valid JSON, no markdown or explanation.`
          },
          {
            role: "user",
            content: `Parse this bank email:\n\n${emailContent}`
          }
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI parsing error:", errorText);
      return new Response(
        JSON.stringify({ error: "Failed to parse email with AI" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await aiResponse.json();
    const parsedContent = aiData.choices?.[0]?.message?.content;
    
    let parsed;
    try {
      // Clean up AI response - remove markdown code fences if present
      let cleanedContent = parsedContent.trim();
      if (cleanedContent.startsWith("```json")) {
        cleanedContent = cleanedContent.replace(/^```json\s*/, "").replace(/\s*```$/, "");
      } else if (cleanedContent.startsWith("```")) {
        cleanedContent = cleanedContent.replace(/^```\s*/, "").replace(/\s*```$/, "");
      }
      parsed = JSON.parse(cleanedContent);
    } catch {
      console.error("Failed to parse AI response as JSON:", parsedContent);
      return new Response(
        JSON.stringify({ error: "AI returned invalid response" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("AI parsed transaction:", parsed);

    // Insert parsed transaction
    const { data: insertedTransaction, error: insertError } = await supabase
      .from("parsed_transactions")
      .insert({
        user_id: userId,
        raw_email_content: emailContent,
        parsed_amount: parsed.amount,
        parsed_description: parsed.description,
        parsed_date: parsed.date,
        parsed_merchant: parsed.merchant,
        parsed_type: parsed.type,
        parsed_category: parsed.category,
        confidence_score: parsed.confidence,
        status: "pending",
      })
      .select()
      .single();

    if (insertError) {
      console.error("Insert error:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to save parsed transaction" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update email processed count
    await supabase
      .from("email_forwarding")
      .update({ 
        emails_processed: forwardingConfig.emails_processed + 1,
        last_email_at: new Date().toISOString() 
      })
      .eq("forwarding_key", forwardingKey);

    console.log("Successfully parsed email for user:", userId, "Transaction:", insertedTransaction.id);

    return new Response(
      JSON.stringify({ success: true, transaction: insertedTransaction }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in parse-email function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
