import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  TrendingUp, TrendingDown, PieChart, BarChart3, Download, 
  Plus, Eye, RefreshCw, ArrowUpRight, ArrowDownRight,
  Briefcase, DollarSign, Percent, Activity
} from 'lucide-react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useUniqueAccounts, usePortfolioHoldings, useAggregatedHoldings } from '@/hooks/usePortfolios';
import { formatCurrency, formatCompactCurrency } from '@/lib/formatters';
import { PieChart as RechartsPie, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

const COLORS = ['#40BABD', '#2DD4BF', '#0EA5E9', '#8B5CF6', '#F59E0B', '#EF4444', '#10B981', '#6366F1'];

const PortfolioPortal = () => {
  const { data: accounts, isLoading } = useUniqueAccounts();
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null);
  const [excludedTypes, setExcludedTypes] = useState<string[]>([]);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  
  // Get first account's holdings for display
  const firstAccountId = accounts?.[0]?.id;
  const { data: holdings } = usePortfolioHoldings(firstAccountId || null);
  const { data: aggregatedHoldings, isLoading: isLoadingAggregated } = useAggregatedHoldings();

  // Get unique classification types from holdings
  const classificationTypes = useMemo(() => {
    if (!aggregatedHoldings) return [];
    const types = new Set<string>();
    aggregatedHoldings.forEach(h => {
      types.add(h.classification || 'Stocks');
    });
    return Array.from(types).sort();
  }, [aggregatedHoldings]);

  // Filter holdings based on excluded types
  const filteredHoldings = useMemo(() => {
    if (!aggregatedHoldings) return [];
    return aggregatedHoldings.filter(holding => {
      const typeKey = holding.classification || 'Stocks';
      return !excludedTypes.includes(typeKey);
    });
  }, [aggregatedHoldings, excludedTypes]);

  // Sort holdings based on selected column
  const sortedHoldings = useMemo(() => {
    if (!sortColumn || !filteredHoldings) return filteredHoldings;
    
    return [...filteredHoldings].sort((a, b) => {
      let aVal: number | string = 0;
      let bVal: number | string = 0;
      
      switch (sortColumn) {
        case 'symbol': aVal = a.symbol; bVal = b.symbol; break;
        case 'ycp': aVal = a.ycp; bVal = b.ycp; break;
        case 'ltp': aVal = a.ltp; bVal = b.ltp; break;
        case 'change': aVal = a.day_change; bVal = b.day_change; break;
        case 'dailyPL': aVal = a.day_change * a.quantity; bVal = b.day_change * b.quantity; break;
        case 'quantity': aVal = a.quantity; bVal = b.quantity; break;
        case 'avgCost': aVal = a.average_cost; bVal = b.average_cost; break;
        case 'marketValue': aVal = a.market_value; bVal = b.market_value; break;
        case 'gainLoss': aVal = a.unrealized_gain; bVal = b.unrealized_gain; break;
        default: return 0;
      }
      
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDirection === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return sortDirection === 'asc' ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
    });
  }, [filteredHoldings, sortColumn, sortDirection]);

  // Handle column sort
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('desc');
    }
  };

  // Sortable header component
  const SortableHeader = ({ column, label, className }: { column: string; label: string; className?: string }) => (
    <TableHead 
      className={`cursor-pointer hover:text-[#40BABD] transition-colors select-none ${className || ''}`}
      onClick={() => handleSort(column)}
    >
      <div className="flex items-center gap-1 justify-end">
        {label}
        {sortColumn === column && (
          sortDirection === 'desc' ? <ArrowDownRight className="h-3 w-3" /> : <ArrowUpRight className="h-3 w-3" />
        )}
      </div>
    </TableHead>
  );

  // Calculate allocation data from filtered holdings
  const { allocationData, filteredCount, totalCount } = useMemo(() => {
    if (!aggregatedHoldings) return { allocationData: [], filteredCount: 0, totalCount: 0 };

    const totalCount = aggregatedHoldings.length;
    const filteredTotal = filteredHoldings.reduce((sum, h) => sum + h.market_value, 0);

    // Create allocation data with recalculated weights
    const allocationData = filteredHoldings.map((holding, idx) => ({
      name: holding.symbol,
      value: holding.market_value,
      weight: filteredTotal > 0 ? (holding.market_value / filteredTotal) * 100 : 0,
      color: COLORS[idx % COLORS.length],
    }));

    return { allocationData, filteredCount: filteredHoldings.length, totalCount };
  }, [aggregatedHoldings, filteredHoldings]);

  // Calculate holdings totals
  const holdingsTotals = useMemo(() => {
    if (!sortedHoldings || sortedHoldings.length === 0) return null;
    
    return sortedHoldings.reduce((acc, holding) => ({
      quantity: acc.quantity + holding.quantity,
      marketValue: acc.marketValue + holding.market_value,
      unrealizedGain: acc.unrealizedGain + holding.unrealized_gain,
      dailyPL: acc.dailyPL + (holding.day_change * holding.quantity),
    }), { 
      quantity: 0, 
      marketValue: 0, 
      unrealizedGain: 0, 
      dailyPL: 0 
    });
  }, [sortedHoldings]);

  const toggleTypeFilter = (typeKey: string) => {
    setExcludedTypes(prev => 
      prev.includes(typeKey) 
        ? prev.filter(t => t !== typeKey)
        : [...prev, typeKey]
    );
  };

  // Calculate totals from all accounts
  const totals = accounts?.reduce((acc, portfolio) => {
    const loanCash = portfolio.cash_balance + (portfolio.margin_balance || 0);
    const equityAtMarket = portfolio.equity_at_market + loanCash - portfolio.private_equity_value;
    
    return {
      invested: acc.invested + portfolio.total_cost_basis,
      currentValue: acc.currentValue + portfolio.total_market_value,
      equityAtMarket: acc.equityAtMarket + equityAtMarket,
      unrealizedGain: acc.unrealizedGain + portfolio.total_unrealized_gain,
      realizedGain: acc.realizedGain + portfolio.total_realized_gain,
      dividends: acc.dividends + portfolio.total_dividends_received,
    };
  }, { invested: 0, currentValue: 0, equityAtMarket: 0, unrealizedGain: 0, realizedGain: 0, dividends: 0 }) || { invested: 0, currentValue: 0, equityAtMarket: 0, unrealizedGain: 0, realizedGain: 0, dividends: 0 };

  const returnPercent = totals.invested > 0 
    ? ((totals.unrealizedGain / totals.invested) * 100).toFixed(2) 
    : '0.00';

  const metrics = [
    { 
      label: 'Total Portfolio Value', 
      value: formatCompactCurrency(totals.equityAtMarket), 
      change: '+2.4%', 
      positive: true,
      icon: Briefcase 
    },
    { 
      label: 'Total Invested', 
      value: formatCompactCurrency(totals.invested), 
      change: null, 
      positive: true,
      icon: DollarSign 
    },
    { 
      label: 'Unrealized Gain/Loss', 
      value: formatCompactCurrency(totals.unrealizedGain), 
      change: `${returnPercent}%`, 
      positive: totals.unrealizedGain >= 0,
      icon: TrendingUp 
    },
    { 
      label: 'Total Dividends', 
      value: formatCompactCurrency(totals.dividends), 
      change: null, 
      positive: true,
      icon: Percent 
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Sidebar activeItem="/portfolio-portal" />
      <Header title="Portfolio Portal" />
      
      <main className="pl-64 pt-16">
        {/* Breadcrumb */}
        <div className="px-6 py-4 border-b border-border/50">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="/">Dashboard</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Portfolio Portal</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>

        {/* Hero Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-[#0F4C5C] via-[#1A365D] to-[#0D1B2A]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-[#40BABD]/20 via-transparent to-transparent" />
          
          <div className="relative px-8 py-12">
            <div className="flex items-start justify-between mb-8">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-3xl font-display font-bold text-white">Portfolio Overview</h1>
                  <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                    <Activity className="w-3 h-3 mr-1" />
                    Live
                  </Badge>
                </div>
                <p className="text-white/60">Track your investments and monitor performance in real-time</p>
              </div>
              
              <div className="flex gap-3">
                <Button variant="outline" className="bg-white/10 border-white/20 text-white hover:bg-white/20">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Holdings
                </Button>
                <Button variant="outline" className="bg-white/10 border-white/20 text-white hover:bg-white/20">
                  <Eye className="w-4 h-4 mr-2" />
                  View Analytics
                </Button>
                <Button className="bg-[#40BABD] hover:bg-[#40BABD]/90 text-white">
                  <Download className="w-4 h-4 mr-2" />
                  Download Report
                </Button>
              </div>
            </div>

            {/* Main Value Display */}
            <div className="grid grid-cols-4 gap-6 mb-8">
              {isLoading ? (
                Array(4).fill(0).map((_, i) => (
                  <div key={i} className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
                    <Skeleton className="h-4 w-24 mb-2 bg-white/10" />
                    <Skeleton className="h-8 w-32 mb-2 bg-white/10" />
                    <Skeleton className="h-4 w-16 bg-white/10" />
                  </div>
                ))
              ) : (
                metrics.map((metric, idx) => (
                  <motion.div
                    key={metric.label}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10 hover:border-[#40BABD]/50 transition-colors"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <metric.icon className="w-4 h-4 text-[#40BABD]" />
                      <span className="text-sm text-white/60">{metric.label}</span>
                    </div>
                    <p className="text-2xl font-bold text-white mb-1">{metric.value}</p>
                    {metric.change && (
                      <div className={`flex items-center gap-1 text-sm ${metric.positive ? 'text-emerald-400' : 'text-red-400'}`}>
                        {metric.positive ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                        {metric.change}
                      </div>
                    )}
                  </motion.div>
                ))
              )}
            </div>
          </div>
        </motion.div>

        {/* Content Grid */}
        <div className="p-6 grid grid-cols-3 gap-6">
          {/* Asset Allocation by Instrument */}
          <Card className="col-span-1 bg-card/60 backdrop-blur-sm border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center justify-between text-lg">
                <div className="flex items-center gap-2">
                  <PieChart className="w-5 h-5 text-[#40BABD]" />
                  Asset Allocation
                </div>
                <Badge variant="secondary">
                  {filteredCount === totalCount ? `${totalCount} positions` : `${filteredCount} of ${totalCount}`}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Filter Buttons */}
              {classificationTypes.length > 1 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {classificationTypes.map((type) => {
                    const isExcluded = excludedTypes.includes(type);
                    return (
                      <Button
                        key={type}
                        variant={isExcluded ? "outline" : "secondary"}
                        size="sm"
                        onClick={() => toggleTypeFilter(type)}
                        className={`text-xs h-7 capitalize ${isExcluded ? 'opacity-50 line-through' : ''}`}
                      >
                        {type}
                      </Button>
                    );
                  })}
                </div>
              )}

              {isLoadingAggregated ? (
                <Skeleton className="h-[200px] w-full" />
              ) : allocationData.length === 0 ? (
                <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">
                  No holdings match the current filter
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <RechartsPie>
                    <Pie
                      data={allocationData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={1}
                      dataKey="value"
                    >
                      {allocationData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-popover/95 backdrop-blur-sm border border-border rounded-lg px-3 py-2 shadow-lg">
                              <p className="text-sm font-medium">{data.name}</p>
                              <p className="text-lg font-bold text-primary">{formatCurrency(data.value)}</p>
                              <p className="text-xs text-muted-foreground">{data.weight.toFixed(2)}%</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                  </RechartsPie>
                </ResponsiveContainer>
              )}
              <ScrollArea className="h-[140px] mt-4">
                <div className="space-y-2 pr-2">
                  {allocationData.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                        <span className="text-muted-foreground truncate max-w-[100px]">{item.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{item.weight.toFixed(1)}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Holdings Table */}
          <Card className="col-span-2 bg-card/60 backdrop-blur-sm border-border/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                <BarChart3 className="w-5 h-5 text-[#40BABD]" />
                All Holdings
                <Badge variant="secondary" className="ml-2">
                  {filteredCount === totalCount ? `${totalCount}` : `${filteredCount} of ${totalCount}`}
                </Badge>
              </CardTitle>
              <Button variant="ghost" size="sm">
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            </CardHeader>
            <CardContent>
              {/* Filter Buttons */}
              {classificationTypes.length > 1 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {classificationTypes.map((type) => {
                    const isExcluded = excludedTypes.includes(type);
                    return (
                      <Button
                        key={type}
                        variant={isExcluded ? "outline" : "secondary"}
                        size="sm"
                        onClick={() => toggleTypeFilter(type)}
                        className={`text-xs h-7 capitalize ${isExcluded ? 'opacity-50 line-through' : ''}`}
                      >
                        {type}
                      </Button>
                    );
                  })}
                </div>
              )}

              {isLoadingAggregated ? (
                <div className="space-y-3">
                  {Array(5).fill(0).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : filteredHoldings.length === 0 ? (
                <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">
                  No holdings match the current filter
                </div>
              ) : (
                <ScrollArea className="max-h-[400px]">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border/50">
                        <TableHead 
                          className="cursor-pointer hover:text-[#40BABD] transition-colors select-none"
                          onClick={() => handleSort('symbol')}
                        >
                          <div className="flex items-center gap-1">
                            Symbol
                            {sortColumn === 'symbol' && (
                              sortDirection === 'desc' ? <ArrowDownRight className="h-3 w-3" /> : <ArrowUpRight className="h-3 w-3" />
                            )}
                          </div>
                        </TableHead>
                        <SortableHeader column="ltp" label="LTP" className="text-right" />
                        <SortableHeader column="change" label="Change" className="text-right" />
                        <SortableHeader column="dailyPL" label="Daily P&L" className="text-right" />
                        <SortableHeader column="quantity" label="Qty" className="text-right" />
                        <SortableHeader column="avgCost" label="Avg Cost" className="text-right" />
                        <SortableHeader column="marketValue" label="Market Value" className="text-right" />
                        <TableHead className="text-right">Weight</TableHead>
                        <SortableHeader column="gainLoss" label="Gain/Loss" className="text-right" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedHoldings.map((holding, idx) => {
                        const totalFiltered = sortedHoldings.reduce((sum, h) => sum + h.market_value, 0);
                        const weight = totalFiltered > 0 ? (holding.market_value / totalFiltered) * 100 : 0;
                        const ltpVsYcp = holding.ltp - holding.ycp;
                        const ltpColor = ltpVsYcp > 0 ? 'text-emerald-400' : ltpVsYcp < 0 ? 'text-red-400' : 'text-foreground';
                        return (
                          <TableRow key={holding.symbol} className="border-border/50 hover:bg-[#40BABD]/5">
                            <TableCell className="font-medium text-[#40BABD]">{holding.symbol}</TableCell>
                            <TableCell className={`text-right font-medium ${ltpColor}`}>
                              {holding.ltp > 0 ? formatCurrency(holding.ltp, 'BDT', true) : '-'}
                            </TableCell>
                            <TableCell className="text-right">
                              <span className={holding.day_change >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                                {holding.day_change !== 0 ? (
                                  <>
                                    {holding.day_change > 0 ? '+' : ''}
                                    {holding.day_change.toFixed(2)} ({holding.day_change_percent.toFixed(2)}%)
                                  </>
                                ) : '-'}
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
                              {(() => {
                                const dailyPL = holding.day_change * holding.quantity;
                                return dailyPL !== 0 ? (
                                  <span className={dailyPL >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                                    {dailyPL > 0 ? '+' : ''}{formatCurrency(dailyPL)}
                                  </span>
                                ) : '-';
                              })()}
                            </TableCell>
                            <TableCell className="text-right">{holding.quantity.toLocaleString()}</TableCell>
                            <TableCell className="text-right">{formatCurrency(holding.average_cost, 'BDT', true)}</TableCell>
                            <TableCell className="text-right font-medium">{formatCurrency(holding.market_value)}</TableCell>
                            <TableCell className="text-right text-muted-foreground">{weight.toFixed(1)}%</TableCell>
                            <TableCell className="text-right">
                              <span className={holding.unrealized_gain >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                                {holding.unrealized_gain >= 0 ? '+' : ''}{formatCurrency(holding.unrealized_gain)}
                              </span>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      {/* Totals Row */}
                      {holdingsTotals && (
                        <TableRow className="border-t-2 border-[#40BABD]/30 bg-secondary/50 font-bold sticky bottom-0">
                          <TableCell className="font-bold">TOTAL</TableCell>
                          <TableCell></TableCell>
                          <TableCell></TableCell>
                          <TableCell className="text-right">
                            <span className={holdingsTotals.dailyPL >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                              {holdingsTotals.dailyPL > 0 ? '+' : ''}{formatCurrency(holdingsTotals.dailyPL)}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">{holdingsTotals.quantity.toLocaleString()}</TableCell>
                          <TableCell></TableCell>
                          <TableCell className="text-right font-bold">{formatCurrency(holdingsTotals.marketValue)}</TableCell>
                          <TableCell className="text-right">100%</TableCell>
                          <TableCell className="text-right">
                            <span className={holdingsTotals.unrealizedGain >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                              {holdingsTotals.unrealizedGain >= 0 ? '+' : ''}{formatCurrency(holdingsTotals.unrealizedGain)}
                            </span>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </ScrollArea>
              )}
            </CardContent>
          </Card>

          {/* Market Summary */}
          <Card className="col-span-3 bg-card/60 backdrop-blur-sm border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Activity className="w-5 h-5 text-[#40BABD]" />
                Account Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-4">
                {accounts?.slice(0, 4).map((account, idx) => {
                  const loanCash = account.cash_balance + (account.margin_balance || 0);
                  const equity = account.equity_at_market + loanCash - account.private_equity_value;
                  const changePercent = account.total_cost_basis > 0 
                    ? ((account.total_unrealized_gain / account.total_cost_basis) * 100) 
                    : 0;
                  
                  return (
                    <motion.div
                      key={account.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: idx * 0.1 }}
                      className="p-4 rounded-xl bg-secondary/30 border border-border/50 hover:border-[#40BABD]/50 transition-colors cursor-pointer"
                    >
                      <p className="text-sm text-muted-foreground mb-1 truncate">
                        {account.account_name || account.account_number}
                      </p>
                      <p className="text-xl font-bold mb-2">{formatCompactCurrency(equity)}</p>
                      <div className={`flex items-center gap-1 text-sm ${changePercent >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {changePercent >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                        {changePercent >= 0 ? '+' : ''}{changePercent.toFixed(2)}%
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default PortfolioPortal;
