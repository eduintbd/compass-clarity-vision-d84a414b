import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Supabase config
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface MDSPriceData {
  symbol: string;
  lastPrice: number;
  high: number;
  low: number;
  open: number;
  previousClose: number;
  change: number;
  changePercent: number;
  volume: number;
  value: number;
  trades: number;
  fetchedAt: string;
}

interface HoldingData {
  id: string;
  quantity: number;
  cost_basis: number;
  portfolio_id: string;
}

interface PortfolioData {
  id: string;
}

interface HoldingTotals {
  market_value: number;
  cost_basis: number;
  unrealized_gain: number;
}

interface CurrentPortfolioData {
  cash_balance: number;
  private_equity_value: number;
}

// Function to fetch prices from DSE website
async function fetchDSEPrices(symbols: string[]): Promise<MDSPriceData[]> {
  const url = 'https://www.dsebd.org/latest_share_price_scroll_l.php';
  
  console.log('Fetching prices from DSE website...');
  console.log(`Looking for symbols: ${symbols.join(', ')}`);

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
    },
  });

  if (!response.ok) {
    throw new Error(`DSE website returned ${response.status}`);
  }

  const html = await response.text();
  console.log(`Received HTML response: ${html.length} bytes`);
  
  const prices: MDSPriceData[] = [];
  const symbolSet = new Set(symbols.map(s => s.toUpperCase()));

  // Parse the HTML table
  // The table has columns: # | TRADING CODE | LTP | HIGH | LOW | CLOSEP | YCP | CHANGE | TRADE | VALUE (mn) | VOLUME
  // Each row is in format: <tr>...<td>data</td>...</tr>
  
  // Match table rows - look for rows with numeric first column
  const tableRowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let rowMatch;
  
  while ((rowMatch = tableRowRegex.exec(html)) !== null) {
    const rowContent = rowMatch[1];
    
    // Extract all td contents from this row
    const tdRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
    const cells: string[] = [];
    let tdMatch;
    
    while ((tdMatch = tdRegex.exec(rowContent)) !== null) {
      // Clean the cell content - remove HTML tags and trim
      const cellContent = tdMatch[1]
        .replace(/<[^>]*>/g, '')
        .replace(/&nbsp;/g, ' ')
        .trim();
      cells.push(cellContent);
    }
    
    // We need at least 11 columns: #, TRADING CODE, LTP, HIGH, LOW, CLOSEP, YCP, CHANGE, TRADE, VALUE, VOLUME
    if (cells.length >= 11) {
      const rowNum = parseInt(cells[0]);
      
      // Skip if first cell is not a number (header row)
      if (isNaN(rowNum)) continue;
      
      const symbol = cells[1].toUpperCase().trim();
      
      // Only process symbols we're looking for
      if (!symbolSet.has(symbol)) continue;
      
      const ltp = parseFloat(cells[2].replace(/,/g, '')) || 0;
      const high = parseFloat(cells[3].replace(/,/g, '')) || 0;
      const low = parseFloat(cells[4].replace(/,/g, '')) || 0;
      const closep = parseFloat(cells[5].replace(/,/g, '')) || 0;
      const ycp = parseFloat(cells[6].replace(/,/g, '')) || 0;
      const change = parseFloat(cells[7].replace(/,/g, '')) || 0;
      const trades = parseInt(cells[8].replace(/,/g, '')) || 0;
      const valueInMn = parseFloat(cells[9].replace(/,/g, '')) || 0;
      const volume = parseInt(cells[10].replace(/,/g, '')) || 0;
      
      // Calculate change percent
      const changePercent = ycp > 0 ? (change / ycp) * 100 : 0;
      
      prices.push({
        symbol,
        lastPrice: ltp,
        previousClose: ycp,
        high,
        low,
        open: closep, // Using closep as a reference
        change,
        changePercent,
        volume,
        value: valueInMn * 1000000, // Convert from millions to actual value
        trades,
        fetchedAt: new Date().toISOString(),
      });
      
      console.log(`Parsed ${symbol}: LTP=${ltp}, YCP=${ycp}, Change=${change}`);
    }
  }

  console.log(`Successfully parsed ${prices.length} prices from DSE website`);
  return prices;
}

// Update holdings in Supabase
async function updateHoldingPrices(
  supabase: any,
  prices: MDSPriceData[]
): Promise<{ updated: number; errors: string[] }> {
  let updated = 0;
  const errors: string[] = [];
  
  for (const price of prices) {
    try {
      // Get all holdings with this symbol
      const { data: holdings, error: fetchError } = await supabase
        .from('holdings')
        .select('id, quantity, cost_basis, portfolio_id')
        .eq('symbol', price.symbol);
      
      if (fetchError) {
        errors.push(`Error fetching holdings for ${price.symbol}: ${fetchError.message}`);
        continue;
      }
      
      if (!holdings || holdings.length === 0) {
        console.log(`No holdings found for symbol: ${price.symbol}`);
        continue;
      }
      
      // Update each holding
      for (const holding of holdings as HoldingData[]) {
        const marketValue = holding.quantity * price.lastPrice;
        const unrealizedGain = marketValue - holding.cost_basis;
        const unrealizedGainPercent = holding.cost_basis > 0 
          ? (unrealizedGain / holding.cost_basis) * 100 
          : 0;
        
        const { error: updateError } = await supabase
          .from('holdings')
          .update({
            current_price: price.lastPrice,
            ycp: price.previousClose,
            day_high: price.high,
            day_low: price.low,
            day_open: price.open,
            volume: price.volume,
            trade_value: price.value,
            trades: price.trades,
            market_value: marketValue,
            unrealized_gain: unrealizedGain,
            unrealized_gain_percent: unrealizedGainPercent,
            day_change: price.change,
            day_change_percent: price.changePercent,
            last_updated_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', holding.id);
        
        if (updateError) {
          errors.push(`Error updating ${price.symbol} (${holding.id}): ${updateError.message}`);
        } else {
          updated++;
          console.log(`Updated ${price.symbol}: ৳${price.lastPrice}`);
        }
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      errors.push(`Exception processing ${price.symbol}: ${errorMessage}`);
    }
  }
  
  return { updated, errors };
}

// Recalculate portfolio totals after price updates
async function updatePortfolioTotals(supabase: any): Promise<void> {
  console.log('Recalculating portfolio totals...');
  
  // Get all unique portfolio IDs
  const { data: portfolios, error: portfolioError } = await supabase
    .from('portfolios')
    .select('id');
  
  if (portfolioError || !portfolios) {
    console.error('Error fetching portfolios:', portfolioError);
    return;
  }
  
  for (const portfolio of portfolios as PortfolioData[]) {
    // Get sum of holdings for this portfolio
    const { data: holdings, error: holdingsError } = await supabase
      .from('holdings')
      .select('market_value, cost_basis, unrealized_gain')
      .eq('portfolio_id', portfolio.id);
    
    if (holdingsError || !holdings) {
      console.error(`Error fetching holdings for portfolio ${portfolio.id}:`, holdingsError);
      continue;
    }
    
    const totals = (holdings as HoldingTotals[]).reduce((acc, h) => ({
      total_market_value: acc.total_market_value + (h.market_value || 0),
      total_cost_basis: acc.total_cost_basis + (h.cost_basis || 0),
      total_unrealized_gain: acc.total_unrealized_gain + (h.unrealized_gain || 0),
    }), {
      total_market_value: 0,
      total_cost_basis: 0,
      total_unrealized_gain: 0,
    });
    
    // Update portfolio with new totals (add cash balance and private equity)
    const { data: currentPortfolio } = await supabase
      .from('portfolios')
      .select('cash_balance, private_equity_value')
      .eq('id', portfolio.id)
      .single();
    
    const portfolioData = currentPortfolio as CurrentPortfolioData | null;
    if (portfolioData) {
      totals.total_market_value += (portfolioData.cash_balance || 0) + (portfolioData.private_equity_value || 0);
    }
    
    const { error: updateError } = await supabase
      .from('portfolios')
      .update({
        equity_at_market: totals.total_market_value - (portfolioData?.cash_balance || 0) - (portfolioData?.private_equity_value || 0),
        total_market_value: totals.total_market_value,
        total_cost_basis: totals.total_cost_basis,
        total_unrealized_gain: totals.total_unrealized_gain,
        updated_at: new Date().toISOString(),
      })
      .eq('id', portfolio.id);
    
    if (updateError) {
      console.error(`Error updating portfolio ${portfolio.id}:`, updateError);
    } else {
      console.log(`Updated portfolio ${portfolio.id} totals`);
    }
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('=== DSE Price Fetch Started ===');
    console.log(`Timestamp: ${new Date().toISOString()}`);
    
    // Initialize Supabase client with service role key for admin access
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    // Get all unique symbols from holdings
    const { data: holdings, error: holdingsError } = await supabase
      .from('holdings')
      .select('symbol')
      .not('symbol', 'is', null);
    
    if (holdingsError) {
      throw new Error(`Error fetching holdings: ${holdingsError.message}`);
    }
    
    const holdingsData = holdings as { symbol: string }[] | null;
    const uniqueSymbols = [...new Set(holdingsData?.map(h => h.symbol) || [])];
    console.log(`Found ${uniqueSymbols.length} unique symbols to fetch prices for`);
    
    if (uniqueSymbols.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        message: 'No holdings found to update',
        timestamp: new Date().toISOString(),
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // Fetch prices from DSE website
    const prices = await fetchDSEPrices(uniqueSymbols);
    
    if (prices.length === 0) {
      console.log('No prices parsed from DSE website');
      
      return new Response(JSON.stringify({
        success: false,
        message: 'No prices found. The market may be closed or the DSE website structure may have changed.',
        symbols: uniqueSymbols,
        timestamp: new Date().toISOString(),
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // Update holdings with new prices
    const { updated, errors } = await updateHoldingPrices(supabase, prices);
    
    // Recalculate portfolio totals
    await updatePortfolioTotals(supabase);
    
    console.log(`=== Price Update Complete ===`);
    console.log(`Updated: ${updated} holdings`);
    console.log(`Errors: ${errors.length}`);
    
    return new Response(JSON.stringify({
      success: true,
      updated,
      errors: errors.length > 0 ? errors : undefined,
      pricesReceived: prices.length,
      symbolsFound: prices.map(p => p.symbol),
      timestamp: new Date().toISOString(),
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    
  } catch (error: unknown) {
    console.error('Error in fetch-mds-prices:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return new Response(JSON.stringify({
      success: false,
      error: errorMessage,
      timestamp: new Date().toISOString(),
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
