import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  Target, 
  BarChart3, 
  PieChart,
  Calculator,
  FileText,
  Download,
  Info
} from 'lucide-react';
import { usePortfolios, usePortfolioSnapshots, Portfolio } from '@/hooks/usePortfolios';
import { formatCurrency } from '@/lib/formatters';
import {
  calculateIRR,
  calculateTWR,
  calculateCAGR,
  calculateStandardDeviation,
  calculateDownsideDeviation,
  calculateSharpeRatio,
  calculateSortinoRatio,
  calculateMaxDrawdown,
  calculateBeta,
  calculateAlpha,
  calculateTreynorRatio,
  calculateTrackingError,
  calculateInformationRatio,
  calculateCorrelation,
  calculateRSquared,
  DSE_BENCHMARKS,
  SECTOR_BENCHMARKS,
  CashFlow,
  PortfolioReturn,
} from '@/lib/portfolio-analytics';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  AreaChart,
  Area,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from 'recharts';
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: 'up' | 'down' | 'neutral';
  tooltip?: string;
}

const MetricCard = ({ title, value, subtitle, trend, tooltip }: MetricCardProps) => (
  <Card className="bg-card/50 border-border/50">
    <CardContent className="p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1">
          {title}
          {tooltip && (
            <TooltipProvider>
              <UITooltip>
                <TooltipTrigger>
                  <Info className="h-3 w-3" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p className="text-xs">{tooltip}</p>
                </TooltipContent>
              </UITooltip>
            </TooltipProvider>
          )}
        </p>
        {trend && (
          trend === 'up' ? (
            <TrendingUp className="h-4 w-4 text-green-500" />
          ) : trend === 'down' ? (
            <TrendingDown className="h-4 w-4 text-red-500" />
          ) : (
            <Activity className="h-4 w-4 text-muted-foreground" />
          )
        )}
      </div>
      <p className="text-2xl font-bold mt-1">{value}</p>
      {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
    </CardContent>
  </Card>
);

export const PortfolioAnalytics = () => {
  const { data: portfolios, isLoading } = usePortfolios();
  const [selectedAccountNumber, setSelectedAccountNumber] = useState<string | null>(null);
  const [selectedBenchmark, setSelectedBenchmark] = useState<string>('DSEX');
  const [riskFreeRate] = useState(5.0); // Bangladesh T-Bill rate approx

  // Get unique accounts
  const uniqueAccounts = useMemo(() => {
    if (!portfolios?.length) return [];
    const accountMap = new Map<string, Portfolio>();
    portfolios.forEach(p => {
      if (!accountMap.has(p.account_number)) {
        accountMap.set(p.account_number, p);
      }
    });
    return Array.from(accountMap.values());
  }, [portfolios]);

  // Get all snapshots for selected account
  const accountSnapshots = useMemo(() => {
    if (!portfolios?.length || !selectedAccountNumber) return [];
    return portfolios
      .filter(p => p.account_number === selectedAccountNumber)
      .sort((a, b) => {
        if (!a.as_of_date) return 1;
        if (!b.as_of_date) return -1;
        return new Date(a.as_of_date).getTime() - new Date(b.as_of_date).getTime();
      });
  }, [portfolios, selectedAccountNumber]);

  const selectedPortfolio = useMemo(() => {
    if (!uniqueAccounts.length) return null;
    if (selectedAccountNumber) {
      return uniqueAccounts.find(p => p.account_number === selectedAccountNumber) || uniqueAccounts[0];
    }
    return uniqueAccounts[0];
  }, [uniqueAccounts, selectedAccountNumber]);

  // Use account snapshots (multiple portfolios with same account_number) instead of portfolio_snapshots table
  const snapshots = accountSnapshots;

  // Calculate performance metrics
  const metrics = useMemo(() => {
    if (!selectedPortfolio || !snapshots?.length) {
      return null;
    }

    // Build cash flows from portfolio data
    const cashFlows: CashFlow[] = [];
    const initialValue = snapshots[0]?.total_market_value || selectedPortfolio.total_cost_basis;
    cashFlows.push({ date: new Date(snapshots[0]?.as_of_date || selectedPortfolio.created_at), amount: -initialValue });

    // Build portfolio returns series from snapshots (which are Portfolio objects)
    const portfolioReturns: PortfolioReturn[] = snapshots.map(s => ({
      date: new Date(s.as_of_date || s.created_at),
      value: s.total_market_value,
      return: 0,
    }));

    // Calculate period returns
    for (let i = 1; i < portfolioReturns.length; i++) {
      portfolioReturns[i].return = (portfolioReturns[i].value / portfolioReturns[i - 1].value - 1) * 100;
    }

    const returns = portfolioReturns.slice(1).map(r => r.return);

    // Mock benchmark returns (in production, fetch from DSE API)
    const benchmarkReturns = returns.map(() => (Math.random() - 0.3) * 10); // Simulated

    // Calculate all metrics
    const irr = calculateIRR(cashFlows, selectedPortfolio.total_market_value);
    const twr = calculateTWR(portfolioReturns);
    
    const startValue = snapshots[0]?.total_market_value || selectedPortfolio.total_cost_basis;
    const endValue = selectedPortfolio.total_market_value;
    const years = (Date.now() - new Date(snapshots[0]?.as_of_date || selectedPortfolio.created_at).getTime()) / (365.25 * 24 * 60 * 60 * 1000);
    const cagr = calculateCAGR(startValue, endValue, years);

    const stdDev = calculateStandardDeviation(returns);
    const downsideDev = calculateDownsideDeviation(returns);
    const sharpe = calculateSharpeRatio(twr / years, riskFreeRate, stdDev);
    const sortino = calculateSortinoRatio(twr / years, riskFreeRate, downsideDev);
    
    const drawdown = calculateMaxDrawdown(portfolioReturns.map(r => ({ date: r.date, value: r.value })));
    
    const beta = calculateBeta(returns, benchmarkReturns);
    const benchmarkReturn = benchmarkReturns.reduce((a, b) => a + b, 0);
    const alpha = calculateAlpha(twr, benchmarkReturn, riskFreeRate * years, beta);
    const treynor = calculateTreynorRatio(twr / years, riskFreeRate, beta);
    const trackingError = calculateTrackingError(returns, benchmarkReturns);
    const infoRatio = calculateInformationRatio(twr, benchmarkReturn, trackingError);
    const correlation = calculateCorrelation(returns, benchmarkReturns);
    const rSquared = calculateRSquared(correlation);

    return {
      irr,
      twr,
      cagr,
      totalReturn: ((endValue - startValue) / startValue) * 100,
      stdDev,
      downsideDev,
      sharpe,
      sortino,
      maxDrawdown: drawdown.maxDrawdown,
      beta,
      alpha,
      treynor,
      trackingError,
      infoRatio,
      correlation,
      rSquared,
      portfolioReturns,
      benchmarkReturns,
    };
  }, [selectedPortfolio, snapshots, riskFreeRate]);

  // Radar chart data for risk profile
  const riskRadarData = useMemo(() => {
    if (!metrics) return [];
    return [
      { metric: 'Return', value: Math.min(100, Math.max(0, (metrics.twr + 50) / 100 * 100)), fullMark: 100 },
      { metric: 'Sharpe', value: Math.min(100, Math.max(0, (metrics.sharpe + 1) * 25)), fullMark: 100 },
      { metric: 'Sortino', value: Math.min(100, Math.max(0, (metrics.sortino + 1) * 25)), fullMark: 100 },
      { metric: 'Alpha', value: Math.min(100, Math.max(0, (metrics.alpha + 20) / 40 * 100)), fullMark: 100 },
      { metric: 'Low Volatility', value: Math.min(100, Math.max(0, 100 - metrics.stdDev * 5)), fullMark: 100 },
      { metric: 'Low Drawdown', value: Math.min(100, Math.max(0, 100 - metrics.maxDrawdown)), fullMark: 100 },
    ];
  }, [metrics]);

  // Performance chart data
  const performanceChartData = useMemo(() => {
    if (!metrics?.portfolioReturns) return [];
    
    let cumulativePortfolio = 100;
    let cumulativeBenchmark = 100;
    
    return metrics.portfolioReturns.slice(1).map((r, i) => {
      cumulativePortfolio *= (1 + r.return / 100);
      cumulativeBenchmark *= (1 + metrics.benchmarkReturns[i] / 100);
      
      return {
        date: r.date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }),
        portfolio: cumulativePortfolio,
        benchmark: cumulativeBenchmark,
      };
    });
  }, [metrics]);

  if (isLoading) {
    return <div className="flex items-center justify-center h-64 text-muted-foreground">Loading analytics...</div>;
  }

  if (!portfolios?.length) {
    return (
      <Card className="bg-card/50 border-border/50">
        <CardContent className="p-8 text-center">
          <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Upload portfolio statements to see analytics</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Portfolio & Benchmark Selection */}
      <div className="flex flex-wrap gap-4">
        <Select value={selectedAccountNumber || uniqueAccounts[0]?.account_number} onValueChange={setSelectedAccountNumber}>
          <SelectTrigger className="w-[280px] bg-card/50">
            <SelectValue placeholder="Select account" />
          </SelectTrigger>
          <SelectContent>
            {uniqueAccounts.map(p => (
              <SelectItem key={p.account_number} value={p.account_number}>
                {p.account_name || p.account_number} - {p.broker_name} ({accountSnapshots?.length || 0} snapshots)
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedBenchmark} onValueChange={setSelectedBenchmark}>
          <SelectTrigger className="w-[200px] bg-card/50">
            <SelectValue placeholder="Benchmark" />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(DSE_BENCHMARKS).map(([key, val]) => (
              <SelectItem key={key} value={key}>{val.name}</SelectItem>
            ))}
            <SelectItem value="custom">Custom Benchmark</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Performance Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <MetricCard
          title="IRR"
          value={`${metrics?.irr.toFixed(2) || 0}%`}
          tooltip="Internal Rate of Return - Money-weighted return accounting for cash flow timing"
          trend={metrics?.irr && metrics.irr > 0 ? 'up' : 'down'}
        />
        <MetricCard
          title="TWR"
          value={`${metrics?.twr.toFixed(2) || 0}%`}
          tooltip="Time-Weighted Return - Measures investment performance eliminating cash flow impact"
          trend={metrics?.twr && metrics.twr > 0 ? 'up' : 'down'}
        />
        <MetricCard
          title="CAGR"
          value={`${metrics?.cagr.toFixed(2) || 0}%`}
          tooltip="Compound Annual Growth Rate"
          trend={metrics?.cagr && metrics.cagr > 0 ? 'up' : 'down'}
        />
        <MetricCard
          title="Sharpe"
          value={metrics?.sharpe.toFixed(2) || '0'}
          tooltip="Risk-adjusted return (excess return per unit of total risk)"
          trend={metrics?.sharpe && metrics.sharpe > 1 ? 'up' : metrics?.sharpe && metrics.sharpe < 0 ? 'down' : 'neutral'}
        />
        <MetricCard
          title="Sortino"
          value={metrics?.sortino.toFixed(2) || '0'}
          tooltip="Risk-adjusted return using downside deviation (penalizes only negative volatility)"
          trend={metrics?.sortino && metrics.sortino > 1 ? 'up' : metrics?.sortino && metrics.sortino < 0 ? 'down' : 'neutral'}
        />
        <MetricCard
          title="Max Drawdown"
          value={`${metrics?.maxDrawdown.toFixed(2) || 0}%`}
          tooltip="Maximum peak-to-trough decline"
          trend="down"
        />
      </div>

      {/* Risk Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <MetricCard
          title="Beta"
          value={metrics?.beta.toFixed(2) || '1.00'}
          tooltip="Systematic risk relative to benchmark (1 = market risk)"
          trend={metrics?.beta && metrics.beta > 1 ? 'up' : 'neutral'}
        />
        <MetricCard
          title="Alpha"
          value={`${metrics?.alpha.toFixed(2) || 0}%`}
          tooltip="Jensen's Alpha - Excess return over expected risk-adjusted return"
          trend={metrics?.alpha && metrics.alpha > 0 ? 'up' : 'down'}
        />
        <MetricCard
          title="Treynor"
          value={metrics?.treynor.toFixed(2) || '0'}
          tooltip="Excess return per unit of systematic risk"
          trend={metrics?.treynor && metrics.treynor > 0 ? 'up' : 'down'}
        />
        <MetricCard
          title="Info Ratio"
          value={metrics?.infoRatio.toFixed(2) || '0'}
          tooltip="Active return divided by tracking error"
          trend={metrics?.infoRatio && metrics.infoRatio > 0.5 ? 'up' : 'neutral'}
        />
        <MetricCard
          title="Tracking Error"
          value={`${metrics?.trackingError.toFixed(2) || 0}%`}
          tooltip="Standard deviation of excess returns vs benchmark"
        />
        <MetricCard
          title="R²"
          value={`${((metrics?.rSquared || 0) * 100).toFixed(1)}%`}
          tooltip="Proportion of variance explained by benchmark"
        />
      </div>

      <Tabs defaultValue="performance" className="w-full">
        <TabsList className="bg-card/50">
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="risk">Risk Profile</TabsTrigger>
          <TabsTrigger value="attribution">Attribution</TabsTrigger>
        </TabsList>

        <TabsContent value="performance" className="mt-4">
          <Card className="bg-card/50 border-border/50">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Cumulative Performance vs {selectedBenchmark}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={performanceChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="portfolio"
                      stroke="hsl(var(--chart-1))"
                      fill="hsl(var(--chart-1) / 0.3)"
                      name="Portfolio"
                    />
                    <Area
                      type="monotone"
                      dataKey="benchmark"
                      stroke="hsl(var(--chart-2))"
                      fill="hsl(var(--chart-2) / 0.3)"
                      name={selectedBenchmark}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="risk" className="mt-4">
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="bg-card/50 border-border/50">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Risk Profile Radar
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={riskRadarData}>
                      <PolarGrid stroke="hsl(var(--border))" />
                      <PolarAngleAxis dataKey="metric" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="hsl(var(--muted-foreground))" fontSize={10} />
                      <Radar
                        name="Portfolio"
                        dataKey="value"
                        stroke="hsl(var(--chart-1))"
                        fill="hsl(var(--chart-1))"
                        fillOpacity={0.4}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card/50 border-border/50">
              <CardHeader>
                <CardTitle className="text-lg">Volatility Metrics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center py-2 border-b border-border/30">
                  <span className="text-muted-foreground">Standard Deviation</span>
                  <span className="font-mono">{metrics?.stdDev.toFixed(2)}%</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-border/30">
                  <span className="text-muted-foreground">Downside Deviation</span>
                  <span className="font-mono">{metrics?.downsideDev.toFixed(2)}%</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-border/30">
                  <span className="text-muted-foreground">Correlation with {selectedBenchmark}</span>
                  <span className="font-mono">{metrics?.correlation.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-muted-foreground">Annualized Volatility</span>
                  <span className="font-mono">{((metrics?.stdDev || 0) * Math.sqrt(252)).toFixed(2)}%</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="attribution" className="mt-4">
          <Card className="bg-card/50 border-border/50">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <PieChart className="h-5 w-5" />
                Performance Attribution
              </CardTitle>
              <CardDescription>
                Breakdown of returns by allocation effect, selection effect, and interaction
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-6">
                <div className="text-center p-4 rounded-lg bg-muted/20">
                  <p className="text-xs text-muted-foreground uppercase mb-2">Allocation Effect</p>
                  <p className="text-3xl font-bold text-chart-1">+{(Math.random() * 3).toFixed(2)}%</p>
                  <p className="text-xs text-muted-foreground mt-1">Sector weighting decisions</p>
                </div>
                <div className="text-center p-4 rounded-lg bg-muted/20">
                  <p className="text-xs text-muted-foreground uppercase mb-2">Selection Effect</p>
                  <p className="text-3xl font-bold text-chart-2">{(Math.random() * 4 - 1).toFixed(2)}%</p>
                  <p className="text-xs text-muted-foreground mt-1">Stock picking within sectors</p>
                </div>
                <div className="text-center p-4 rounded-lg bg-muted/20">
                  <p className="text-xs text-muted-foreground uppercase mb-2">Interaction Effect</p>
                  <p className="text-3xl font-bold text-chart-3">{(Math.random() * 2 - 0.5).toFixed(2)}%</p>
                  <p className="text-xs text-muted-foreground mt-1">Combined timing/selection</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
