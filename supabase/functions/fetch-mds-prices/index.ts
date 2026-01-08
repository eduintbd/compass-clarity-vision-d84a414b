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

interface HistoricalPrice {
  close_price: number;
  trade_date: string;
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
  const tableRowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let rowMatch;
  
  while ((rowMatch = tableRowRegex.exec(html)) !== null) {
    const rowContent = rowMatch[1];
    
    // Extract all td contents from this row
    const tdRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
    const cells: string[] = [];
    let tdMatch;
    
    while ((tdMatch = tdRegex.exec(rowContent)) !== null) {
      const cellContent = tdMatch[1]
        .replace(/<[^>]*>/g, '')
        .replace(/&nbsp;/g, ' ')
        .trim();
      cells.push(cellContent);
    }
    
    if (cells.length >= 11) {
      const rowNum = parseInt(cells[0]);
      
      if (isNaN(rowNum)) continue;
      
      const symbol = cells[1].toUpperCase().trim();
      
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
      
      // Use YCP as fallback when LTP is 0 (no trades today)
      const currentPrice = ltp > 0 ? ltp : ycp;
      
      if (currentPrice <= 0) {
        console.log(`Skipping ${symbol}: No valid price (LTP=${ltp}, YCP=${ycp})`);
        continue;
      }
      
      const changePercent = ycp > 0 ? (change / ycp) * 100 : 0;
      
      prices.push({
        symbol,
        lastPrice: currentPrice,
        previousClose: ycp,
        high: high > 0 ? high : currentPrice,
        low: low > 0 ? low : currentPrice,
        open: closep > 0 ? closep : currentPrice,
        change,
        changePercent,
        volume,
        value: valueInMn * 1000000,
        trades,
        fetchedAt: new Date().toISOString(),
      });
      
      console.log(`Parsed ${symbol}: Price=${currentPrice} (LTP=${ltp}, YCP=${ycp}), Change=${change}`);
    }
  }

  console.log(`Successfully parsed ${prices.length} prices from DSE website`);
  return prices;
}

// Save price data to price_history table for historical reference
async function savePriceHistory(supabase: any, prices: MDSPriceData[]): Promise<void> {
  const today = new Date().toISOString().split('T')[0];
  console.log(`Saving ${prices.length} prices to price_history for date: ${today}`);
  
  for (const price of prices) {
    if (price.lastPrice <= 0) continue;
    
    try {
      const { error } = await supabase
        .from('price_history')
        .upsert({
          symbol: price.symbol,
          trade_date: today,
          open_price: price.open,
          high_price: price.high,
          low_price: price.low,
          close_price: price.lastPrice,
          ycp: price.previousClose,
          change: price.change,
          change_percent: price.changePercent,
          volume: price.volume,
          trade_value: price.value,
          trades: price.trades,
        }, { onConflict: 'symbol,trade_date' });
      
      if (error) {
        console.error(`Error saving price history for ${price.symbol}:`, error.message);
      }
    } catch (err) {
      console.error(`Exception saving price history for ${price.symbol}:`, err);
    }
  }
  
  console.log('Price history save completed');
}

// Get last known price from price_history for fallback YCP calculation
async function getLastKnownPrices(supabase: any, symbol: string): Promise<{ previousClose: number; change: number } | null> {
  try {
    const { data, error } = await supabase
      .from('price_history')
      .select('close_price, trade_date')
      .eq('symbol', symbol)
      .order('trade_date', { ascending: false })
      .limit(2);
    
    if (error || !data || data.length < 2) {
      return null;
    }
    
    const prices = data as HistoricalPrice[];
    const todayClose = prices[0].close_price;
    const previousClose = prices[1].close_price;
    const change = todayClose - previousClose;
    
    console.log(`Historical fallback for ${symbol}: previousClose=${previousClose}, change=${change}`);
    return { previousClose, change };
  } catch (err) {
    console.error(`Error fetching historical prices for ${symbol}:`, err);
    return null;
  }
}

// Update holdings in Supabase
async function updateHoldingPrices(
  supabase: any,
  prices: MDSPriceData[]
): Promise<{ updated: number; errors: string[] }> {
  let updated = 0;
  const errors: string[] = [];
  
  for (const price of prices) {
    if (price.lastPrice <= 0) {
      console.log(`Skipping ${price.symbol}: Invalid price ${price.lastPrice}`);
      continue;
    }
    
    try {
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
      
      // Determine YCP and change - use historical fallback if DSE returns 0
      let ycp = price.previousClose;
      let change = price.change;
      let changePercent = price.changePercent;
      
      if (ycp <= 0) {
        console.log(`YCP is 0 for ${price.symbol}, attempting historical fallback...`);
        const historical = await getLastKnownPrices(supabase, price.symbol);
        if (historical) {
          ycp = historical.previousClose;
          change = price.lastPrice - ycp;
          changePercent = ycp > 0 ? (change / ycp) * 100 : 0;
          console.log(`Using historical fallback for ${price.symbol}: YCP=${ycp}, Change=${change}`);
        }
      }
      
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
            ycp: ycp,
            day_high: price.high,
            day_low: price.low,
            day_open: price.open,
            volume: price.volume,
            trade_value: price.value,
            trades: price.trades,
            market_value: marketValue,
            unrealized_gain: unrealizedGain,
            unrealized_gain_percent: unrealizedGainPercent,
            day_change: change,
            day_change_percent: changePercent,
            last_updated_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', holding.id);
        
        if (updateError) {
          errors.push(`Error updating ${price.symbol} (${holding.id}): ${updateError.message}`);
        } else {
          updated++;
          console.log(`Updated ${price.symbol}: ৳${price.lastPrice}, YCP=${ycp}, Change=${change}`);
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
  
  const { data: portfolios, error: portfolioError } = await supabase
    .from('portfolios')
    .select('id');
  
  if (portfolioError || !portfolios) {
    console.error('Error fetching portfolios:', portfolioError);
    return;
  }
  
  for (const portfolio of portfolios as PortfolioData[]) {
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
    
    const { error: updateError } = await supabase
      .from('portfolios')
      .update({
        equity_at_market: totals.total_market_value,
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
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('=== DSE Price Fetch Started ===');
    console.log(`Timestamp: ${new Date().toISOString()}`);
    
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
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
    
    // Save prices to history for future fallback
    await savePriceHistory(supabase, prices);
    
    // Update holdings with new prices (with historical fallback)
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
