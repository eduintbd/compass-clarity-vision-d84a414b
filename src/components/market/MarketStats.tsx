import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { BarChart3, DollarSign, Percent, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface DividendData {
  Scrip: string;
  CashDividend: number;
  StockDividend: number;
  Eps: number;
  Nav: number;
  RecordDate: string;
  Year: number;
}

interface MarketStatsProps {
  dividendData: DividendData[] | null;
  isLoading?: boolean;
  currentPrice?: number;
}

export const MarketStats = ({ dividendData, isLoading, currentPrice }: MarketStatsProps) => {
  const latestData = dividendData?.[0];
  
  // Calculate dividend yield if we have price
  const dividendYield = latestData && currentPrice 
    ? ((latestData.CashDividend / 10) / currentPrice) * 100 
    : null;
  
  // Calculate P/E ratio if we have price and EPS
  const peRatio = latestData && currentPrice && latestData.Eps > 0
    ? currentPrice / latestData.Eps
    : null;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Market Statistics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-6 w-24" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!latestData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Market Statistics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-4">
            No statistics available
          </p>
        </CardContent>
      </Card>
    );
  }

  const stats = [
    {
      label: "NAV",
      value: `৳${latestData.Nav.toFixed(2)}`,
      icon: DollarSign,
      color: "text-primary"
    },
    {
      label: "EPS",
      value: `৳${latestData.Eps.toFixed(2)}`,
      icon: TrendingUp,
      color: latestData.Eps >= 0 ? "text-success" : "text-destructive"
    },
    {
      label: "P/E Ratio",
      value: peRatio ? peRatio.toFixed(2) : "N/A",
      icon: BarChart3,
      color: "text-warning"
    },
    {
      label: "Div. Yield",
      value: dividendYield ? `${dividendYield.toFixed(2)}%` : "N/A",
      icon: Percent,
      color: "text-primary"
    },
    {
      label: "Cash Div.",
      value: `${latestData.CashDividend}%`,
      icon: DollarSign,
      color: "text-success"
    },
    {
      label: "Stock Div.",
      value: `${latestData.StockDividend}%`,
      icon: TrendingUp,
      color: "text-muted-foreground"
    }
  ];

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Market Statistics
          </CardTitle>
          <Badge variant="outline" className="text-xs">
            {latestData.Year}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {stats.map((stat, index) => (
            <div 
              key={stat.label}
              className={cn(
                "p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors",
                "animate-fade-in"
              )}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="flex items-center gap-1.5 mb-1">
                <stat.icon className={cn("h-3.5 w-3.5", stat.color)} />
                <span className="text-xs text-muted-foreground">{stat.label}</span>
              </div>
              <span className={cn("text-lg font-bold font-mono", stat.color)}>
                {stat.value}
              </span>
            </div>
          ))}
        </div>
        
        {/* Record Date */}
        <div className="mt-4 pt-3 border-t border-border">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Record Date</span>
            <span className="font-medium">{latestData.RecordDate}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
