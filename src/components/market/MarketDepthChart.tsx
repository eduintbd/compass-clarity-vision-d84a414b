import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown } from "lucide-react";

interface MarketDepthRow {
  Scrip: string;
  BuyPrice: number;
  BuyVolume: number;
  SellPrice: number;
  SellVolume: number;
}

interface MarketDepthChartProps {
  data: MarketDepthRow[];
  className?: string;
}

export const MarketDepthChart = ({ data, className }: MarketDepthChartProps) => {
  const analysis = useMemo(() => {
    if (!data || data.length === 0) return null;

    const maxBuyVolume = Math.max(...data.map(d => d.BuyVolume));
    const maxSellVolume = Math.max(...data.map(d => d.SellVolume));
    const maxVolume = Math.max(maxBuyVolume, maxSellVolume);
    
    const totalBuyVolume = data.reduce((sum, d) => sum + d.BuyVolume, 0);
    const totalSellVolume = data.reduce((sum, d) => sum + d.SellVolume, 0);
    const totalVolume = totalBuyVolume + totalSellVolume;
    
    const buyPressure = totalVolume > 0 ? (totalBuyVolume / totalVolume) * 100 : 50;
    
    const bestBid = data[0]?.BuyPrice || 0;
    const bestAsk = data[0]?.SellPrice || 0;
    const spread = bestAsk - bestBid;
    const spreadPercent = bestAsk > 0 ? (spread / bestAsk) * 100 : 0;

    return {
      maxVolume,
      totalBuyVolume,
      totalSellVolume,
      buyPressure,
      bestBid,
      bestAsk,
      spread,
      spreadPercent
    };
  }, [data]);

  if (!analysis) return null;

  return (
    <div className={cn("space-y-4", className)}>
      {/* Spread Indicator */}
      <div className="bg-muted/30 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-success" />
            <span className="text-sm font-medium">Best Bid</span>
          </div>
          <span className="font-mono font-bold text-success text-lg">
            ৳{analysis.bestBid.toLocaleString('en-BD', { minimumFractionDigits: 1 })}
          </span>
        </div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <TrendingDown className="h-4 w-4 text-destructive" />
            <span className="text-sm font-medium">Best Ask</span>
          </div>
          <span className="font-mono font-bold text-destructive text-lg">
            ৳{analysis.bestAsk.toLocaleString('en-BD', { minimumFractionDigits: 1 })}
          </span>
        </div>
        <div className="border-t border-border pt-3 flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Spread</span>
          <div className="flex items-center gap-2">
            <span className="font-mono font-medium">
              ৳{analysis.spread.toLocaleString('en-BD', { minimumFractionDigits: 1 })}
            </span>
            <span className="text-xs text-muted-foreground">
              ({analysis.spreadPercent.toFixed(2)}%)
            </span>
          </div>
        </div>
      </div>

      {/* Buy/Sell Pressure */}
      <div className="bg-muted/30 rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">Market Pressure</span>
          <span className={cn(
            "text-xs font-medium px-2 py-0.5 rounded-full",
            analysis.buyPressure > 50 ? "bg-success/20 text-success" : "bg-destructive/20 text-destructive"
          )}>
            {analysis.buyPressure > 50 ? "Bullish" : "Bearish"}
          </span>
        </div>
        <div className="relative h-3 bg-muted rounded-full overflow-hidden">
          <div 
            className="absolute left-0 top-0 h-full bg-success transition-all duration-500"
            style={{ width: `${analysis.buyPressure}%` }}
          />
          <div 
            className="absolute right-0 top-0 h-full bg-destructive transition-all duration-500"
            style={{ width: `${100 - analysis.buyPressure}%` }}
          />
        </div>
        <div className="flex justify-between mt-2 text-xs text-muted-foreground">
          <span>Buy: {analysis.totalBuyVolume.toLocaleString()}</span>
          <span>Sell: {analysis.totalSellVolume.toLocaleString()}</span>
        </div>
      </div>

      {/* Depth Visualization */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-muted-foreground">Order Book Depth</h4>
        {data.slice(0, 5).map((row, index) => (
          <div key={index} className="grid grid-cols-2 gap-2">
            {/* Buy side */}
            <div className="relative flex items-center justify-end bg-success/5 rounded-l-md overflow-hidden h-10">
              <div 
                className="absolute left-0 top-0 h-full bg-success/20 transition-all duration-300"
                style={{ width: `${(row.BuyVolume / analysis.maxVolume) * 100}%` }}
              />
              <div className="relative z-10 flex items-center gap-3 px-3">
                <span className="text-xs text-muted-foreground">{row.BuyVolume.toLocaleString()}</span>
                <span className="font-mono text-sm font-medium text-success">
                  {row.BuyPrice.toFixed(1)}
                </span>
              </div>
            </div>
            {/* Sell side */}
            <div className="relative flex items-center bg-destructive/5 rounded-r-md overflow-hidden h-10">
              <div 
                className="absolute left-0 top-0 h-full bg-destructive/20 transition-all duration-300"
                style={{ width: `${(row.SellVolume / analysis.maxVolume) * 100}%` }}
              />
              <div className="relative z-10 flex items-center gap-3 px-3">
                <span className="font-mono text-sm font-medium text-destructive">
                  {row.SellPrice.toFixed(1)}
                </span>
                <span className="text-xs text-muted-foreground">{row.SellVolume.toLocaleString()}</span>
              </div>
            </div>
          </div>
        ))}
        <div className="flex justify-center gap-8 pt-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <div className="w-3 h-3 bg-success/30 rounded" /> Bids
          </span>
          <span className="flex items-center gap-1">
            <div className="w-3 h-3 bg-destructive/30 rounded" /> Asks
          </span>
        </div>
      </div>
    </div>
  );
};
