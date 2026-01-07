import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  TrendingUp, TrendingDown, PieChart, BarChart3, Download, 
  RefreshCw, ArrowUpRight, ArrowDownRight,
  Briefcase, DollarSign, Percent, Activity, Trophy, AlertTriangle
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
import { useUniqueAccounts, useAggregatedHoldings } from '@/hooks/usePortfolios';
import { formatCurrency, formatCompactCurrency } from '@/lib/formatters';
import { PieChart as RechartsPie, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

const COLORS = ['#40BABD', '#2DD4BF', '#0EA5E9', '#8B5CF6', '#F59E0B', '#EF4444', '#10B981', '#6366F1'];

const PortfolioPortal = () => {
  const { data: accounts, isLoading } = useUniqueAccounts();
  const [excludedTypes, setExcludedTypes] = useState<string[]>([]);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  
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

  // Calculate holdings totals and performance metrics
  const { holdingsTotals, performanceMetrics } = useMemo(() => {
    if (!sortedHoldings || sortedHoldings.length === 0) {
      return { 
        holdingsTotals: null, 
        performanceMetrics: { dailyPL: 0, totalGain: 0, winners: 0, losers: 0, neutral: 0 } 
      };
    }
    
    const totals = sortedHoldings.reduce((acc, holding) => ({
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

    const winners = sortedHoldings.filter(h => h.unrealized_gain > 0).length;
    const losers = sortedHoldings.filter(h => h.unrealized_gain < 0).length;
    const neutral = sortedHoldings.length - winners - losers;

    return { 
      holdingsTotals: totals, 
      performanceMetrics: { 
        dailyPL: totals.dailyPL, 
        totalGain: totals.unrealizedGain, 
        winners, 
        losers, 
        neutral 
      } 
    };
  }, [sortedHoldings]);

  const toggleTypeFilter = (typeKey: string) => {
    setExcludedTypes(prev => 
      prev.includes(typeKey) 
        ? prev.filter(t => t !== typeKey)
        : [...prev, typeKey]
    );
  };

  // Calculate totals from all accounts with correct Stocks-only Equity formula
  const totals = accounts?.reduce((acc, portfolio) => {
    const stocksOnlyEquity = portfolio.total_market_value 
      - portfolio.private_equity_value 
      + portfolio.cash_balance 
      - (portfolio.margin_balance || 0) 
      - portfolio.accrued_fees;
    
    return {
      invested: acc.invested + portfolio.total_cost_basis,
      currentValue: acc.currentValue + portfolio.total_market_value,
      stocksOnlyEquity: acc.stocksOnlyEquity + stocksOnlyEquity,
      unrealizedGain: acc.unrealizedGain + portfolio.total_unrealized_gain,
      realizedGain: acc.realizedGain + portfolio.total_realized_gain,
      dividends: acc.dividends + portfolio.total_dividends_received,
    };
  }, { invested: 0, currentValue: 0, stocksOnlyEquity: 0, unrealizedGain: 0, realizedGain: 0, dividends: 0 }) || { invested: 0, currentValue: 0, stocksOnlyEquity: 0, unrealizedGain: 0, realizedGain: 0, dividends: 0 };

  const returnPercent = totals.invested > 0 
    ? ((totals.unrealizedGain / totals.invested) * 100).toFixed(2) 
    : '0.00';

  // Top 5 holdings for allocation legend
  const topHoldings = useMemo(() => {
    return allocationData.slice(0, 5);
  }, [allocationData]);

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

        <div className="p-6 space-y-6">
          {/* Combined Metrics + Asset Allocation Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="bg-gradient-to-br from-card to-card/80 border-border/50 overflow-hidden">
              <CardContent className="p-0">
                <div className="grid grid-cols-3">
                  {/* Metrics Grid - 2/3 width */}
                  <div className="col-span-2 p-6">
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <h2 className="text-xl font-bold">Portfolio Overview</h2>
                        <p className="text-sm text-muted-foreground">Real-time portfolio performance</p>
                      </div>
                      <Button variant="outline" size="sm">
                        <Download className="w-4 h-4 mr-2" />
                        Export
                      </Button>
                    </div>
                    
                    {isLoading ? (
                      <div className="grid grid-cols-2 gap-4">
                        {Array(4).fill(0).map((_, i) => (
                          <Skeleton key={i} className="h-24" />
                        ))}
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-4">
                        {/* Market Value */}
                        <div className="p-4 rounded-xl bg-secondary/30 border border-border/50">
                          <div className="flex items-center gap-2 mb-2">
                            <Briefcase className="w-4 h-4 text-[#40BABD]" />
                            <span className="text-sm text-muted-foreground">Market Value</span>
                          </div>
                          <p className="text-2xl font-bold">{formatCompactCurrency(totals.currentValue)}</p>
                        </div>

                        {/* Invested */}
                        <div className="p-4 rounded-xl bg-secondary/30 border border-border/50">
                          <div className="flex items-center gap-2 mb-2">
                            <DollarSign className="w-4 h-4 text-[#40BABD]" />
                            <span className="text-sm text-muted-foreground">Invested</span>
                          </div>
                          <p className="text-2xl font-bold">{formatCompactCurrency(totals.invested)}</p>
                        </div>

                        {/* Unrealized Gain/Loss */}
                        <div className="p-4 rounded-xl bg-secondary/30 border border-border/50">
                          <div className="flex items-center gap-2 mb-2">
                            <TrendingUp className="w-4 h-4 text-[#40BABD]" />
                            <span className="text-sm text-muted-foreground">Unrealized Gain/Loss</span>
                          </div>
                          <div className="flex items-baseline gap-2">
                            <p className={`text-2xl font-bold ${totals.unrealizedGain >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                              {totals.unrealizedGain >= 0 ? '+' : ''}{formatCompactCurrency(totals.unrealizedGain)}
                            </p>
                            <span className={`text-sm ${totals.unrealizedGain >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                              ({returnPercent}%)
                            </span>
                          </div>
                        </div>

                        {/* Dividends */}
                        <div className="p-4 rounded-xl bg-secondary/30 border border-border/50">
                          <div className="flex items-center gap-2 mb-2">
                            <Percent className="w-4 h-4 text-[#40BABD]" />
                            <span className="text-sm text-muted-foreground">Dividends</span>
                          </div>
                          <p className="text-2xl font-bold">{formatCompactCurrency(totals.dividends)}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Asset Allocation - 1/3 width */}
                  <div className="col-span-1 p-6 border-l border-border/50 bg-secondary/10">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <PieChart className="w-4 h-4 text-[#40BABD]" />
                        <span className="text-sm font-medium">Asset Allocation</span>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {filteredCount} positions
                      </Badge>
                    </div>

                    {isLoadingAggregated ? (
                      <Skeleton className="h-[140px] w-full" />
                    ) : allocationData.length === 0 ? (
                      <div className="h-[140px] flex items-center justify-center text-muted-foreground text-sm">
                        No holdings
                      </div>
                    ) : (
                      <>
                        <ResponsiveContainer width="100%" height={140}>
                          <RechartsPie>
                            <Pie
                              data={allocationData}
                              cx="50%"
                              cy="50%"
                              innerRadius={40}
                              outerRadius={65}
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

                        {/* Compact Legend - Top 5 */}
                        <div className="space-y-1.5 mt-3">
                          {topHoldings.map((item, idx) => (
                            <div key={idx} className="flex items-center justify-between text-xs">
                              <div className="flex items-center gap-1.5">
                                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                                <span className="text-muted-foreground truncate max-w-[80px]">{item.name}</span>
                              </div>
                              <span className="font-medium">{item.weight.toFixed(1)}%</span>
                            </div>
                          ))}
                          {allocationData.length > 5 && (
                            <div className="text-xs text-muted-foreground text-center pt-1">
                              +{allocationData.length - 5} more
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* All Holdings Card with Performance Metrics */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="bg-card/60 backdrop-blur-sm border-border/50">
              <CardHeader className="pb-3">
                {/* Performance Summary Bar */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-[#40BABD]" />
                    <CardTitle className="text-lg">All Holdings</CardTitle>
                    <Badge variant="secondary">
                      {filteredCount === totalCount ? `${totalCount}` : `${filteredCount} of ${totalCount}`}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    {/* Performance Metrics */}
                    <div className="flex items-center gap-6 px-4 py-2 rounded-lg bg-secondary/30">
                      <div>
                        <span className="text-xs text-muted-foreground block">Daily P&L</span>
                        <span className={`text-sm font-bold ${performanceMetrics.dailyPL >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {performanceMetrics.dailyPL > 0 ? '+' : ''}{formatCurrency(performanceMetrics.dailyPL)}
                        </span>
                      </div>
                      <div className="h-8 w-px bg-border" />
                      <div>
                        <span className="text-xs text-muted-foreground block">Total Gain</span>
                        <span className={`text-sm font-bold ${performanceMetrics.totalGain >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {performanceMetrics.totalGain > 0 ? '+' : ''}{formatCompactCurrency(performanceMetrics.totalGain)}
                        </span>
                      </div>
                      <div className="h-8 w-px bg-border" />
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1">
                          <Trophy className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-sm font-medium text-emerald-400">{performanceMetrics.winners}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                          <span className="text-sm font-medium text-red-400">{performanceMetrics.losers}</span>
                        </div>
                      </div>
                    </div>

                    <Button variant="ghost" size="sm">
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Refresh
                    </Button>
                  </div>
                </div>

                {/* Filter Buttons */}
                {classificationTypes.length > 1 && (
                  <div className="flex flex-wrap gap-2 mt-4">
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
              </CardHeader>

              <CardContent>
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
                  <>
                    <ScrollArea className="max-h-[500px]">
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
                          {sortedHoldings.map((holding) => {
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
                        </TableBody>
                      </Table>
                    </ScrollArea>
                    
                    {/* Totals Row - Sticky below ScrollArea */}
                    {holdingsTotals && (
                      <div className="border-t-2 border-[#40BABD]/30 bg-secondary/50 px-4 py-3 mt-2 rounded-b-lg">
                        <div className="grid grid-cols-9 gap-4 font-bold text-sm">
                          <div>TOTAL</div>
                          <div></div>
                          <div></div>
                          <div className="text-right">
                            <span className={holdingsTotals.dailyPL >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                              {holdingsTotals.dailyPL > 0 ? '+' : ''}{formatCurrency(holdingsTotals.dailyPL)}
                            </span>
                          </div>
                          <div className="text-right">{holdingsTotals.quantity.toLocaleString()}</div>
                          <div></div>
                          <div className="text-right">{formatCurrency(holdingsTotals.marketValue)}</div>
                          <div className="text-right">100%</div>
                          <div className="text-right">
                            <span className={holdingsTotals.unrealizedGain >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                              {holdingsTotals.unrealizedGain >= 0 ? '+' : ''}{formatCurrency(holdingsTotals.unrealizedGain)}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </main>
    </div>
  );
};

export default PortfolioPortal;
