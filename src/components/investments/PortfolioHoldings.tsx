import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/lib/formatters';
import { Layers, Search, ArrowUpDown, Users, Filter, Download, Tag } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

const CLASSIFICATION_OPTIONS = [
  { value: 'none', label: 'None' },
  { value: 'placement', label: 'Placement' },
  { value: 'open-end', label: 'Open End' },
  { value: 'closed-end', label: 'Closed End' },
  { value: 'ipo', label: 'IPO' },
  { value: 'rights', label: 'Rights' },
];
interface HoldingWithPortfolio {
  id: string;
  symbol: string;
  company_name: string | null;
  quantity: number;
  average_cost: number;
  cost_basis: number;
  current_price: number;
  market_value: number;
  unrealized_gain: number;
  unrealized_gain_percent: number | null;
  portfolio_id: string;
  account_number: string;
  account_name: string | null;
  broker_name: string | null;
  classification: string | null;
}

interface AggregatedHolding {
  symbol: string;
  company_name: string | null;
  quantity: number;
  cost_basis: number;
  market_value: number;
  average_cost: number;
  current_price: number;
  unrealized_gain: number;
  unrealized_gain_percent: number;
  weight: number;
  accounts: string[];
  brokers: string[];
  classification: string | null;
}

type SortField = 'symbol' | 'account_number' | 'broker_name' | 'quantity' | 'average_cost' | 'cost_basis' | 'current_price' | 'market_value' | 'weight' | 'classification';
type SortDirection = 'asc' | 'desc';

export const PortfolioHoldings = () => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField>('symbol');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [aggregateView, setAggregateView] = useState(false);
  const [brokerFilter, setBrokerFilter] = useState<string>('all');
  const [accountFilter, setAccountFilter] = useState<string>('all');
  const [classificationFilter, setClassificationFilter] = useState<string>('all');

  const { data: holdings, isLoading } = useQuery({
    queryKey: ['all-holdings'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data: portfolios } = await supabase
        .from('portfolios')
        .select('id, account_number, account_name, broker_name, as_of_date, created_at')
        .order('as_of_date', { ascending: false })
        .order('created_at', { ascending: false });

      if (!portfolios || portfolios.length === 0) return [];

      // Get latest portfolio per account for holdings
      const uniquePortfolios = new Map<string, typeof portfolios[0]>();
      for (const p of portfolios) {
        if (!uniquePortfolios.has(p.account_number)) {
          uniquePortfolios.set(p.account_number, p);
        }
      }

      const portfolioIds = Array.from(uniquePortfolios.values()).map(p => p.id);

      const { data: holdingsData } = await supabase
        .from('holdings')
        .select('*')
        .in('portfolio_id', portfolioIds);

      if (!holdingsData) return [];

      // Get ALL holdings to find the latest price for each symbol
      // We need prices from the most recent portfolio that contains each symbol
      const { data: allHoldings } = await supabase
        .from('holdings')
        .select('symbol, current_price, portfolio_id');

      // Build a map of symbol -> latest price by checking portfolio order
      const latestPriceMap = new Map<string, number>();
      const portfolioOrderMap = new Map<string, number>();
      portfolios.forEach((p, index) => portfolioOrderMap.set(p.id, index));
      
      // Sort all holdings by portfolio recency (lower index = more recent)
      const sortedAllHoldings = [...(allHoldings || [])].sort((a, b) => {
        const aOrder = portfolioOrderMap.get(a.portfolio_id) ?? 999;
        const bOrder = portfolioOrderMap.get(b.portfolio_id) ?? 999;
        return aOrder - bOrder;
      });
      
      // Take the first (most recent) price for each symbol
      sortedAllHoldings.forEach(h => {
        if (!latestPriceMap.has(h.symbol)) {
          latestPriceMap.set(h.symbol, h.current_price);
        }
      });

      const holdingsWithPortfolio: HoldingWithPortfolio[] = holdingsData.map(h => {
        const portfolio = Array.from(uniquePortfolios.values()).find(p => p.id === h.portfolio_id);
        // Use latest price if available, otherwise use the holding's own price
        const latestPrice = latestPriceMap.get(h.symbol) ?? h.current_price;
        const newMarketValue = h.quantity * latestPrice;
        const newUnrealizedGain = newMarketValue - h.cost_basis;
        const newUnrealizedGainPercent = h.cost_basis > 0 ? (newUnrealizedGain / h.cost_basis) * 100 : 0;
        
        return {
          ...h,
          current_price: latestPrice,
          market_value: newMarketValue,
          unrealized_gain: newUnrealizedGain,
          unrealized_gain_percent: newUnrealizedGainPercent,
          account_number: portfolio?.account_number || '',
          account_name: portfolio?.account_name || null,
          broker_name: portfolio?.broker_name || null,
        };
      });

      return holdingsWithPortfolio;
    },
  });

  // Get unique brokers and accounts for filters
  const { brokers, accounts } = useMemo(() => {
    if (!holdings) return { brokers: [], accounts: [] };
    const brokerSet = new Set<string>();
    const accountSet = new Set<string>();
    holdings.forEach(h => {
      if (h.broker_name) brokerSet.add(h.broker_name);
      if (h.account_number) accountSet.add(h.account_number);
    });
    return { 
      brokers: Array.from(brokerSet).sort(), 
      accounts: Array.from(accountSet).sort() 
    };
  }, [holdings]);


  // Apply filters
  const filteredHoldings = useMemo(() => {
    return holdings?.filter(h => {
      const matchesSearch = h.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
        h.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        h.account_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        h.broker_name?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesBroker = brokerFilter === 'all' || h.broker_name === brokerFilter;
      const matchesAccount = accountFilter === 'all' || h.account_number === accountFilter;
      const matchesClassification = classificationFilter === 'all' || 
        (classificationFilter === 'none' ? !h.classification : h.classification === classificationFilter);
      return matchesSearch && matchesBroker && matchesAccount && matchesClassification;
    }) || [];
  }, [holdings, searchTerm, brokerFilter, accountFilter, classificationFilter]);

  // Calculate total market value for weightage based on filtered holdings
  const filteredTotalMarketValue = useMemo(() => {
    return filteredHoldings.reduce((acc, h) => acc + h.market_value, 0);
  }, [filteredHoldings]);

  // Aggregate holdings by symbol
  const aggregatedHoldings = useMemo((): AggregatedHolding[] => {
    if (!aggregateView) return [];
    
    const aggregated = new Map<string, AggregatedHolding>();
    
    filteredHoldings.forEach(h => {
      const existing = aggregated.get(h.symbol);
      if (existing) {
        existing.quantity += h.quantity;
        existing.cost_basis += h.cost_basis;
        existing.market_value += h.market_value;
        existing.average_cost = existing.cost_basis / existing.quantity;
        existing.unrealized_gain = existing.market_value - existing.cost_basis;
        existing.unrealized_gain_percent = existing.cost_basis > 0 
          ? ((existing.market_value - existing.cost_basis) / existing.cost_basis) * 100 
          : 0;
        existing.weight = filteredTotalMarketValue > 0 ? (existing.market_value / filteredTotalMarketValue) * 100 : 0;
        if (!existing.accounts.includes(h.account_number)) {
          existing.accounts.push(h.account_number);
        }
        if (h.broker_name && !existing.brokers.includes(h.broker_name)) {
          existing.brokers.push(h.broker_name);
        }
      } else {
        const weight = filteredTotalMarketValue > 0 ? (h.market_value / filteredTotalMarketValue) * 100 : 0;
        aggregated.set(h.symbol, {
          symbol: h.symbol,
          company_name: h.company_name,
          quantity: h.quantity,
          cost_basis: h.cost_basis,
          market_value: h.market_value,
          average_cost: h.average_cost,
          current_price: h.current_price,
          unrealized_gain: h.unrealized_gain,
          unrealized_gain_percent: h.unrealized_gain_percent || 0,
          weight,
          accounts: [h.account_number],
          brokers: h.broker_name ? [h.broker_name] : [],
          classification: h.classification,
        });
      }
    });

    return Array.from(aggregated.values());
  }, [filteredHoldings, aggregateView, filteredTotalMarketValue]);

  // Mutation to update classification
  const classificationMutation = useMutation({
    mutationFn: async ({ symbol, classification }: { symbol: string; classification: string | null }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Update all holdings with this symbol
      const { error: holdingsError } = await supabase
        .from('holdings')
        .update({ classification })
        .eq('symbol', symbol)
        .eq('user_id', user.id);

      if (holdingsError) throw holdingsError;

      // Upsert the classification preference for future uploads
      if (classification && classification !== 'none') {
        const { error: classError } = await supabase
          .from('holding_classifications')
          .upsert({
            user_id: user.id,
            symbol,
            classification,
          }, { onConflict: 'user_id,symbol' });

        if (classError) throw classError;
      } else {
        // Remove classification preference
        await supabase
          .from('holding_classifications')
          .delete()
          .eq('user_id', user.id)
          .eq('symbol', symbol);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-holdings'] });
      queryClient.invalidateQueries({ queryKey: ['private-equity-calculation'] });
      toast.success('Classification updated');
    },
    onError: (error) => {
      toast.error('Failed to update classification');
      console.error(error);
    },
  });

  const handleClassificationChange = (symbol: string, value: string) => {
    classificationMutation.mutate({ 
      symbol, 
      classification: value === 'none' ? null : value 
    });
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Sort data based on view type
  const sortedData = useMemo(() => {
    const data = aggregateView ? aggregatedHoldings : filteredHoldings;
    
    return [...data].sort((a, b) => {
      let aVal: any = a[sortField as keyof typeof a];
      let bVal: any = b[sortField as keyof typeof b];
      
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDirection === 'asc' 
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }
      
      const aNum = Number(aVal) || 0;
      const bNum = Number(bVal) || 0;
      return sortDirection === 'asc' ? aNum - bNum : bNum - aNum;
    });
  }, [aggregateView, aggregatedHoldings, filteredHoldings, sortField, sortDirection]);

  // Calculate totals
  const totals = useMemo(() => {
    const data = aggregateView ? aggregatedHoldings : filteredHoldings;
    return data.reduce((acc, h) => ({
      quantity: acc.quantity + h.quantity,
      costBasis: acc.costBasis + h.cost_basis,
      marketValue: acc.marketValue + h.market_value,
    }), { quantity: 0, costBasis: 0, marketValue: 0 });
  }, [aggregateView, aggregatedHoldings, filteredHoldings]);

  // Export to CSV
  const exportToCSV = () => {
    const data = aggregateView ? aggregatedHoldings : filteredHoldings;
    
    let headers: string[];
    let rows: string[][];
    
    if (aggregateView) {
      headers = ['Instrument', 'Company', 'Accounts', 'Qty', 'Avg Cost', 'Total Cost', 'Market Price', 'Market Value', 'Weight %'];
      rows = (data as AggregatedHolding[]).map(h => [
        h.symbol,
        h.company_name || '',
        h.accounts.join('; '),
        h.quantity.toString(),
        h.average_cost.toFixed(2),
        h.cost_basis.toFixed(2),
        h.current_price.toFixed(2),
        h.market_value.toFixed(2),
        h.weight.toFixed(2)
      ]);
    } else {
      headers = ['Instrument', 'Company', 'Account', 'Broker', 'Qty', 'Avg Cost', 'Total Cost', 'Market Price', 'Market Value'];
      rows = (data as HoldingWithPortfolio[]).map(h => [
        h.symbol,
        h.company_name || '',
        h.account_number,
        h.broker_name || '',
        h.quantity.toString(),
        h.average_cost.toFixed(2),
        h.cost_basis.toFixed(2),
        h.current_price.toFixed(2),
        h.market_value.toFixed(2)
      ]);
    }
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `holdings_${aggregateView ? 'aggregated' : 'detailed'}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const SortableHeader = ({ field, children, className = '' }: { field: SortField; children: React.ReactNode; className?: string }) => (
    <TableHead 
      className={`text-muted-foreground cursor-pointer hover:text-foreground transition-colors ${className}`}
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center gap-1">
        {children}
        <ArrowUpDown className={`h-3 w-3 ${sortField === field ? 'text-primary' : 'opacity-50'}`} />
      </div>
    </TableHead>
  );

  if (isLoading) {
    return (
      <Card className="bg-card/50 border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5" />
            All Holdings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card/50 border-border/50">
      <CardHeader className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <CardTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5" />
            {aggregateView ? 'Aggregated Holdings' : 'All Holdings'}
            <span className="text-sm font-normal text-muted-foreground">
              ({sortedData.length} {aggregateView ? 'positions' : 'instruments'})
            </span>
          </CardTitle>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={exportToCSV}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              Export
            </Button>
            <div className="flex items-center space-x-2">
              <Switch
                id="aggregate-view"
                checked={aggregateView}
                onCheckedChange={setAggregateView}
              />
              <Label htmlFor="aggregate-view" className="flex items-center gap-1 text-sm cursor-pointer">
                <Users className="h-4 w-4" />
                Aggregate
              </Label>
            </div>
          </div>
        </div>
        
        {/* Filters Row */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search holdings..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 bg-background/50 border-border/50"
            />
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={brokerFilter} onValueChange={setBrokerFilter}>
              <SelectTrigger className="w-[130px] bg-background/50 border-border/50">
                <SelectValue placeholder="Broker" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Brokers</SelectItem>
                {brokers.map(b => (
                  <SelectItem key={b} value={b}>{b}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={accountFilter} onValueChange={setAccountFilter}>
              <SelectTrigger className="w-[130px] bg-background/50 border-border/50">
                <SelectValue placeholder="Account" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Accounts</SelectItem>
                {accounts.map(a => (
                  <SelectItem key={a} value={a}>{a}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={classificationFilter} onValueChange={setClassificationFilter}>
              <SelectTrigger className="w-[130px] bg-background/50 border-border/50">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {CLASSIFICATION_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-border/50 bg-muted/30">
                <SortableHeader field="symbol">Instrument</SortableHeader>
                {!aggregateView && (
                  <>
                    <SortableHeader field="account_number">Account</SortableHeader>
                    <SortableHeader field="broker_name">Broker</SortableHeader>
                  </>
                )}
                {aggregateView && (
                  <TableHead className="text-muted-foreground">Accounts</TableHead>
                )}
                <SortableHeader field="quantity">
                  <span className="text-right w-full">Qty</span>
                </SortableHeader>
                <SortableHeader field="average_cost">
                  <span className="text-right w-full">Avg Cost (৳)</span>
                </SortableHeader>
                <SortableHeader field="cost_basis">
                  <span className="text-right w-full">Total Cost (৳)</span>
                </SortableHeader>
                <SortableHeader field="current_price">
                  <span className="text-right w-full">Market Price (৳)</span>
                </SortableHeader>
                <SortableHeader field="market_value">
                  <span className="text-right w-full">Market Value (৳)</span>
                </SortableHeader>
                {aggregateView && (
                  <SortableHeader field="weight">
                    <span className="text-right w-full">Weight %</span>
                  </SortableHeader>
                )}
                <SortableHeader field="classification">
                  <span className="flex items-center gap-1"><Tag className="h-3 w-3" />Type</span>
                </SortableHeader>
              </TableRow>
            </TableHeader>
            <TableBody>
              {aggregateView ? (
                // Aggregated View
                (sortedData as AggregatedHolding[]).map((holding) => (
                  <TableRow key={holding.symbol} className="border-border/30 hover:bg-muted/20">
                    <TableCell>
                      <div>
                        <p className="font-medium">{holding.symbol}</p>
                        {holding.company_name && (
                          <p className="text-xs text-muted-foreground truncate max-w-[150px]">
                            {holding.company_name}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-xs space-y-0.5">
                        {holding.accounts.map(acc => (
                          <span key={acc} className="block font-mono text-muted-foreground">{acc}</span>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {holding.quantity.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(holding.average_cost, 'BDT', true)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(holding.cost_basis)}
                    </TableCell>
                    <TableCell className="text-right">
                      ৳{holding.current_price.toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(holding.market_value)}
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={`font-medium ${holding.weight >= 5 ? 'text-primary' : ''}`}>
                        {holding.weight.toFixed(2)}%
                      </span>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={holding.classification || 'none'}
                        onValueChange={(value) => handleClassificationChange(holding.symbol, value)}
                      >
                        <SelectTrigger className="w-[100px] h-8 text-xs bg-background/50 border-border/50">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CLASSIFICATION_OPTIONS.map(opt => (
                            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                // Detailed View
                (sortedData as HoldingWithPortfolio[]).map((holding) => (
                  <TableRow key={holding.id} className="border-border/30 hover:bg-muted/20">
                    <TableCell>
                      <div>
                        <p className="font-medium">{holding.symbol}</p>
                        {holding.company_name && (
                          <p className="text-xs text-muted-foreground truncate max-w-[150px]">
                            {holding.company_name}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{holding.account_number}</TableCell>
                    <TableCell>{holding.broker_name || '-'}</TableCell>
                    <TableCell className="text-right font-medium">
                      {holding.quantity.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(holding.average_cost, 'BDT', true)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(holding.cost_basis)}
                    </TableCell>
                    <TableCell className="text-right">
                      ৳{holding.current_price.toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(holding.market_value)}
                    </TableCell>
                    <TableCell>
                      <Select
                        value={holding.classification || 'none'}
                        onValueChange={(value) => handleClassificationChange(holding.symbol, value)}
                      >
                        <SelectTrigger className="w-[100px] h-8 text-xs bg-background/50 border-border/50">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CLASSIFICATION_OPTIONS.map(opt => (
                            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                ))
              )}

              {/* Totals Row */}
              {sortedData.length > 0 && (
                <TableRow className="border-t-2 border-primary/30 bg-muted/30 font-semibold">
                  <TableCell colSpan={aggregateView ? 2 : 3} className="text-right">Total</TableCell>
                  <TableCell className="text-right">{totals.quantity.toLocaleString()}</TableCell>
                  <TableCell className="text-right">-</TableCell>
                  <TableCell className="text-right">{formatCurrency(totals.costBasis)}</TableCell>
                  <TableCell className="text-right">-</TableCell>
                  <TableCell className="text-right">{formatCurrency(totals.marketValue)}</TableCell>
                  {aggregateView && <TableCell className="text-right">100%</TableCell>}
                  <TableCell />
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {sortedData.length === 0 && (
          <p className="text-center text-muted-foreground py-8">
            {searchTerm || brokerFilter !== 'all' || accountFilter !== 'all' 
              ? 'No holdings match your filters.' 
              : 'No holdings found. Upload a portfolio to see holdings.'}
          </p>
        )}
      </CardContent>
    </Card>
  );
};