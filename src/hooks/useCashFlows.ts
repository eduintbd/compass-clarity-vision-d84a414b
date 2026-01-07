import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface CashFlow {
  id: string;
  portfolio_id: string;
  user_id: string;
  flow_date: string;
  flow_type: 'deposit' | 'withdrawal' | 'dividend' | 'interest' | 'fee' | 'tax' | 'transfer_in' | 'transfer_out';
  amount: number;
  description: string | null;
  created_at: string;
  source?: 'manual' | 'dividend' | 'transaction' | 'implied' | 'transfer';
}
export interface Dividend {
  id: string;
  portfolio_id: string;
  symbol: string;
  amount: number;
  dividend_date: string;
  tax_withheld: number | null;
}

export interface PortfolioTransaction {
  id: string;
  portfolio_id: string;
  symbol: string;
  transaction_type: string;
  total_amount: number;
  transaction_date: string;
  commission: number | null;
  fees: number | null;
}

export const useCashFlows = (portfolioId: string | null) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['cash_flows', portfolioId],
    queryFn: async () => {
      if (!portfolioId) return [];
      
      const { data, error } = await supabase
        .from('portfolio_cash_flows')
        .select('*')
        .eq('portfolio_id', portfolioId)
        .order('flow_date', { ascending: false });

      if (error) throw error;
      return (data || []).map(d => ({ ...d, source: 'manual' as const })) as CashFlow[];
    },
    enabled: !!user && !!portfolioId,
  });
};

export const useAllCashFlows = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['all_cash_flows', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('portfolio_cash_flows')
        .select('*')
        .order('flow_date', { ascending: false });

      if (error) throw error;
      return (data || []).map(d => ({ ...d, source: 'manual' as const })) as CashFlow[];
    },
    enabled: !!user,
  });
};

// Get all dividends as cash flows
export const useDividendCashFlows = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['dividend_cash_flows', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dividends')
        .select('*')
        .order('dividend_date', { ascending: false });

      if (error) throw error;
      
      // Convert dividends to cash flow format
      return (data || []).map(d => ({
        id: d.id,
        portfolio_id: d.portfolio_id,
        user_id: d.user_id,
        flow_date: d.dividend_date,
        flow_type: 'dividend' as const,
        amount: Number(d.amount),
        description: `${d.symbol} dividend`,
        created_at: d.created_at,
        source: 'dividend' as const,
        tax_withheld: d.tax_withheld,
      }));
    },
    enabled: !!user,
  });
};

// Get fees/commissions from portfolio transactions
export const useTransactionFees = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['transaction_fees', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('portfolio_transactions')
        .select('*')
        .order('transaction_date', { ascending: false });

      if (error) throw error;
      
      // Extract fees and commissions as cash flows
      const fees: CashFlow[] = [];
      (data || []).forEach(t => {
        const totalFees = (Number(t.commission) || 0) + (Number(t.fees) || 0);
        if (totalFees > 0) {
          fees.push({
            id: `fee-${t.id}`,
            portfolio_id: t.portfolio_id,
            user_id: t.user_id,
            flow_date: t.transaction_date,
            flow_type: 'fee',
            amount: totalFees,
            description: `${t.symbol} ${t.transaction_type} fees`,
            created_at: t.created_at,
            source: 'transaction' as const,
          });
        }
      });
      
      return fees;
    },
    enabled: !!user,
  });
};

// Get share transfers as cash flows
export const useShareTransferFlows = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['share_transfer_flows', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('share_transfers')
        .select('*')
        .order('transfer_date', { ascending: false });

      if (error) throw error;
      
      const flows: CashFlow[] = [];
      (data || []).forEach(t => {
        // Transfer out from source account
        if (t.from_portfolio_id) {
          flows.push({
            id: `transfer-out-${t.id}`,
            portfolio_id: t.from_portfolio_id,
            user_id: t.user_id,
            flow_date: t.transfer_date,
            flow_type: 'transfer_out',
            amount: Number(t.market_value),
            description: `${t.symbol} (${t.quantity} shares) transferred out`,
            created_at: t.created_at,
            source: 'transfer' as const,
          });
        }
        // Transfer in to destination account
        if (t.to_portfolio_id) {
          flows.push({
            id: `transfer-in-${t.id}`,
            portfolio_id: t.to_portfolio_id,
            user_id: t.user_id,
            flow_date: t.transfer_date,
            flow_type: 'transfer_in',
            amount: Number(t.market_value),
            description: `${t.symbol} (${t.quantity} shares) transferred in`,
            created_at: t.created_at,
            source: 'transfer' as const,
          });
        }
      });
      
      return flows;
    },
    enabled: !!user,
  });
};

// Calculate implied deposits/withdrawals and returns from portfolio snapshot changes
export const useImpliedDeposits = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['implied_deposits', user?.id],
    queryFn: async () => {
      // Get all portfolios
      const { data: portfolios, error: portfolioError } = await supabase
        .from('portfolios')
        .select('*')
        .order('as_of_date', { ascending: true });

      if (portfolioError) throw portfolioError;
      if (!portfolios || portfolios.length === 0) return { flows: [], returns: [] };

      // Get share transfers
      const { data: transfers, error: transferError } = await supabase
        .from('share_transfers')
        .select('*');
      
      if (transferError) throw transferError;

      // Group by account number
      const grouped: Record<string, typeof portfolios> = {};
      portfolios.forEach(p => {
        const key = p.account_number;
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(p);
      });

      const impliedFlows: CashFlow[] = [];
      const periodReturns: PeriodReturn[] = [];

      // For each account, compare consecutive snapshots
      Object.entries(grouped).forEach(([accountNumber, snapshots]) => {
        // Sort by date ascending
        snapshots.sort((a, b) => {
          if (!a.as_of_date && !b.as_of_date) return 0;
          if (!a.as_of_date) return -1;
          if (!b.as_of_date) return 1;
          return new Date(a.as_of_date).getTime() - new Date(b.as_of_date).getTime();
        });

        // Compare consecutive snapshots
        for (let i = 1; i < snapshots.length; i++) {
          const prev = snapshots[i - 1];
          const curr = snapshots[i];

          if (!curr.as_of_date) continue;

          // Calculate share transfers in/out for this period for this account
          const periodTransfers = (transfers || []).filter(t => {
            const transferDate = new Date(t.transfer_date);
            const startDate = prev.as_of_date ? new Date(prev.as_of_date) : new Date(prev.created_at);
            const endDate = new Date(curr.as_of_date);
            return transferDate > startDate && transferDate <= endDate;
          });

          let transferOut = 0;
          let transferIn = 0;
          periodTransfers.forEach(t => {
            if (t.from_portfolio_id === prev.id || t.from_portfolio_id === curr.id) {
              transferOut += Number(t.cost_basis);
            }
            if (t.to_portfolio_id === prev.id || t.to_portfolio_id === curr.id) {
              transferIn += Number(t.cost_basis);
            }
          });

          // Net deposit = Change in Cost Basis - Transfer In + Transfer Out
          const costBasisChange = Number(curr.total_cost_basis) - Number(prev.total_cost_basis);
          const netDeposit = costBasisChange - transferIn + transferOut;
          
          // Market value change
          const marketValueChange = Number(curr.total_market_value) - Number(prev.total_market_value);
          
          // Return = Market Value Change - Net Deposits - Net Transfers
          // Net transfers should not count as return
          const netTransfer = transferIn - transferOut;
          const periodReturn = marketValueChange - netDeposit - netTransfer;
          
          // Calculate return percentage based on starting value + time-weighted deposits
          const startValue = Number(prev.total_market_value);
          const avgInvestment = startValue + (netDeposit / 2); // Simple approximation
          const returnPercent = avgInvestment > 0 ? (periodReturn / avgInvestment) * 100 : 0;

          if (Math.abs(netDeposit) > 0.01) {
            const flowType = netDeposit > 0 ? 'deposit' : 'withdrawal';
            impliedFlows.push({
              id: `implied-${curr.id}`,
              portfolio_id: curr.id,
              user_id: curr.user_id,
              flow_date: curr.as_of_date,
              flow_type: flowType,
              amount: Math.abs(netDeposit),
              description: `Implied ${flowType} (cost basis change from ${prev.as_of_date || 'initial'}, adjusted for transfers)`,
              created_at: curr.created_at,
              source: 'implied' as const,
            });
          }

          periodReturns.push({
            id: `return-${curr.id}`,
            portfolio_id: curr.id,
            account_number: accountNumber,
            broker_name: curr.broker_name,
            start_date: prev.as_of_date || prev.created_at.split('T')[0],
            end_date: curr.as_of_date,
            start_value: Number(prev.total_market_value),
            end_value: Number(curr.total_market_value),
            net_deposits: netDeposit,
            net_transfers: netTransfer,
            period_return: periodReturn,
            return_percent: returnPercent,
          });
        }
      });

      return { flows: impliedFlows, returns: periodReturns };
    },
    enabled: !!user,
  });
};
export interface PeriodReturn {
  id: string;
  portfolio_id: string;
  account_number: string;
  broker_name: string | null;
  start_date: string;
  end_date: string;
  start_value: number;
  end_value: number;
  net_deposits: number;
  net_transfers: number;
  period_return: number;
  return_percent: number;
}

// Combined hook to get all cash flows from all sources
export const useCombinedCashFlows = (startDate?: string, endDate?: string) => {
  const { data: manualFlows, isLoading: manualLoading } = useAllCashFlows();
  const { data: dividendFlows, isLoading: dividendLoading } = useDividendCashFlows();
  const { data: feeFlows, isLoading: feeLoading } = useTransactionFees();
  const { data: transferFlows, isLoading: transferLoading } = useShareTransferFlows();
  const { data: impliedData, isLoading: impliedLoading } = useImpliedDeposits();

  const isLoading = manualLoading || dividendLoading || feeLoading || transferLoading || impliedLoading;

  // Combine all flows
  let allFlows = [
    ...(manualFlows || []),
    ...(dividendFlows || []),
    ...(feeFlows || []),
    ...(transferFlows || []),
    ...(impliedData?.flows || []),
  ];

  // Filter by date range if provided
  if (startDate) {
    allFlows = allFlows.filter(f => f.flow_date >= startDate);
  }
  if (endDate) {
    allFlows = allFlows.filter(f => f.flow_date <= endDate);
  }

  // Sort by date descending
  allFlows.sort((a, b) => new Date(b.flow_date).getTime() - new Date(a.flow_date).getTime());

  // Filter returns by date range
  let periodReturns = impliedData?.returns || [];
  if (startDate) {
    periodReturns = periodReturns.filter(r => r.end_date >= startDate);
  }
  if (endDate) {
    periodReturns = periodReturns.filter(r => r.end_date <= endDate);
  }

  return { data: allFlows, periodReturns, isLoading };
};

export const useCreateCashFlow = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (cashFlow: Omit<CashFlow, 'id' | 'created_at' | 'source'>) => {
      const { data, error } = await supabase
        .from('portfolio_cash_flows')
        .insert(cashFlow)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['cash_flows', data.portfolio_id] });
      queryClient.invalidateQueries({ queryKey: ['all_cash_flows'] });
    },
  });
};

export const useDeleteCashFlow = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, portfolioId }: { id: string; portfolioId: string }) => {
      const { error } = await supabase
        .from('portfolio_cash_flows')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return portfolioId;
    },
    onSuccess: (portfolioId) => {
      queryClient.invalidateQueries({ queryKey: ['cash_flows', portfolioId] });
      queryClient.invalidateQueries({ queryKey: ['all_cash_flows'] });
    },
  });
};

// Helper to calculate net cash flows for a portfolio
export const calculateNetCashFlows = (cashFlows: CashFlow[]) => {
  return cashFlows.reduce((acc, flow) => {
    const amount = Number(flow.amount);
    switch (flow.flow_type) {
      case 'deposit':
        acc.deposits += amount;
        acc.netFlow += amount;
        break;
      case 'withdrawal':
        acc.withdrawals += amount;
        acc.netFlow -= amount;
        break;
      case 'dividend':
      case 'interest':
        acc.income += amount;
        acc.netFlow += amount;
        break;
      case 'fee':
      case 'tax':
        acc.expenses += amount;
        acc.netFlow -= amount;
        break;
    }
    return acc;
  }, {
    deposits: 0,
    withdrawals: 0,
    income: 0,
    expenses: 0,
    netFlow: 0,
  });
};
