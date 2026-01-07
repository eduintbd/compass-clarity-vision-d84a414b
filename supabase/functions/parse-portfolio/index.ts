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

    if (!lovableApiKey) {
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get authorization header for user identification
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify user
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid authorization" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { documentText, documentType } = await req.json();

    if (!documentText) {
      return new Response(
        JSON.stringify({ error: "Document text is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Parsing portfolio document for user:", user.id);
    console.log("Document type:", documentType);
    console.log("Document text length:", documentText.length);
    console.log("Document text preview:", documentText.substring(0, 500));

    // Use AI with tool calling for more reliable structured output
    // Support multiple portfolios in a single document
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
            content: `You are a financial document parser. Extract ALL stock holdings and financial data from brokerage portfolio statements.
IMPORTANT: A single document may contain MULTIPLE portfolio statements from different brokerage accounts. Each portfolio statement typically starts with a new header showing broker name, account number, client name etc.
Look for tables with columns like: Instrument Code, Quantity, Avg Cost, Total Cost, Market Rate, Market Value, Gain/Loss.
Be thorough - extract EVERY holding from EVERY portfolio in the document.
Each portfolio should have its own accountInfo with the specific broker name, account number, and account holder name for that section.

CRITICAL FINANCIAL FIELD MAPPINGS - PAY CLOSE ATTENTION:

1. LEDGER BALANCE / CASH / LOAN (these are the SAME concept):
   - "Ledger Balance" = "Cash Balance" = "Loan" = "Margin Balance" - These all refer to the SAME field
   - If the value is NEGATIVE (e.g., -7,128,897.35), it means LOAN/MARGIN - set marginBalance = absolute value (7,128,897.35), cashBalance = 0
   - If the value is POSITIVE, it means CASH available - set cashBalance = value, marginBalance = 0
   - Store the raw value (positive or negative) in ledgerBalance field

2. ACCRUED FEES - STRICT RULES:
   - ONLY extract accruedFees if you see EXPLICIT labels like: "Accrued Fee", "Accrued Commission", "Brokerage Commission Due", "Commission Payable"
   - If there is NO explicit accrued fees label in the document, set accruedFees = 0
   - DO NOT guess or assume any value is accrued fees
   - DO NOT use cash/ledger balance values as accrued fees
   - When in doubt, set accruedFees = 0
   - Accrued fees are typically very small amounts (hundreds) compared to portfolio values

EXAMPLE: If you see "Ledger Balance: -7,128,897.35" and NO explicit "Accrued Fees" label:
- ledgerBalance = -7128897.35
- marginBalance = 7128897.35 (absolute value because negative)
- cashBalance = 0
- accruedFees = 0 (because no explicit label found)`
          },
          {
            role: "user",
            content: `Extract all portfolios and their holdings from this document. The document may contain multiple portfolio statements from different brokers/accounts - extract each one separately:\n\n${documentText}`
          }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "save_portfolios_data",
              description: "Save extracted portfolio data. Use this for MULTIPLE portfolios in a single document.",
              parameters: {
                type: "object",
                properties: {
                  portfolios: {
                    type: "array",
                    description: "Array of portfolios found in the document. Each portfolio statement should be a separate entry.",
                    items: {
                      type: "object",
                      properties: {
                        accountInfo: {
                          type: "object",
                          properties: {
                            accountNumber: { type: "string", description: "Account/Client number/code" },
                            accountName: { type: "string", description: "Account holder name" },
                            brokerName: { type: "string", description: "Brokerage/custodian name" },
                            asOfDate: { type: "string", description: "Statement date in YYYY-MM-DD format" },
                            accountType: { type: "string", description: "Account type e.g. Cash, Margin" },
                            currency: { type: "string", description: "Currency code like BDT, USD" }
                          },
                          required: ["accountNumber"]
                        },
                        holdings: {
                          type: "array",
                          description: "List of ALL stock/security holdings for this portfolio",
                          items: {
                            type: "object",
                            properties: {
                              symbol: { type: "string", description: "Stock symbol/instrument code" },
                              companyName: { type: "string", description: "Full company name" },
                              quantity: { type: "number", description: "Number of shares/units" },
                              averageCost: { type: "number", description: "Average purchase cost per share" },
                              costBasis: { type: "number", description: "Total cost basis (quantity * avg cost)" },
                              currentPrice: { type: "number", description: "Current market price per share" },
                              marketValue: { type: "number", description: "Total market value (quantity * current price)" },
                              unrealizedGain: { type: "number", description: "Unrealized gain/loss amount" },
                              unrealizedGainPercent: { type: "number", description: "Unrealized gain/loss percentage" },
                              dayChange: { type: "number", description: "Day change amount if available" },
                              dayChangePercent: { type: "number", description: "Day change percentage if available" },
                              sector: { type: "string", description: "Industry sector" },
                              assetClass: { type: "string", description: "Asset class e.g. equity, bond, mutual-fund" },
                              acquisitionDate: { type: "string", description: "Purchase date YYYY-MM-DD if known" },
                              isMarginable: { type: "boolean", description: "Whether marginable security" }
                            },
                            required: ["symbol", "quantity", "marketValue"]
                          }
                        },
                        summary: {
                          type: "object",
                          properties: {
                            totalCostBasis: { type: "number", description: "Total cost of all holdings" },
                            totalMarketValue: { type: "number", description: "Total market value of all holdings" },
                            totalUnrealizedGain: { type: "number", description: "Total unrealized gain/loss" },
                            totalRealizedGain: { type: "number", description: "Total realized gain/loss if shown" },
                            ledgerBalance: { type: "number", description: "Ledger Balance - the raw value including sign. Negative means loan, positive means cash. CRITICAL: Do NOT confuse with accrued fees." },
                            cashBalance: { type: "number", description: "Cash balance. Use ledger balance value if positive, otherwise 0." },
                            marginBalance: { type: "number", description: "Margin/Loan balance. Use absolute value of ledger balance if negative, otherwise 0." },
                            totalDividendsReceived: { type: "number", description: "Total dividends received" },
                            accruedFees: { type: "number", description: "SEPARATE from ledger balance! Look for 'Accrued Fees', 'Commission', 'Brokerage Charges'. Usually a small amount (hundreds/thousands, not millions)." },
                            accruedDividends: { type: "number", description: "Accrued/pending dividend receivables" },
                            totalDeposit: { type: "number", description: "Total deposits/fund inflows" },
                            totalWithdraw: { type: "number", description: "Total withdrawals/fund outflows" },
                            netDeposit: { type: "number", description: "Net deposit (deposits - withdrawals)" },
                            equityAtCost: { type: "number", description: "Equity at cost value" },
                            equityAtMarket: { type: "number", description: "Equity at market value" },
                            pendingSettlements: { type: "number", description: "Pending settlement amounts" },
                            privateEquityValue: { type: "number", description: "Private equity or unlisted investments value" }
                          }
                        },
                        dividends: {
                          type: "array",
                          description: "Dividend receivables or history",
                          items: {
                            type: "object",
                            properties: {
                              symbol: { type: "string" },
                              dividendDate: { type: "string", description: "Record/payment date YYYY-MM-DD" },
                              amount: { type: "number", description: "Gross dividend amount" },
                              taxWithheld: { type: "number", description: "Tax withheld if any" },
                              netAmount: { type: "number", description: "Net dividend receivable" },
                              dividendType: { type: "string", description: "cash, stock, special" },
                              isQualified: { type: "boolean", description: "Whether qualified dividend" }
                            },
                            required: ["symbol", "amount"]
                          }
                        }
                      },
                      required: ["accountInfo", "holdings"]
                    }
                  }
                },
                required: ["portfolios"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "save_portfolios_data" } }
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI parsing error:", aiResponse.status, errorText);
      return new Response(
        JSON.stringify({ error: "Failed to parse document with AI" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await aiResponse.json();
    console.log("AI response structure:", JSON.stringify(Object.keys(aiData)));
    
    // Extract from tool call
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      console.error("No tool call in response:", JSON.stringify(aiData));
      return new Response(
        JSON.stringify({ error: "AI did not return structured data" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let parsed;
    try {
      parsed = JSON.parse(toolCall.function.arguments);
    } catch (e) {
      console.error("Failed to parse tool arguments:", toolCall.function.arguments);
      return new Response(
        JSON.stringify({ error: "AI returned invalid structured data" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Successfully parsed portfolios for user:", user.id);
    console.log("Portfolios found:", parsed.portfolios?.length || 0);
    
    // Add confidence to each portfolio
    const portfoliosWithConfidence = (parsed.portfolios || []).map((p: any) => ({
      ...p,
      confidence: 0.9
    }));

    // Return array of portfolios
    return new Response(
      JSON.stringify({ success: true, data: portfoliosWithConfidence, isMultiple: portfoliosWithConfidence.length > 1 }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in parse-portfolio function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
