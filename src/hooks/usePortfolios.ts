import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface Portfolio {
  id: string;
  user_id: string;
  account_number: string;
  account_name: string | null;
  broker_name: string | null;
  account_type: string | null;
  currency: string;
  as_of_date: string | null;
  total_cost_basis: number;
  total_market_value: number;
  total_unrealized_gain: number;
  total_realized_gain: number;
  cash_balance: number;
  margin_balance: number | null;
  total_dividends_received: number;
  equity_at_cost: number;
  equity_at_market: number;
  accrued_fees: number;
  original_accrued_fees: number;
  accrued_dividends: number;
  pending_settlements: number;
  private_equity_value: number;
  created_at: string;
  updated_at: string;
}

export interface Holding {
  id: string;
  portfolio_id: string;
  symbol: string;
  company_name: string | null;
  quantity: number;
  average_cost: number;
  cost_basis: number;
  current_price: number;
  market_value: number;
  unrealized_gain: number;
  unrealized_gain_percent: number | null;
  sector: string | null;
  asset_class: string | null;
}

export interface PortfolioSnapshot {
  id: string;
  portfolio_id: string;
  snapshot_date: string;
  total_market_value: number;
  total_cost_basis: number;
  total_unrealized_gain: number;
  cash_balance: number | null;
}

export const usePortfolios = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['portfolios', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('portfolios')
        .select('*')
        .order('as_of_date', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Portfolio[];
    },
    enabled: !!user,
  });
};

// Get unique accounts (latest snapshot per account)
export const useUniqueAccounts = () => {
  const { data: portfolios, ...rest } = usePortfolios();

  const uniqueAccounts = portfolios?.reduce((acc, portfolio) => {
    const key = portfolio.account_number;
    
    if (!acc[key]) {
      acc[key] = portfolio;
    } else {
      // Compare dates - prefer non-null dates, then latest date, then latest created_at
      const existingDate = acc[key].as_of_date;
      const newDate = portfolio.as_of_date;
      
      if (!existingDate && newDate) {
        // New has date, existing doesn't - use new
        acc[key] = portfolio;
      } else if (existingDate && newDate) {
        const existingTime = new Date(existingDate).getTime();
        const newTime = new Date(newDate).getTime();
        
        if (newTime > existingTime) {
          // Newer as_of_date - use new
          acc[key] = portfolio;
        } else if (newTime === existingTime) {
          // Same as_of_date - compare created_at
          const existingCreated = new Date(acc[key].created_at).getTime();
          const newCreated = new Date(portfolio.created_at).getTime();
          if (newCreated > existingCreated) {
            acc[key] = portfolio;
          }
        }
      }
    }
    return acc;
  }, {} as Record<string, Portfolio>);

  return {
    ...rest,
    data: uniqueAccounts ? Object.values(uniqueAccounts) : undefined,
  };
};

// Get all snapshots for a specific account
export const useAccountSnapshots = (accountNumber: string | null) => {
  const { data: portfolios, ...rest } = usePortfolios();

  const snapshots = accountNumber
    ? portfolios?.filter(p => p.account_number === accountNumber)
        .sort((a, b) => {
          // Sort by as_of_date DESC, then created_at DESC
          if (!a.as_of_date) return 1;
          if (!b.as_of_date) return -1;
          const dateCompare = new Date(b.as_of_date).getTime() - new Date(a.as_of_date).getTime();
          if (dateCompare !== 0) return dateCompare;
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        })
    : [];

  return {
    ...rest,
    data: snapshots,
  };
};

export const usePortfolioHoldings = (portfolioId: string | null) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['holdings', portfolioId],
    queryFn: async () => {
      if (!portfolioId) return [];
      
      const { data, error } = await supabase
        .from('holdings')
        .select('*')
        .eq('portfolio_id', portfolioId)
        .order('market_value', { ascending: false });

      if (error) throw error;
      return data as Holding[];
    },
    enabled: !!user && !!portfolioId,
  });
};

export const usePortfolioSnapshots = (portfolioId: string | null) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['portfolio_snapshots', portfolioId],
    queryFn: async () => {
      if (!portfolioId) return [];
      
      const { data, error } = await supabase
        .from('portfolio_snapshots')
        .select('*')
        .eq('portfolio_id', portfolioId)
        .order('snapshot_date', { ascending: true });

      if (error) throw error;
      return data as PortfolioSnapshot[];
    },
    enabled: !!user && !!portfolioId,
  });
};

export const usePortfoliosByAccount = (accountNumber: string | null) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['portfolios_by_account', accountNumber],
    queryFn: async () => {
      if (!accountNumber) return [];
      
      const { data, error } = await supabase
        .from('portfolios')
        .select('*')
        .eq('account_number', accountNumber)
        .order('as_of_date', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Portfolio[];
    },
    enabled: !!user && !!accountNumber,
  });
};

export interface AggregatedHolding {
  symbol: string;
  company_name: string | null;
  quantity: number;
  total_cost: number;
  market_value: number;
  average_cost: number;
  current_price: number;
  unrealized_gain: number;
  weight: number;
  accounts: string[];
  classification: string | null;
  // Price data
  ltp: number;
  ycp: number;
  day_change: number;
  day_change_percent: number;
}

// Helper to normalize symbol names (remove suffixes like "(A)", "()", etc.)
const normalizeSymbol = (symbol: string): string => {
  return symbol.replace(/\s*\([^)]*\)\s*$/, '').trim();
};

export const useAggregatedHoldings = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['aggregated_holdings', user?.id],
    queryFn: async () => {
      // Step 1: Get all portfolios to find latest per account
      const { data: portfolios, error: portfolioError } = await supabase
        .from('portfolios')
        .select('id, account_number, as_of_date, created_at')
        .order('as_of_date', { ascending: false })
        .order('created_at', { ascending: false });

      if (portfolioError) throw portfolioError;

      // Get latest portfolio ID per account
      const latestByAccount = new Map<string, string>();
      portfolios?.forEach(p => {
        if (!latestByAccount.has(p.account_number)) {
          latestByAccount.set(p.account_number, p.id);
        }
      });
      const latestPortfolioIds = Array.from(latestByAccount.values());

      if (latestPortfolioIds.length === 0) {
        return [];
      }

      // Step 2: Fetch holdings only from latest portfolios
      const { data, error } = await supabase
        .from('holdings')
        .select('*, portfolios!inner(account_number, account_name)')
        .in('portfolio_id', latestPortfolioIds)
        .order('market_value', { ascending: false });

      if (error) throw error;

      // Step 3: Aggregate by normalized symbol
      const aggregated: Record<string, AggregatedHolding> = {};
      let totalMarketValue = 0;

      data?.forEach((holding: any) => {
        const normalizedSymbol = normalizeSymbol(holding.symbol);
        const accountLabel = holding.portfolios?.account_name || holding.portfolios?.account_number || 'Unknown';

        if (!aggregated[normalizedSymbol]) {
          aggregated[normalizedSymbol] = {
            symbol: normalizedSymbol,
            company_name: holding.company_name,
            quantity: 0,
            total_cost: 0,
            market_value: 0,
            average_cost: 0,
            current_price: holding.current_price,
            unrealized_gain: 0,
            weight: 0,
            accounts: [],
            classification: holding.classification,
            // Price data - take from first occurrence (same stock has same LTP/YCP)
            ltp: holding.current_price || 0,
            ycp: holding.ycp || 0,
            day_change: holding.day_change || 0,
            day_change_percent: holding.day_change_percent || 0,
          };
        }

        aggregated[normalizedSymbol].quantity += holding.quantity;
        aggregated[normalizedSymbol].total_cost += holding.cost_basis;
        aggregated[normalizedSymbol].market_value += holding.market_value;
        aggregated[normalizedSymbol].unrealized_gain += holding.unrealized_gain;
        
        if (!aggregated[normalizedSymbol].accounts.includes(accountLabel)) {
          aggregated[normalizedSymbol].accounts.push(accountLabel);
        }

        totalMarketValue += holding.market_value;
      });

      // Calculate weights and average costs
      Object.values(aggregated).forEach((holding) => {
        holding.average_cost = holding.quantity > 0 ? holding.total_cost / holding.quantity : 0;
        holding.weight = totalMarketValue > 0 ? (holding.market_value / totalMarketValue) * 100 : 0;
      });

      // Sort by market value descending
      return Object.values(aggregated).sort((a, b) => b.market_value - a.market_value);
    },
    enabled: !!user,
  });
};

export const useCreateSnapshot = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (portfolio: Portfolio) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('portfolio_snapshots')
        .insert({
          user_id: user.id,
          portfolio_id: portfolio.id,
          snapshot_date: portfolio.as_of_date || new Date().toISOString().split('T')[0],
          total_market_value: portfolio.total_market_value,
          total_cost_basis: portfolio.total_cost_basis,
          total_unrealized_gain: portfolio.total_unrealized_gain,
          cash_balance: portfolio.cash_balance,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolio_snapshots'] });
    },
  });
};
