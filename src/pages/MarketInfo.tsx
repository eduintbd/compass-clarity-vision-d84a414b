import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import {
  useDividendData,
  useFinancialData,
  useMarketDepth,
  useShareDistribution,
  useNewsData,
} from "@/hooks/useAmarStock";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { MetricCard } from "@/components/market/MetricCard";
import { MarketDepthChart } from "@/components/market/MarketDepthChart";
import { MarketStats } from "@/components/market/MarketStats";
import { ShareDistributionPie } from "@/components/market/ShareDistributionPie";
import { 
  TrendingUp, 
  TrendingDown, 
  Search, 
  BarChart3, 
  PieChart, 
  Newspaper, 
  DollarSign,
  Building2,
  RefreshCw,
  AlertCircle,
  Activity,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Clock
} from "lucide-react";
import { cn } from "@/lib/utils";

const MarketInfo = () => {
  const [symbol, setSymbol] = useState("GP");
  const [searchInput, setSearchInput] = useState("GP");

  const { data: dividendData, isLoading: dividendLoading, error: dividendError, refetch: refetchDividend } = useDividendData(symbol);
  const { data: financialData, isLoading: financialLoading, error: financialError, refetch: refetchFinancial } = useFinancialData(symbol);
  const { data: marketDepth, isLoading: depthLoading, error: depthError, refetch: refetchDepth } = useMarketDepth(symbol);
  const { data: shareDistribution, isLoading: distLoading, error: distError, refetch: refetchDist } = useShareDistribution(symbol);
  const { data: newsData, isLoading: newsLoading, error: newsError, refetch: refetchNews } = useNewsData(symbol);

  // Compute metrics from market depth
  const marketMetrics = useMemo(() => {
    if (!marketDepth || !Array.isArray(marketDepth) || marketDepth.length === 0) {
      return null;
    }

    const bestBid = marketDepth[0]?.BuyPrice || 0;
    const bestAsk = marketDepth[0]?.SellPrice || 0;
    const midPrice = (bestBid + bestAsk) / 2;
    const spread = bestAsk - bestBid;
    
    const totalBuyVolume = marketDepth.reduce((sum: number, d: any) => sum + (d.BuyVolume || 0), 0);
    const totalSellVolume = marketDepth.reduce((sum: number, d: any) => sum + (d.SellVolume || 0), 0);
    const totalVolume = totalBuyVolume + totalSellVolume;
    const buyPressure = totalVolume > 0 ? (totalBuyVolume / totalVolume) * 100 : 50;

    return {
      bestBid,
      bestAsk,
      midPrice,
      spread,
      totalBuyVolume,
      totalSellVolume,
      totalVolume,
      buyPressure
    };
  }, [marketDepth]);

  // Get dividend metrics
  const dividendMetrics = useMemo(() => {
    if (!dividendData || !Array.isArray(dividendData) || dividendData.length === 0) {
      return null;
    }
    const latest = dividendData[0];
    return {
      eps: latest?.Eps || 0,
      nav: latest?.Nav || 0,
      cashDividend: latest?.CashDividend || 0,
      stockDividend: latest?.StockDividend || 0
    };
  }, [dividendData]);

  const handleSearch = () => {
    setSymbol(searchInput.toUpperCase());
  };

  const handleRefreshAll = () => {
    refetchDividend();
    refetchFinancial();
    refetchDepth();
    refetchDist();
    refetchNews();
  };

  const chartUrl = `https://www.amarstock.com/Chart/draw?Code=${symbol}&OVER=BB(20,2)&IND=RSI(14);MACD(12,26,9)&Size=800*400&Cycle=Day1&type=3&bg=1e293b&upColor=22c55e&downColor=ef4444`;

  const isMarketOpen = () => {
    const now = new Date();
    const hours = now.getHours();
    const day = now.getDay();
    // DSE trading hours: Sunday-Thursday 10:00 AM - 2:30 PM
    return day >= 0 && day <= 4 && hours >= 10 && hours < 15;
  };

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 overflow-auto">
          {/* Hero Section */}
          <div className="bg-gradient-to-br from-[#0d1a2d] via-[#1a2d42] to-[#0f2d3d] text-white relative overflow-hidden">
            {/* Background decoration */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-0 right-0 w-96 h-96 bg-primary rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2" />
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-primary rounded-full blur-3xl transform -translate-x-1/2 translate-y-1/2" />
            </div>
            
            <div className="container mx-auto px-6 py-8 relative z-10">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="animate-fade-in">
                  <h1 className="text-3xl font-bold mb-2 font-display">Market Information</h1>
                  <p className="text-white/70">
                    Real-time data from Dhaka Stock Exchange
                  </p>
                </div>
                <div className="flex items-center gap-3 animate-fade-in" style={{ animationDelay: "100ms" }}>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/50" />
                    <Input
                      placeholder="Enter symbol (e.g., GP)"
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value.toUpperCase())}
                      onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                      className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/50 w-48 focus:border-primary"
                    />
                  </div>
                  <Button 
                    onClick={handleSearch}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground"
                  >
                    Search
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleRefreshAll}
                    className="border-white/20 text-white hover:bg-white/10"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              {/* Symbol and Status */}
              <div className="mt-6 flex items-center gap-4 animate-fade-in" style={{ animationDelay: "150ms" }}>
                <Badge className="bg-primary text-primary-foreground text-lg px-4 py-1.5 font-mono font-bold">
                  {symbol}
                </Badge>
                <span className="text-white/60">Dhaka Stock Exchange</span>
                <Badge 
                  variant="outline" 
                  className={cn(
                    "ml-auto flex items-center gap-1.5",
                    isMarketOpen() 
                      ? "border-success/50 text-success bg-success/10" 
                      : "border-destructive/50 text-destructive bg-destructive/10"
                  )}
                >
                  <span className={cn(
                    "w-2 h-2 rounded-full",
                    isMarketOpen() ? "bg-success animate-pulse-slow" : "bg-destructive"
                  )} />
                  {isMarketOpen() ? "Market Open" : "Market Closed"}
                </Badge>
              </div>

              {/* Key Metrics Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
                <MetricCard
                  title="Current Price"
                  value={marketMetrics ? `৳${marketMetrics.midPrice.toFixed(1)}` : "—"}
                  subtitle={marketMetrics ? `Spread: ৳${marketMetrics.spread.toFixed(1)}` : undefined}
                  icon={DollarSign}
                  isLoading={depthLoading}
                />
                <MetricCard
                  title="Total Volume"
                  value={marketMetrics ? marketMetrics.totalVolume.toLocaleString() : "—"}
                  subtitle={marketMetrics ? `${marketMetrics.buyPressure.toFixed(0)}% buy pressure` : undefined}
                  icon={Activity}
                  trend={marketMetrics && marketMetrics.buyPressure > 50 ? "up" : "down"}
                  isLoading={depthLoading}
                />
                <MetricCard
                  title="NAV"
                  value={dividendMetrics ? `৳${dividendMetrics.nav.toFixed(2)}` : "—"}
                  subtitle="Net Asset Value"
                  icon={Wallet}
                  isLoading={dividendLoading}
                />
                <MetricCard
                  title="EPS"
                  value={dividendMetrics ? `৳${dividendMetrics.eps.toFixed(2)}` : "—"}
                  subtitle="Earnings Per Share"
                  icon={TrendingUp}
                  trend={dividendMetrics && dividendMetrics.eps >= 0 ? "up" : "down"}
                  isLoading={dividendLoading}
                />
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="container mx-auto px-6 py-8">
            <Tabs defaultValue="overview" className="space-y-6">
              <TabsList className="bg-muted/50 p-1">
                <TabsTrigger value="overview" className="gap-2 data-[state=active]:bg-background">
                  <BarChart3 className="h-4 w-4" />
                  Overview
                </TabsTrigger>
                <TabsTrigger value="financials" className="gap-2 data-[state=active]:bg-background">
                  <DollarSign className="h-4 w-4" />
                  Financials
                </TabsTrigger>
                <TabsTrigger value="distribution" className="gap-2 data-[state=active]:bg-background">
                  <PieChart className="h-4 w-4" />
                  Distribution
                </TabsTrigger>
                <TabsTrigger value="news" className="gap-2 data-[state=active]:bg-background">
                  <Newspaper className="h-4 w-4" />
                  News
                </TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" className="space-y-6 animate-fade-in">
                {/* Chart Card */}
                <Card className="overflow-hidden">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5 text-primary" />
                      Price Chart
                      <Badge variant="outline" className="ml-2 text-xs font-normal">
                        {symbol}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-[#1e293b] rounded-lg p-4 flex items-center justify-center min-h-[400px]">
                      <img 
                        src={chartUrl} 
                        alt={`${symbol} chart`}
                        className="max-w-full h-auto rounded"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    </div>
                  </CardContent>
                </Card>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Enhanced Market Depth Card */}
                  <Card className="animate-fade-in" style={{ animationDelay: "100ms" }}>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Building2 className="h-5 w-5 text-primary" />
                        Market Depth
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {depthLoading ? (
                        <div className="space-y-4">
                          <Skeleton className="h-24 w-full" />
                          <Skeleton className="h-24 w-full" />
                          <Skeleton className="h-32 w-full" />
                        </div>
                      ) : depthError ? (
                        <div className="flex items-center gap-2 text-destructive">
                          <AlertCircle className="h-4 w-4" />
                          <span>Failed to load market depth</span>
                        </div>
                      ) : marketDepth && Array.isArray(marketDepth) && marketDepth.length > 0 ? (
                        <MarketDepthChart data={marketDepth} />
                      ) : (
                        <p className="text-muted-foreground text-center py-8">
                          No market depth data available
                        </p>
                      )}
                    </CardContent>
                  </Card>

                  {/* Market Stats Card */}
                  <div className="animate-fade-in" style={{ animationDelay: "150ms" }}>
                    <MarketStats 
                      dividendData={dividendData} 
                      isLoading={dividendLoading}
                      currentPrice={marketMetrics?.midPrice}
                    />
                  </div>
                </div>

                {/* Dividend History */}
                <Card className="animate-fade-in" style={{ animationDelay: "200ms" }}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <DollarSign className="h-5 w-5 text-primary" />
                      Dividend History
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {dividendLoading ? (
                      <div className="space-y-3">
                        {[...Array(4)].map((_, i) => (
                          <Skeleton key={i} className="h-12 w-full" />
                        ))}
                      </div>
                    ) : dividendError ? (
                      <div className="flex items-center gap-2 text-destructive">
                        <AlertCircle className="h-4 w-4" />
                        <span>Failed to load dividend data</span>
                      </div>
                    ) : dividendData && Array.isArray(dividendData) && dividendData.length > 0 ? (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow className="border-border/50">
                              <TableHead className="font-semibold">Year</TableHead>
                              <TableHead className="font-semibold">Cash Div.</TableHead>
                              <TableHead className="font-semibold">Stock Div.</TableHead>
                              <TableHead className="font-semibold">EPS</TableHead>
                              <TableHead className="font-semibold">NAV</TableHead>
                              <TableHead className="font-semibold">Record Date</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {dividendData.map((row: any, i: number) => (
                              <TableRow key={i} className="border-border/30 hover:bg-muted/30">
                                <TableCell className="font-medium">{row.Year}</TableCell>
                                <TableCell>
                                  <span className="text-success font-medium">{row.CashDividend}%</span>
                                </TableCell>
                                <TableCell>{row.StockDividend}%</TableCell>
                                <TableCell className={cn(
                                  "font-mono",
                                  row.Eps >= 0 ? "text-success" : "text-destructive"
                                )}>
                                  ৳{row.Eps?.toFixed(2)}
                                </TableCell>
                                <TableCell className="font-mono">৳{row.Nav?.toFixed(2)}</TableCell>
                                <TableCell className="text-muted-foreground">{row.RecordDate}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-center py-8">
                        No dividend data available
                      </p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Financials Tab */}
              <TabsContent value="financials" className="space-y-6 animate-fade-in">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <DollarSign className="h-5 w-5 text-primary" />
                      Financial Data
                      <Badge variant="outline" className="ml-2 text-xs font-normal">
                        {symbol}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {financialLoading ? (
                      <div className="space-y-3">
                        {[...Array(8)].map((_, i) => (
                          <Skeleton key={i} className="h-12 w-full" />
                        ))}
                      </div>
                    ) : financialError ? (
                      <div className="flex items-center gap-2 text-destructive">
                        <AlertCircle className="h-4 w-4" />
                        <span>Failed to load financial data</span>
                      </div>
                    ) : financialData && Array.isArray(financialData) && financialData.length > 0 ? (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow className="border-border/50">
                              <TableHead className="font-semibold">Item</TableHead>
                              <TableHead className="font-semibold">Type</TableHead>
                              <TableHead className="font-semibold text-right">Value</TableHead>
                              <TableHead className="font-semibold">Year</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {financialData.slice(0, 20).map((row: any, i: number) => (
                              <TableRow 
                                key={i} 
                                className={cn(
                                  "border-border/30 hover:bg-muted/30",
                                  row.IsSummary && "bg-muted/20 font-medium"
                                )}
                              >
                                <TableCell className="max-w-xs truncate">{row.Key}</TableCell>
                                <TableCell>
                                  <Badge variant="outline" className="text-xs font-normal">
                                    {row.Type}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-right font-mono">
                                  {row.Value ? `৳${(row.Value / 1000000).toFixed(2)}M` : '—'}
                                </TableCell>
                                <TableCell>{row.Year}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-center py-8">
                        No financial data available for {symbol}
                      </p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Distribution Tab */}
              <TabsContent value="distribution" className="space-y-6 animate-fade-in">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Pie Chart */}
                  <ShareDistributionPie 
                    data={shareDistribution} 
                    isLoading={distLoading} 
                  />

                  {/* Distribution Table */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <PieChart className="h-5 w-5 text-primary" />
                        Distribution History
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {distLoading ? (
                        <div className="space-y-3">
                          {[...Array(3)].map((_, i) => (
                            <Skeleton key={i} className="h-12 w-full" />
                          ))}
                        </div>
                      ) : distError ? (
                        <div className="flex items-center gap-2 text-destructive">
                          <AlertCircle className="h-4 w-4" />
                          <span>Failed to load share distribution</span>
                        </div>
                      ) : shareDistribution && Array.isArray(shareDistribution) && shareDistribution.length > 0 ? (
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow className="border-border/50">
                                <TableHead className="font-semibold">Date</TableHead>
                                <TableHead className="font-semibold text-right">Directors</TableHead>
                                <TableHead className="font-semibold text-right">Institutions</TableHead>
                                <TableHead className="font-semibold text-right">Foreign</TableHead>
                                <TableHead className="font-semibold text-right">Public</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {shareDistribution.map((row: any, i: number) => (
                                <TableRow key={i} className="border-border/30 hover:bg-muted/30">
                                  <TableCell className="font-medium">{row.date}</TableCell>
                                  <TableCell className="text-right font-mono">{row.director}%</TableCell>
                                  <TableCell className="text-right font-mono">{row.institute}%</TableCell>
                                  <TableCell className="text-right font-mono">{row.foreign}%</TableCell>
                                  <TableCell className="text-right font-mono">{row.public}%</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      ) : (
                        <p className="text-muted-foreground text-center py-8">
                          No share distribution data available for {symbol}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* News Tab */}
              <TabsContent value="news" className="space-y-6 animate-fade-in">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {newsLoading ? (
                    [...Array(4)].map((_, i) => (
                      <Card key={i} className="animate-pulse">
                        <CardContent className="p-6">
                          <Skeleton className="h-5 w-3/4 mb-3" />
                          <Skeleton className="h-4 w-full mb-2" />
                          <Skeleton className="h-4 w-2/3" />
                          <Skeleton className="h-3 w-24 mt-4" />
                        </CardContent>
                      </Card>
                    ))
                  ) : newsError ? (
                    <Card className="col-span-full">
                      <CardContent className="p-6">
                        <div className="flex items-center gap-2 text-destructive">
                          <AlertCircle className="h-4 w-4" />
                          <span>Failed to load news</span>
                        </div>
                      </CardContent>
                    </Card>
                  ) : newsData && Array.isArray(newsData) && newsData.length > 0 ? (
                    newsData.map((news: any, i: number) => (
                      <Card 
                        key={i} 
                        className="hover:shadow-lg transition-all duration-300 hover:border-primary/30 animate-fade-in group"
                        style={{ animationDelay: `${i * 50}ms` }}
                      >
                        <CardContent className="p-6">
                          <div className="flex items-start gap-3">
                            <div className="p-2 bg-primary/10 rounded-lg shrink-0 group-hover:bg-primary/20 transition-colors">
                              <Newspaper className="h-5 w-5 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-foreground mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                                {news.Title}
                              </h3>
                              <p className="text-sm text-muted-foreground line-clamp-3 mb-3">
                                {news.Content}
                              </p>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Clock className="h-3.5 w-3.5" />
                                <span>
                                  {new Date(news.PublishDate).toLocaleDateString('en-US', {
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric'
                                  })}
                                </span>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  ) : (
                    <Card className="col-span-full">
                      <CardContent className="p-6">
                        <p className="text-muted-foreground text-center py-8">
                          No news available for {symbol}
                        </p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
    </div>
  );
};

export default MarketInfo;
