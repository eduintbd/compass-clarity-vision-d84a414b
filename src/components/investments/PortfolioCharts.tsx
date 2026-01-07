import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usePortfolios, usePortfolioHoldings, Portfolio } from '@/hooks/usePortfolios';
import { formatCurrency } from '@/lib/formatters';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, Legend } from 'recharts';
import { TrendingUp, PieChart as PieChartIcon, BarChart3 } from 'lucide-react';

const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))', '#8884d8', '#82ca9d', '#ffc658'];

export const PortfolioCharts = () => {
  const { data: portfolios } = usePortfolios();
  const [selectedAccountNumber, setSelectedAccountNumber] = useState<string | null>(null);

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
    if (!portfolios?.length) return [];
    const accountNum = selectedAccountNumber || uniqueAccounts[0]?.account_number;
    if (!accountNum) return [];
    return portfolios
      .filter(p => p.account_number === accountNum)
      .sort((a, b) => {
        if (!a.as_of_date) return 1;
        if (!b.as_of_date) return -1;
        return new Date(a.as_of_date).getTime() - new Date(b.as_of_date).getTime();
      });
  }, [portfolios, selectedAccountNumber, uniqueAccounts]);

  // Get the latest portfolio for holdings
  const latestPortfolio = accountSnapshots[accountSnapshots.length - 1];
  const { data: holdings } = usePortfolioHoldings(latestPortfolio?.id || null);

  // Performance data from all snapshots of this account
  const performanceData = accountSnapshots
    .filter(p => p.as_of_date)
    .map(p => ({
      date: p.as_of_date!,
      value: p.total_market_value,
      cost: p.total_cost_basis,
      gain: p.total_unrealized_gain,
    }));

  // Sector allocation from holdings
  const sectorData = holdings 
    ? Object.entries(
        holdings.reduce((acc, h) => {
          const sector = h.sector || 'Other';
          acc[sector] = (acc[sector] || 0) + h.market_value;
          return acc;
        }, {} as Record<string, number>)
      ).map(([name, value]) => ({ name, value }))
    : [];

  // Top holdings
  const topHoldings = holdings
    ?.slice(0, 10)
    .map(h => ({
      symbol: h.symbol,
      value: h.market_value,
      gain: h.unrealized_gain,
    })) || [];

  if (!portfolios || portfolios.length === 0) {
    return (
      <Card className="bg-card/50 border-border/50">
        <CardContent className="pt-6 text-center text-muted-foreground">
          <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Upload portfolio statements to see performance charts</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Portfolio Selector */}
      <Card className="bg-card/50 border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Portfolio Performance
          </CardTitle>
          <CardDescription>View performance metrics and allocations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-6">
            <label className="text-sm text-muted-foreground mb-2 block">Select Account</label>
            <Select 
              value={selectedAccountNumber || uniqueAccounts[0]?.account_number || 'none'} 
              onValueChange={(v) => setSelectedAccountNumber(v === 'none' ? null : v)}
            >
              <SelectTrigger className="w-full max-w-md">
                <SelectValue placeholder="Select account" />
              </SelectTrigger>
              <SelectContent>
                {uniqueAccounts.map(p => (
                  <SelectItem key={p.account_number} value={p.account_number}>
                    {p.broker_name} - {p.account_number} ({accountSnapshots.length} snapshots)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Summary Stats */}
          {latestPortfolio && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="p-3 bg-muted/30 rounded-lg">
                <p className="text-xs text-muted-foreground">Market Value</p>
                <p className="text-lg font-semibold">{formatCurrency(latestPortfolio.total_market_value)}</p>
              </div>
              <div className="p-3 bg-muted/30 rounded-lg">
                <p className="text-xs text-muted-foreground">Cost Basis</p>
                <p className="text-lg font-semibold">{formatCurrency(latestPortfolio.total_cost_basis)}</p>
              </div>
              <div className="p-3 bg-muted/30 rounded-lg">
                <p className="text-xs text-muted-foreground">Unrealized Gain</p>
                <p className={`text-lg font-semibold ${latestPortfolio.total_unrealized_gain >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                  {formatCurrency(latestPortfolio.total_unrealized_gain)}
                </p>
              </div>
              <div className="p-3 bg-muted/30 rounded-lg">
                <p className="text-xs text-muted-foreground">Return %</p>
                <p className={`text-lg font-semibold ${latestPortfolio.total_unrealized_gain >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                  {latestPortfolio.total_cost_basis > 0 
                    ? `${((latestPortfolio.total_unrealized_gain / latestPortfolio.total_cost_basis) * 100).toFixed(2)}%`
                    : '0%'
                  }
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Performance Chart */}
      {performanceData.length > 1 && (
        <Card className="bg-card/50 border-border/50">
          <CardHeader>
            <CardTitle className="text-base">Portfolio Value Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={performanceData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="date" 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                  />
                  <YAxis 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                    formatter={(value: number) => formatCurrency(value)}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="value" 
                    name="Market Value"
                    stroke="hsl(var(--chart-1))" 
                    strokeWidth={2}
                    dot={{ fill: 'hsl(var(--chart-1))' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="cost" 
                    name="Cost Basis"
                    stroke="hsl(var(--chart-2))" 
                    strokeWidth={2}
                    dot={{ fill: 'hsl(var(--chart-2))' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Sector Allocation */}
        {sectorData.length > 0 && (
          <Card className="bg-card/50 border-border/50">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <PieChartIcon className="h-4 w-4" />
                Sector Allocation
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={sectorData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      labelLine={false}
                    >
                      {sectorData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Top Holdings */}
        {topHoldings.length > 0 && (
          <Card className="bg-card/50 border-border/50">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Top Holdings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topHoldings} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis 
                      type="number" 
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                      tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                    />
                    <YAxis 
                      type="category" 
                      dataKey="symbol" 
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                      width={80}
                    />
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Bar dataKey="value" name="Value" fill="hsl(var(--chart-1))" radius={4} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};
