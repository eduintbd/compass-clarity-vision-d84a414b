import { useState } from 'react';
import { useUniqueAccounts } from '@/hooks/usePortfolios';
import { usePrivateEquityCalculation, useSyncPrivateEquity, useSyncAllPrivateEquity } from '@/hooks/usePrivateEquityCalculation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatCurrency } from '@/lib/formatters';
import { Building2, RefreshCw, Check, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export const AccountBreakdown = () => {
  const { data: accounts, isLoading } = useUniqueAccounts();
  const { data: privateEquityData } = usePrivateEquityCalculation();
  const syncMutation = useSyncPrivateEquity();
  const syncAllMutation = useSyncAllPrivateEquity();
  const queryClient = useQueryClient();
  const [editingFees, setEditingFees] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');

  // Mutation to update accrued fees
  const updateAccruedFeesMutation = useMutation({
    mutationFn: async ({ portfolioId, value }: { portfolioId: string; value: number }) => {
      const { error } = await supabase
        .from('portfolios')
        .update({ accrued_fees: value })
        .eq('id', portfolioId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolios'] });
      setEditingFees(null);
      toast.success('Accrued fees updated');
    },
    onError: () => {
      toast.error('Failed to update accrued fees');
    },
  });

  const handleEditFees = (accountId: string, currentValue: number) => {
    setEditingFees(accountId);
    setEditValue(currentValue.toString());
  };

  const handleSaveFees = (portfolioId: string) => {
    const value = parseFloat(editValue) || 0;
    updateAccruedFeesMutation.mutate({ portfolioId, value });
  };

  const handleCancelEdit = () => {
    setEditingFees(null);
    setEditValue('');
  };

  const syncAllAccruedFeesMutation = useMutation({
    mutationFn: async (updates: { portfolioId: string; value: number }[]) => {
      for (const update of updates) {
        const { error } = await supabase
          .from('portfolios')
          .update({ accrued_fees: update.value })
          .eq('id', update.portfolioId);
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolios'] });
      toast.success('All values synced');
    },
    onError: () => {
      toast.error('Failed to sync values');
    },
  });

  const handleSyncAll = () => {
    const peUpdates: { portfolioId: string; value: number }[] = [];
    const feeUpdates: { portfolioId: string; value: number }[] = [];

    if (privateEquityData) {
      Object.entries(privateEquityData)
        .filter(([_, data]) => data.calculatedValue !== data.storedValue)
        .forEach(([_, data]) => {
          peUpdates.push({ portfolioId: data.portfolioId, value: data.calculatedValue });
        });
    }

    accounts?.forEach(account => {
      if (account.accrued_fees !== account.original_accrued_fees) {
        feeUpdates.push({ portfolioId: account.id, value: account.original_accrued_fees });
      }
    });

    if (peUpdates.length > 0) {
      syncAllMutation.mutate(peUpdates);
    }
    if (feeUpdates.length > 0) {
      syncAllAccruedFeesMutation.mutate(feeUpdates);
    }
  };

  const hasPEChanges = privateEquityData && Object.values(privateEquityData).some(
    data => data.calculatedValue !== data.storedValue
  );

  const hasFeeChanges = accounts?.some(
    account => account.accrued_fees !== account.original_accrued_fees
  );

  const hasChanges = hasPEChanges || hasFeeChanges;

  if (isLoading) {
    return (
      <Card className="bg-card/50 border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Breakdown by Account
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-48 w-full" />
        </CardContent>
      </Card>
    );
  }

  // Calculate totals using calculated private equity values
  const totals = accounts?.reduce((acc, account) => {
    const loanCash = account.cash_balance - (account.margin_balance || 0);
    const peData = privateEquityData?.[account.account_number];
    const privateEquity = peData?.calculatedValue ?? (account.private_equity_value || 0);
    const equityAtMarket = account.total_market_value + loanCash - privateEquity;
    return {
      marketValue: acc.marketValue + account.total_market_value,
      privateEquity: acc.privateEquity + privateEquity,
      equityAtMarket: acc.equityAtMarket + equityAtMarket,
      loanCash: acc.loanCash + loanCash,
      accruedFees: acc.accruedFees + account.accrued_fees,
      realizedGain: acc.realizedGain + account.total_realized_gain,
      unrealizedGain: acc.unrealizedGain + account.total_unrealized_gain,
    };
  }, {
    marketValue: 0,
    privateEquity: 0,
    equityAtMarket: 0,
    loanCash: 0,
    accruedFees: 0,
    realizedGain: 0,
    unrealizedGain: 0,
  });

  return (
    <Card className="bg-card/50 border-border/50">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          Breakdown by Account
        </CardTitle>
        {hasChanges && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleSyncAll}
            disabled={syncAllMutation.isPending || syncAllAccruedFeesMutation.isPending}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${(syncAllMutation.isPending || syncAllAccruedFeesMutation.isPending) ? 'animate-spin' : ''}`} />
            Sync All
          </Button>
        )}
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-border/50 bg-muted/30">
                <TableHead className="text-muted-foreground">Account Code</TableHead>
                <TableHead className="text-muted-foreground">Broker</TableHead>
                <TableHead className="text-muted-foreground">Name</TableHead>
                <TableHead className="text-muted-foreground text-right">Market Value</TableHead>
                <TableHead className="text-muted-foreground text-right">Private Equity</TableHead>
                <TableHead className="text-muted-foreground text-right">Equity at Market</TableHead>
                <TableHead className="text-muted-foreground text-right">Loan/Cash</TableHead>
                <TableHead className="text-muted-foreground text-right">Accrued Fees</TableHead>
                <TableHead className="text-muted-foreground text-right">Withdrawals</TableHead>
                <TableHead className="text-muted-foreground text-right">Deposits</TableHead>
                <TableHead className="text-muted-foreground text-right">Realized Gain</TableHead>
                <TableHead className="text-muted-foreground text-right">Unrealized P/L</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {accounts?.map((account) => {
                  const loanCash = account.cash_balance - (account.margin_balance || 0);
                  const peData = privateEquityData?.[account.account_number];
                  const calculatedPE = peData?.calculatedValue ?? 0;
                  const storedPE = account.private_equity_value || 0;
                  const hasPEChange = calculatedPE !== storedPE;
                  const hasFeeChange = account.accrued_fees !== account.original_accrued_fees;
                  const equityAtMarket = account.total_market_value + loanCash - calculatedPE;
                  
                  return (
                    <TableRow key={account.id} className="border-border/30 hover:bg-muted/20">
                      <TableCell className="font-mono text-sm">{account.account_number}</TableCell>
                      <TableCell>{account.broker_name || '-'}</TableCell>
                      <TableCell>{account.account_name || '-'}</TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(account.total_market_value)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <span className={hasPEChange ? 'text-amber-500' : ''}>
                            {formatCurrency(calculatedPE)}
                          </span>
                          {hasPEChange && peData && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => syncMutation.mutate({ 
                                portfolioId: peData.portfolioId, 
                                value: calculatedPE 
                              })}
                              disabled={syncMutation.isPending}
                              title={`Stored: ${formatCurrency(storedPE)}. Click to sync.`}
                            >
                              <RefreshCw className={`h-3 w-3 ${syncMutation.isPending ? 'animate-spin' : ''}`} />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(equityAtMarket)}
                      </TableCell>
                      <TableCell className={`text-right ${loanCash < 0 ? 'text-red-500' : ''}`}>
                        {formatCurrency(loanCash)}
                      </TableCell>
                      <TableCell className="text-right">
                        {editingFees === account.id ? (
                          <div className="flex items-center justify-end gap-1">
                            <Input
                              type="number"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              className="w-24 h-7 text-right text-sm"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveFees(account.id);
                                if (e.key === 'Escape') handleCancelEdit();
                              }}
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-emerald-500 hover:text-emerald-600"
                              onClick={() => handleSaveFees(account.id)}
                              disabled={updateAccruedFeesMutation.isPending}
                            >
                              <Check className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-red-500 hover:text-red-600"
                              onClick={handleCancelEdit}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ) : (
                          <div 
                            className="flex items-center justify-end gap-2 cursor-pointer hover:bg-muted/30 rounded px-2 py-1"
                            onClick={() => handleEditFees(account.id, account.accrued_fees)}
                            title="Click to edit"
                          >
                            <span className={hasFeeChange ? 'text-amber-500' : 'text-amber-500'}>
                              {formatCurrency(account.accrued_fees)}
                            </span>
                            {hasFeeChange && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  updateAccruedFeesMutation.mutate({ 
                                    portfolioId: account.id, 
                                    value: account.original_accrued_fees 
                                  });
                                }}
                                disabled={updateAccruedFeesMutation.isPending}
                                title={`Original: ${formatCurrency(account.original_accrued_fees)}. Click to sync.`}
                              >
                                <RefreshCw className={`h-3 w-3 ${updateAccruedFeesMutation.isPending ? 'animate-spin' : ''}`} />
                              </Button>
                            )}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">-</TableCell>
                      <TableCell className="text-right text-muted-foreground">-</TableCell>
                      <TableCell className={`text-right ${account.total_realized_gain >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                        {formatCurrency(account.total_realized_gain)}
                      </TableCell>
                      <TableCell className={`text-right ${account.total_unrealized_gain >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                        {formatCurrency(account.total_unrealized_gain)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              
              {/* Totals Row */}
              {accounts && accounts.length > 0 && (
                <TableRow className="border-t-2 border-primary/30 bg-muted/30 font-semibold">
                  <TableCell colSpan={3} className="text-right">Total</TableCell>
                  <TableCell className="text-right">{formatCurrency(totals?.marketValue || 0)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(totals?.privateEquity || 0)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(totals?.equityAtMarket || 0)}</TableCell>
                  <TableCell className={`text-right ${(totals?.loanCash || 0) < 0 ? 'text-red-500' : ''}`}>
                    {formatCurrency(totals?.loanCash || 0)}
                  </TableCell>
                  <TableCell className="text-right text-amber-500">{formatCurrency(totals?.accruedFees || 0)}</TableCell>
                  <TableCell className="text-right text-muted-foreground">-</TableCell>
                  <TableCell className="text-right text-muted-foreground">-</TableCell>
                  <TableCell className={`text-right ${(totals?.realizedGain || 0) >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                    {formatCurrency(totals?.realizedGain || 0)}
                  </TableCell>
                  <TableCell className={`text-right ${(totals?.unrealizedGain || 0) >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                    {formatCurrency(totals?.unrealizedGain || 0)}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {(!accounts || accounts.length === 0) && (
          <p className="text-center text-muted-foreground py-8">
            No accounts found. Upload a portfolio to see breakdown.
          </p>
        )}
      </CardContent>
    </Card>
  );
};