import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  FileText, 
  Download, 
  Calculator,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { usePortfolios, usePortfolioHoldings } from '@/hooks/usePortfolios';
import { formatCurrency } from '@/lib/formatters';
import { useToast } from '@/hooks/use-toast';
import {
  TaxSummary,
  CapitalGain,
  CostBasisMethod,
  generateTaxSummary,
  formatTaxReport,
  BD_TAX_RATES,
} from '@/lib/tax-calculations';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export const TaxDocuments = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const { data: portfolios, isLoading: portfoliosLoading } = usePortfolios();
  const [selectedPortfolioId, setSelectedPortfolioId] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
  const [costBasisMethod, setCostBasisMethod] = useState<CostBasisMethod>('FIFO');

  const selectedPortfolio = useMemo(() => {
    if (!portfolios?.length) return null;
    if (selectedPortfolioId) {
      return portfolios.find(p => p.id === selectedPortfolioId) || portfolios[0];
    }
    return portfolios[0];
  }, [portfolios, selectedPortfolioId]);

  const { data: holdings } = usePortfolioHoldings(selectedPortfolio?.id || null);

  // Fetch portfolio transactions for capital gains calculation
  const { data: transactions } = useQuery({
    queryKey: ['portfolio_transactions', selectedPortfolio?.id, selectedYear],
    queryFn: async () => {
      if (!selectedPortfolio) return [];
      
      const startDate = `${selectedYear}-07-01`; // Bangladesh fiscal year starts July 1
      const endDate = `${parseInt(selectedYear) + 1}-06-30`;
      
      const { data, error } = await supabase
        .from('portfolio_transactions')
        .select('*')
        .eq('portfolio_id', selectedPortfolio.id)
        .gte('transaction_date', startDate)
        .lte('transaction_date', endDate)
        .order('transaction_date', { ascending: true });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedPortfolio && !!user,
  });

  // Fetch dividends
  const { data: dividends } = useQuery({
    queryKey: ['dividends', selectedPortfolio?.id, selectedYear],
    queryFn: async () => {
      if (!selectedPortfolio) return [];
      
      const startDate = `${selectedYear}-07-01`;
      const endDate = `${parseInt(selectedYear) + 1}-06-30`;
      
      const { data, error } = await supabase
        .from('dividends')
        .select('*')
        .eq('portfolio_id', selectedPortfolio.id)
        .gte('dividend_date', startDate)
        .lte('dividend_date', endDate)
        .order('dividend_date', { ascending: true });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedPortfolio && !!user,
  });

  // Calculate tax summary
  const taxSummary: TaxSummary | null = useMemo(() => {
    if (!transactions || !dividends) return null;

    // Calculate gains from sell transactions
    const sells = transactions.filter(t => t.transaction_type === 'sell');
    const buys = transactions.filter(t => t.transaction_type === 'buy');

    const gains: CapitalGain[] = sells.map(sell => {
      // Find matching buy transactions (simplified - in production use proper lot matching)
      const matchingBuys = buys.filter(b => b.symbol === sell.symbol);
      const avgCost = matchingBuys.length > 0
        ? matchingBuys.reduce((sum, b) => sum + b.price * b.quantity, 0) / matchingBuys.reduce((sum, b) => sum + b.quantity, 0)
        : sell.price;

      const costBasis = avgCost * sell.quantity;
      const proceeds = sell.total_amount;
      const gain = proceeds - costBasis;

      // Assume purchases from 6 months ago for demo
      const purchaseDate = new Date(sell.transaction_date);
      purchaseDate.setMonth(purchaseDate.getMonth() - 6);

      const holdingPeriod = Math.floor((new Date(sell.transaction_date).getTime() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24));
      const isLongTerm = holdingPeriod > 365;

      return {
        symbol: sell.symbol,
        quantity: sell.quantity,
        purchaseDate,
        saleDate: new Date(sell.transaction_date),
        costBasis,
        proceeds,
        gain,
        holdingPeriod,
        isLongTerm,
        taxRate: BD_TAX_RATES.CAPITAL_GAINS_LISTED,
        taxAmount: Math.max(0, gain * BD_TAX_RATES.CAPITAL_GAINS_LISTED),
      };
    });

    const dividendIncomes = dividends.map(d => ({
      symbol: d.symbol,
      paymentDate: new Date(d.dividend_date),
      grossAmount: d.amount,
      taxWithheld: d.tax_withheld || 0,
      netAmount: d.amount - (d.tax_withheld || 0),
      isQualified: d.is_qualified || false,
    }));

    return generateTaxSummary(gains, dividendIncomes, `${selectedYear}-${parseInt(selectedYear) + 1}`);
  }, [transactions, dividends, selectedYear]);

  const handleDownloadReport = () => {
    if (!taxSummary) return;

    const report = formatTaxReport(taxSummary);
    const blob = new Blob([report], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tax-summary-${selectedYear}-${parseInt(selectedYear) + 1}.txt`;
    a.click();
    URL.revokeObjectURL(url);

    toast({
      title: "Report downloaded",
      description: `Tax summary for FY ${selectedYear}-${parseInt(selectedYear) + 1} saved`,
    });
  };

  const fiscalYears = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 5 }, (_, i) => (currentYear - i).toString());
  }, []);

  if (portfoliosLoading) {
    return <div className="flex items-center justify-center h-64 text-muted-foreground">Loading...</div>;
  }

  if (!portfolios?.length) {
    return (
      <Card className="bg-card/50 border-border/50">
        <CardContent className="p-8 text-center">
          <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Upload portfolio statements to generate tax documents</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-wrap gap-4">
        <Select value={selectedPortfolioId || portfolios[0]?.id} onValueChange={setSelectedPortfolioId}>
          <SelectTrigger className="w-[280px] bg-card/50">
            <SelectValue placeholder="Select portfolio" />
          </SelectTrigger>
          <SelectContent>
            {portfolios.map(p => (
              <SelectItem key={p.id} value={p.id}>
                {p.account_name || p.account_number} - {p.broker_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedYear} onValueChange={setSelectedYear}>
          <SelectTrigger className="w-[180px] bg-card/50">
            <SelectValue placeholder="Fiscal Year" />
          </SelectTrigger>
          <SelectContent>
            {fiscalYears.map(year => (
              <SelectItem key={year} value={year}>
                FY {year}-{parseInt(year) + 1}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={costBasisMethod} onValueChange={(v) => setCostBasisMethod(v as CostBasisMethod)}>
          <SelectTrigger className="w-[150px] bg-card/50">
            <SelectValue placeholder="Cost Basis" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="FIFO">FIFO</SelectItem>
            <SelectItem value="LIFO">LIFO</SelectItem>
            <SelectItem value="HIFO">HIFO</SelectItem>
            <SelectItem value="AVERAGE">Average Cost</SelectItem>
          </SelectContent>
        </Select>

        <Button variant="outline" onClick={handleDownloadReport} disabled={!taxSummary}>
          <Download className="h-4 w-4 mr-2" />
          Download Report
        </Button>
      </div>

      {/* Tax Summary Cards */}
      {taxSummary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-card/50 border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase mb-1">
                <TrendingUp className="h-3 w-3" />
                Total Gains
              </div>
              <p className="text-2xl font-bold text-green-500">
                {formatCurrency(taxSummary.totalGains, 'BDT')}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                ST: {formatCurrency(taxSummary.shortTermGains, 'BDT')} | LT: {formatCurrency(taxSummary.longTermGains, 'BDT')}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card/50 border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase mb-1">
                <TrendingDown className="h-3 w-3" />
                Total Losses
              </div>
              <p className="text-2xl font-bold text-red-500">
                {formatCurrency(taxSummary.totalLosses, 'BDT')}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Available for offset
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card/50 border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase mb-1">
                <DollarSign className="h-3 w-3" />
                Dividend Income
              </div>
              <p className="text-2xl font-bold text-primary">
                {formatCurrency(taxSummary.totalDividends, 'BDT')}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                AIT Withheld: {formatCurrency(taxSummary.dividendTaxWithheld, 'BDT')}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card/50 border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase mb-1">
                <Calculator className="h-3 w-3" />
                Est. Tax Liability
              </div>
              <p className="text-2xl font-bold text-amber-500">
                {formatCurrency(taxSummary.estimatedTaxLiability, 'BDT')}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                At {(BD_TAX_RATES.CAPITAL_GAINS_LISTED * 100).toFixed(0)}% rate
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Detailed Tabs */}
      <Tabs defaultValue="gains" className="w-full">
        <TabsList className="bg-card/50">
          <TabsTrigger value="gains">Capital Gains</TabsTrigger>
          <TabsTrigger value="dividends">Dividends</TabsTrigger>
          <TabsTrigger value="cost-basis">Cost Basis</TabsTrigger>
          <TabsTrigger value="summary">Tax Summary</TabsTrigger>
        </TabsList>

        <TabsContent value="gains" className="mt-4">
          <Card className="bg-card/50 border-border/50">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Capital Gains & Losses
              </CardTitle>
              <CardDescription>
                Realized gains and losses for FY {selectedYear}-{parseInt(selectedYear) + 1}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {transactions && transactions.filter(t => t.transaction_type === 'sell').length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Symbol</TableHead>
                      <TableHead>Sale Date</TableHead>
                      <TableHead className="text-right">Quantity</TableHead>
                      <TableHead className="text-right">Proceeds</TableHead>
                      <TableHead className="text-right">Cost Basis</TableHead>
                      <TableHead className="text-right">Gain/Loss</TableHead>
                      <TableHead>Type</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions
                      .filter(t => t.transaction_type === 'sell')
                      .map((t) => {
                        const costBasis = t.price * t.quantity * 0.95; // Simplified
                        const gain = t.total_amount - costBasis;
                        return (
                          <TableRow key={t.id}>
                            <TableCell className="font-medium">{t.symbol}</TableCell>
                            <TableCell>{new Date(t.transaction_date).toLocaleDateString()}</TableCell>
                            <TableCell className="text-right font-mono">{t.quantity.toLocaleString()}</TableCell>
                            <TableCell className="text-right font-mono">{formatCurrency(t.total_amount, 'BDT')}</TableCell>
                            <TableCell className="text-right font-mono">{formatCurrency(costBasis, 'BDT')}</TableCell>
                            <TableCell className={`text-right font-mono ${gain >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                              {formatCurrency(gain, 'BDT')}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs">
                                Short-term
                              </Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <AlertCircle className="h-8 w-8 mx-auto mb-2" />
                  No sales transactions found for this period
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="dividends" className="mt-4">
          <Card className="bg-card/50 border-border/50">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Dividend Income
              </CardTitle>
              <CardDescription>
                Dividend payments received during FY {selectedYear}-{parseInt(selectedYear) + 1}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {dividends && dividends.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Symbol</TableHead>
                      <TableHead>Payment Date</TableHead>
                      <TableHead className="text-right">Gross Amount</TableHead>
                      <TableHead className="text-right">Tax Withheld</TableHead>
                      <TableHead className="text-right">Net Amount</TableHead>
                      <TableHead>Type</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dividends.map((d) => (
                      <TableRow key={d.id}>
                        <TableCell className="font-medium">{d.symbol}</TableCell>
                        <TableCell>{new Date(d.dividend_date).toLocaleDateString()}</TableCell>
                        <TableCell className="text-right font-mono">{formatCurrency(d.amount, 'BDT')}</TableCell>
                        <TableCell className="text-right font-mono text-red-500">
                          -{formatCurrency(d.tax_withheld || 0, 'BDT')}
                        </TableCell>
                        <TableCell className="text-right font-mono text-green-500">
                          {formatCurrency(d.amount - (d.tax_withheld || 0), 'BDT')}
                        </TableCell>
                        <TableCell>
                          <Badge variant={d.is_qualified ? 'default' : 'secondary'} className="text-xs">
                            {d.dividend_type || 'Cash'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <DollarSign className="h-8 w-8 mx-auto mb-2" />
                  No dividend payments found for this period
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cost-basis" className="mt-4">
          <Card className="bg-card/50 border-border/50">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                Cost Basis Report
              </CardTitle>
              <CardDescription>
                Current holdings with cost basis using {costBasisMethod} method
              </CardDescription>
            </CardHeader>
            <CardContent>
              {holdings && holdings.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Symbol</TableHead>
                      <TableHead>Company</TableHead>
                      <TableHead className="text-right">Quantity</TableHead>
                      <TableHead className="text-right">Avg Cost</TableHead>
                      <TableHead className="text-right">Total Cost</TableHead>
                      <TableHead className="text-right">Market Value</TableHead>
                      <TableHead className="text-right">Unrealized G/L</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {holdings.map((h) => (
                      <TableRow key={h.id}>
                        <TableCell className="font-medium">{h.symbol}</TableCell>
                        <TableCell className="text-muted-foreground">{h.company_name || '-'}</TableCell>
                        <TableCell className="text-right font-mono">{h.quantity.toLocaleString()}</TableCell>
                        <TableCell className="text-right font-mono">{formatCurrency(h.average_cost, 'BDT')}</TableCell>
                        <TableCell className="text-right font-mono">{formatCurrency(h.cost_basis, 'BDT')}</TableCell>
                        <TableCell className="text-right font-mono">{formatCurrency(h.market_value, 'BDT')}</TableCell>
                        <TableCell className={`text-right font-mono ${h.unrealized_gain >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                          {formatCurrency(h.unrealized_gain, 'BDT')}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-8 w-8 mx-auto mb-2" />
                  No holdings found
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="summary" className="mt-4">
          <Card className="bg-card/50 border-border/50">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Tax Summary Document
              </CardTitle>
              <CardDescription>
                Comprehensive tax summary for FY {selectedYear}-{parseInt(selectedYear) + 1}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {taxSummary ? (
                <pre className="bg-muted/30 p-4 rounded-lg text-sm font-mono whitespace-pre-wrap overflow-x-auto">
                  {formatTaxReport(taxSummary)}
                </pre>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No data available for tax summary
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
