import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2, ArrowUpRight, ArrowDownRight, DollarSign, Database, Pencil, TrendingUp, TrendingDown, ArrowLeftRight, RefreshCw, Calendar } from 'lucide-react';
import { usePortfolios, useUniqueAccounts } from '@/hooks/usePortfolios';
import { useCombinedCashFlows, useCreateCashFlow, useDeleteCashFlow, calculateNetCashFlows, CashFlow, PeriodReturn } from '@/hooks/useCashFlows';
import { useShareTransfers, useCreateShareTransfer, useDeleteShareTransfer } from '@/hooks/useShareTransfers';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const FLOW_TYPES = [
  { value: 'deposit', label: 'Deposit', icon: ArrowUpRight, color: 'text-emerald-500' },
  { value: 'withdrawal', label: 'Withdrawal', icon: ArrowDownRight, color: 'text-red-500' },
  { value: 'dividend', label: 'Dividend', icon: DollarSign, color: 'text-emerald-500' },
  { value: 'interest', label: 'Interest', icon: DollarSign, color: 'text-emerald-500' },
  { value: 'fee', label: 'Fee', icon: ArrowDownRight, color: 'text-amber-500' },
  { value: 'tax', label: 'Tax', icon: ArrowDownRight, color: 'text-amber-500' },
  { value: 'transfer_in', label: 'Transfer In', icon: ArrowUpRight, color: 'text-blue-500' },
  { value: 'transfer_out', label: 'Transfer Out', icon: ArrowDownRight, color: 'text-blue-500' },
] as const;

export const CashFlowTracker = () => {
  const { user } = useAuth();
  const { data: portfolios, isLoading: portfoliosLoading } = usePortfolios();
  const { data: accounts } = useUniqueAccounts();
  const { data: shareTransfers } = useShareTransfers();
  const createShareTransfer = useCreateShareTransfer();
  const deleteShareTransfer = useDeleteShareTransfer();
  // Date range state - default to current fiscal year (July to June)
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();
  const fiscalYearStart = currentMonth >= 6 
    ? `${currentYear}-07-01` 
    : `${currentYear - 1}-07-01`;
  const fiscalYearEnd = currentMonth >= 6 
    ? `${currentYear + 1}-06-30` 
    : `${currentYear}-06-30`;
  
  const [startDate, setStartDate] = useState(fiscalYearStart);
  const [endDate, setEndDate] = useState(fiscalYearEnd);
  
  const { data: allCashFlows, periodReturns, isLoading: cashFlowsLoading } = useCombinedCashFlows(startDate, endDate);
  const createCashFlow = useCreateCashFlow();
  const deleteCashFlow = useDeleteCashFlow();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [selectedPortfolio, setSelectedPortfolio] = useState<string>('');
  const [flowType, setFlowType] = useState<CashFlow['flow_type']>('deposit');

  // Share transfer form state
  const [fromPortfolio, setFromPortfolio] = useState<string>('');
  const [toPortfolio, setToPortfolio] = useState<string>('');
  const [transferSymbol, setTransferSymbol] = useState('');
  const [transferQuantity, setTransferQuantity] = useState('');
  const [transferCostBasis, setTransferCostBasis] = useState('');
  const [transferMarketValue, setTransferMarketValue] = useState('');
  const [transferDate, setTransferDate] = useState(new Date().toISOString().split('T')[0]);
  const [transferNotes, setTransferNotes] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPortfolio || !amount || !user) return;

    try {
      await createCashFlow.mutateAsync({
        portfolio_id: selectedPortfolio,
        user_id: user.id,
        flow_type: flowType,
        amount: parseFloat(amount),
        flow_date: date,
        description: description || null,
      });
      
      toast.success('Cash flow recorded');
      setDialogOpen(false);
      resetForm();
    } catch (error) {
      toast.error('Failed to record cash flow');
    }
  };

  const handleDelete = async (id: string, portfolioId: string, source?: string) => {
    if (source !== 'manual') {
      toast.error('Only manually added cash flows can be deleted');
      return;
    }
    try {
      await deleteCashFlow.mutateAsync({ id, portfolioId });
      toast.success('Cash flow deleted');
    } catch (error) {
      toast.error('Failed to delete');
    }
  };

  const handleTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferSymbol || !transferQuantity || !user) return;

    try {
      await createShareTransfer.mutateAsync({
        from_portfolio_id: fromPortfolio || null,
        to_portfolio_id: toPortfolio || null,
        symbol: transferSymbol.toUpperCase(),
        quantity: parseFloat(transferQuantity),
        cost_basis: parseFloat(transferCostBasis) || 0,
        market_value: parseFloat(transferMarketValue) || 0,
        transfer_date: transferDate,
        notes: transferNotes || null,
      });
      
      setTransferDialogOpen(false);
      resetTransferForm();
    } catch (error) {
      // Error handled by hook
    }
  };

  const resetTransferForm = () => {
    setFromPortfolio('');
    setToPortfolio('');
    setTransferSymbol('');
    setTransferQuantity('');
    setTransferCostBasis('');
    setTransferMarketValue('');
    setTransferDate(new Date().toISOString().split('T')[0]);
    setTransferNotes('');
  };

  const resetForm = () => {
    setSelectedPortfolio('');
    setFlowType('deposit');
    setAmount('');
    setDate(new Date().toISOString().split('T')[0]);
    setDescription('');
  };

  const summary = allCashFlows ? calculateNetCashFlows(allCashFlows) : null;
  
  // Calculate total returns
  const totalReturn = periodReturns?.reduce((sum, r) => sum + r.period_return, 0) || 0;

  const getFlowInfo = (type: string) => FLOW_TYPES.find(f => f.value === type) || FLOW_TYPES[0];

  const getSourceBadge = (source?: string) => {
    switch (source) {
      case 'dividend':
        return <Badge variant="secondary" className="text-xs">From Dividends</Badge>;
      case 'transaction':
        return <Badge variant="secondary" className="text-xs">From Transactions</Badge>;
      case 'implied':
        return <Badge className="text-xs bg-primary/20 text-primary border-primary/30">Calculated</Badge>;
      case 'transfer':
        return <Badge className="text-xs bg-blue-500/20 text-blue-500 border-blue-500/30"><ArrowLeftRight className="h-3 w-3 mr-1" />Transfer</Badge>;
      default:
        return <Badge variant="outline" className="text-xs"><Pencil className="h-3 w-3 mr-1" />Manual</Badge>;
    }
  };

  if (portfoliosLoading || cashFlowsLoading) {
    return <div className="text-center py-8 text-muted-foreground">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Date Range Filter */}
      <Card className="bg-card/50 border-border/50">
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-2">
              <Label>From Date</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-40"
              />
            </div>
            <div className="space-y-2">
              <Label>To Date</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-40"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setStartDate(fiscalYearStart);
                  setEndDate(fiscalYearEnd);
                }}
              >
                Current FY
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const prevFYStart = currentMonth >= 6 
                    ? `${currentYear - 1}-07-01` 
                    : `${currentYear - 2}-07-01`;
                  const prevFYEnd = currentMonth >= 6 
                    ? `${currentYear}-06-30` 
                    : `${currentYear - 1}-06-30`;
                  setStartDate(prevFYStart);
                  setEndDate(prevFYEnd);
                }}
              >
                Previous FY
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setStartDate(`${currentYear}-01-01`);
                  setEndDate(`${currentYear}-12-31`);
                }}
              >
                Calendar Year
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        <Card className="bg-card/50 border-border/50">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Total Deposits</p>
            <p className="text-xl font-bold text-emerald-500">{formatCurrency(summary?.deposits || 0)}</p>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-border/50">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Total Withdrawals</p>
            <p className="text-xl font-bold text-red-500">{formatCurrency(summary?.withdrawals || 0)}</p>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-border/50">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Income (Div/Int)</p>
            <p className="text-xl font-bold text-emerald-500">{formatCurrency(summary?.income || 0)}</p>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-border/50">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Fees & Taxes</p>
            <p className="text-xl font-bold text-amber-500">{formatCurrency(summary?.expenses || 0)}</p>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-border/50">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Net Cash Flow</p>
            <p className={`text-xl font-bold ${(summary?.netFlow || 0) >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
              {formatCurrency(summary?.netFlow || 0)}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-primary/20 to-primary/5 border-primary/30">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Period Return</p>
            <div className="flex items-center gap-2">
              {totalReturn >= 0 ? (
                <TrendingUp className="h-5 w-5 text-emerald-500" />
              ) : (
                <TrendingDown className="h-5 w-5 text-red-500" />
              )}
              <p className={`text-xl font-bold ${totalReturn >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                {formatCurrency(totalReturn)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Period Returns Table */}
      {periodReturns && periodReturns.length > 0 && (
        <Card className="bg-card/50 border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Period Returns by Account
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Return = Market Value Change - Net Deposits/Withdrawals
            </p>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Account</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead className="text-right">Start Value</TableHead>
                  <TableHead className="text-right">End Value</TableHead>
                  <TableHead className="text-right">Net Deposits</TableHead>
                  <TableHead className="text-right">Return</TableHead>
                  <TableHead className="text-right">Return %</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {periodReturns.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{r.broker_name || 'Unknown'}</p>
                        <p className="text-xs text-muted-foreground">{r.account_number}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {formatDate(r.start_date)} → {formatDate(r.end_date)}
                    </TableCell>
                    <TableCell className="text-right">{formatCurrency(r.start_value)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(r.end_value)}</TableCell>
                    <TableCell className={`text-right ${r.net_deposits >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                      {r.net_deposits >= 0 ? '+' : ''}{formatCurrency(r.net_deposits)}
                    </TableCell>
                    <TableCell className={`text-right font-medium ${r.period_return >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                      {r.period_return >= 0 ? '+' : ''}{formatCurrency(r.period_return)}
                    </TableCell>
                    <TableCell className={`text-right font-medium ${r.return_percent >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                      {r.return_percent >= 0 ? '+' : ''}{r.return_percent.toFixed(2)}%
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Share Transfers Table */}
      {shareTransfers && shareTransfers.length > 0 && (
        <Card className="bg-card/50 border-border/50">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ArrowLeftRight className="h-5 w-5 text-blue-500" />
                Share Transfers
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Shares moved between accounts (excluded from deposit/withdrawal calculations)
              </p>
            </div>
            <Dialog open={transferDialogOpen} onOpenChange={setTransferDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline">
                  <RefreshCw className="h-4 w-4 mr-1" /> Record Transfer
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Record Share Transfer</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleTransferSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>From Account</Label>
                      <Select value={fromPortfolio} onValueChange={setFromPortfolio}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select source (optional)" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="external">External Account</SelectItem>
                          {accounts?.map(a => (
                            <SelectItem key={a.account_number} value={a.id}>
                              {a.broker_name} - {a.account_number}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>To Account</Label>
                      <Select value={toPortfolio} onValueChange={setToPortfolio}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select destination (optional)" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="external">External Account</SelectItem>
                          {accounts?.map(a => (
                            <SelectItem key={a.account_number} value={a.id}>
                              {a.broker_name} - {a.account_number}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Symbol</Label>
                      <Input
                        value={transferSymbol}
                        onChange={(e) => setTransferSymbol(e.target.value)}
                        placeholder="e.g., AAPL"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Quantity</Label>
                      <Input
                        type="number"
                        step="0.0001"
                        value={transferQuantity}
                        onChange={(e) => setTransferQuantity(e.target.value)}
                        placeholder="0"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Cost Basis</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={transferCostBasis}
                        onChange={(e) => setTransferCostBasis(e.target.value)}
                        placeholder="0.00"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Market Value</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={transferMarketValue}
                        onChange={(e) => setTransferMarketValue(e.target.value)}
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Transfer Date</Label>
                    <Input
                      type="date"
                      value={transferDate}
                      onChange={(e) => setTransferDate(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Notes (optional)</Label>
                    <Input
                      value={transferNotes}
                      onChange={(e) => setTransferNotes(e.target.value)}
                      placeholder="e.g., ACATS transfer from Fidelity"
                    />
                  </div>

                  <Button type="submit" className="w-full" disabled={createShareTransfer.isPending}>
                    {createShareTransfer.isPending ? 'Saving...' : 'Record Transfer'}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Symbol</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead>From</TableHead>
                  <TableHead>To</TableHead>
                  <TableHead className="text-right">Cost Basis</TableHead>
                  <TableHead className="text-right">Market Value</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {shareTransfers.map(t => {
                  const fromAccount = accounts?.find(a => a.id === t.from_portfolio_id);
                  const toAccount = accounts?.find(a => a.id === t.to_portfolio_id);
                  
                  return (
                    <TableRow key={t.id}>
                      <TableCell>{formatDate(t.transfer_date)}</TableCell>
                      <TableCell className="font-medium">{t.symbol}</TableCell>
                      <TableCell className="text-right">{Number(t.quantity).toLocaleString()}</TableCell>
                      <TableCell>
                        {fromAccount ? `${fromAccount.broker_name} - ${fromAccount.account_number}` : 'External'}
                      </TableCell>
                      <TableCell>
                        {toAccount ? `${toAccount.broker_name} - ${toAccount.account_number}` : 'External'}
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(t.cost_basis)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(t.market_value)}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteShareTransfer.mutate(t.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Add Transfer Button (when no transfers exist) */}
      {(!shareTransfers || shareTransfers.length === 0) && (
        <Card className="bg-card/50 border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium flex items-center gap-2">
                  <ArrowLeftRight className="h-4 w-4 text-blue-500" />
                  Share Transfers
                </h4>
                <p className="text-sm text-muted-foreground">
                  Track shares moved between accounts to correctly calculate returns
                </p>
              </div>
              <Dialog open={transferDialogOpen} onOpenChange={setTransferDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline">
                    <RefreshCw className="h-4 w-4 mr-1" /> Record Transfer
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Record Share Transfer</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleTransferSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>From Account</Label>
                        <Select value={fromPortfolio} onValueChange={setFromPortfolio}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select source (optional)" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="external">External Account</SelectItem>
                            {accounts?.map(a => (
                              <SelectItem key={a.account_number} value={a.id}>
                                {a.broker_name} - {a.account_number}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>To Account</Label>
                        <Select value={toPortfolio} onValueChange={setToPortfolio}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select destination (optional)" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="external">External Account</SelectItem>
                            {accounts?.map(a => (
                              <SelectItem key={a.account_number} value={a.id}>
                                {a.broker_name} - {a.account_number}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Symbol</Label>
                        <Input
                          value={transferSymbol}
                          onChange={(e) => setTransferSymbol(e.target.value)}
                          placeholder="e.g., AAPL"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Quantity</Label>
                        <Input
                          type="number"
                          step="0.0001"
                          value={transferQuantity}
                          onChange={(e) => setTransferQuantity(e.target.value)}
                          placeholder="0"
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Cost Basis</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={transferCostBasis}
                          onChange={(e) => setTransferCostBasis(e.target.value)}
                          placeholder="0.00"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Market Value</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={transferMarketValue}
                          onChange={(e) => setTransferMarketValue(e.target.value)}
                          placeholder="0.00"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Transfer Date</Label>
                      <Input
                        type="date"
                        value={transferDate}
                        onChange={(e) => setTransferDate(e.target.value)}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Notes (optional)</Label>
                      <Input
                        value={transferNotes}
                        onChange={(e) => setTransferNotes(e.target.value)}
                        placeholder="e.g., ACATS transfer from Fidelity"
                      />
                    </div>

                    <Button type="submit" className="w-full" disabled={createShareTransfer.isPending}>
                      {createShareTransfer.isPending ? 'Saving...' : 'Record Transfer'}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cash Flows List */}
      <Card className="bg-card/50 border-border/50">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Cash Flows</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {allCashFlows?.length || 0} transactions in selected period
            </p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-1" /> Add Cash Flow
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Record Cash Flow</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Portfolio</Label>
                  <Select value={selectedPortfolio} onValueChange={setSelectedPortfolio}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select portfolio" />
                    </SelectTrigger>
                    <SelectContent>
                      {portfolios?.map(p => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.broker_name} - {p.account_number} ({p.as_of_date || 'No date'})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select value={flowType} onValueChange={(v) => setFlowType(v as CashFlow['flow_type'])}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FLOW_TYPES.map(type => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Amount</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0.00"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Date</Label>
                    <Input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Description (optional)</Label>
                  <Input
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="e.g., Quarterly dividend"
                  />
                </div>

                <Button type="submit" className="w-full" disabled={createCashFlow.isPending}>
                  {createCashFlow.isPending ? 'Saving...' : 'Save'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {(!allCashFlows || allCashFlows.length === 0) ? (
            <div className="text-center py-8">
              <Database className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">
                No cash flows found for the selected period.
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Cash flows are automatically calculated from portfolio snapshots.
                <br />Deposits/withdrawals are derived from cost basis changes.
              </p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {allCashFlows.map(flow => {
                const flowInfo = getFlowInfo(flow.flow_type);
                const Icon = flowInfo.icon;
                const portfolio = portfolios?.find(p => p.id === flow.portfolio_id);
                
                return (
                  <div
                    key={flow.id}
                    className="flex items-center gap-4 p-3 rounded-lg bg-muted/30 border border-border/50"
                  >
                    <div className={`p-2 rounded-full bg-muted ${flowInfo.color}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">{flowInfo.label}</span>
                        <Badge variant="outline" className="text-xs">
                          {portfolio?.broker_name || 'Unknown'}
                        </Badge>
                        {getSourceBadge(flow.source)}
                      </div>
                      {flow.description && (
                        <p className="text-sm text-muted-foreground truncate">{flow.description}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-sm text-muted-foreground whitespace-nowrap">
                      <Calendar className="h-4 w-4" />
                      {formatDate(flow.flow_date)}
                    </div>

                    <span className={`font-medium whitespace-nowrap ${flowInfo.color}`}>
                      {['deposit', 'dividend', 'interest'].includes(flow.flow_type) ? '+' : '-'}
                      {formatCurrency(flow.amount)}
                    </span>

                    {flow.source === 'manual' && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive flex-shrink-0"
                        onClick={() => handleDelete(flow.id, flow.portfolio_id, flow.source)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
