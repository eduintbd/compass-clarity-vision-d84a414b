import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface HoldingWithClassification {
  portfolio_id: string;
  market_value: number;
  classification: string | null;
}

interface PrivateEquityByAccount {
  [accountNumber: string]: {
    portfolioId: string;
    calculatedValue: number;
    storedValue: number;
  };
}

export const usePrivateEquityCalculation = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['private-equity-calculation', user?.id],
    queryFn: async () => {
      if (!user) return {};

      // Get all portfolios to map portfolio_id to account_number
      const { data: portfolios, error: portfoliosError } = await supabase
        .from('portfolios')
        .select('id, account_number, private_equity_value, as_of_date, created_at')
        .order('as_of_date', { ascending: false })
        .order('created_at', { ascending: false });

      if (portfoliosError) throw portfoliosError;

      // Group portfolios by account_number and get the latest one
      const latestPortfolioByAccount: Record<string, { id: string; private_equity_value: number; as_of_date: string | null; created_at: string }> = {};
      portfolios?.forEach(portfolio => {
        const key = portfolio.account_number;
        if (!latestPortfolioByAccount[key]) {
          latestPortfolioByAccount[key] = {
            id: portfolio.id,
            private_equity_value: portfolio.private_equity_value,
            as_of_date: portfolio.as_of_date,
            created_at: portfolio.created_at,
          };
        } else {
          // Check if this portfolio is newer (by as_of_date, then created_at)
          const existing = latestPortfolioByAccount[key];
          if (!existing.as_of_date && portfolio.as_of_date) {
            latestPortfolioByAccount[key] = {
              id: portfolio.id,
              private_equity_value: portfolio.private_equity_value,
              as_of_date: portfolio.as_of_date,
              created_at: portfolio.created_at,
            };
          } else if (existing.as_of_date && portfolio.as_of_date) {
            const existingTime = new Date(existing.as_of_date).getTime();
            const newTime = new Date(portfolio.as_of_date).getTime();
            
            if (newTime > existingTime) {
              latestPortfolioByAccount[key] = {
                id: portfolio.id,
                private_equity_value: portfolio.private_equity_value,
                as_of_date: portfolio.as_of_date,
                created_at: portfolio.created_at,
              };
            } else if (newTime === existingTime && new Date(portfolio.created_at) > new Date(existing.created_at)) {
              latestPortfolioByAccount[key] = {
                id: portfolio.id,
                private_equity_value: portfolio.private_equity_value,
                as_of_date: portfolio.as_of_date,
                created_at: portfolio.created_at,
              };
            }
          }
        }
      });

      // Get the IDs of latest portfolios only
      const latestPortfolioIds = Object.values(latestPortfolioByAccount).map(p => p.id);

      // Get holdings ONLY from the latest portfolios with classifications
      const { data: holdings, error: holdingsError } = await supabase
        .from('holdings')
        .select('portfolio_id, market_value, classification')
        .in('portfolio_id', latestPortfolioIds);

      if (holdingsError) throw holdingsError;

      // Create a map of portfolio_id to account_number (only for latest portfolios)
      const portfolioToAccount: Record<string, string> = {};
      Object.entries(latestPortfolioByAccount).forEach(([accountNumber, { id }]) => {
        portfolioToAccount[id] = accountNumber;
      });

      // Calculate private equity by account (sum of market_value for classified holdings)
      const privateEquityByAccount: PrivateEquityByAccount = {};

      // Initialize with all accounts
      Object.entries(latestPortfolioByAccount).forEach(([accountNumber, { id, private_equity_value }]) => {
        privateEquityByAccount[accountNumber] = {
          portfolioId: id,
          calculatedValue: 0,
          storedValue: private_equity_value,
        };
      });

      // Sum market values for holdings with classification (not null and not 'none')
      holdings?.forEach((holding: HoldingWithClassification) => {
        if (holding.classification && holding.classification !== 'none') {
          const accountNumber = portfolioToAccount[holding.portfolio_id];
          if (accountNumber && privateEquityByAccount[accountNumber]) {
            privateEquityByAccount[accountNumber].calculatedValue += Math.round(holding.market_value);
          }
        }
      });

      return privateEquityByAccount;
    },
    enabled: !!user,
  });
};

export const useSyncPrivateEquity = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ portfolioId, value }: { portfolioId: string; value: number }) => {
      const { error } = await supabase
        .from('portfolios')
        .update({ private_equity_value: value })
        .eq('id', portfolioId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolios'] });
      queryClient.invalidateQueries({ queryKey: ['private-equity-calculation'] });
      toast.success('Private equity synced from holdings');
    },
    onError: () => {
      toast.error('Failed to sync private equity');
    },
  });
};

export const useSyncAllPrivateEquity = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates: { portfolioId: string; value: number }[]) => {
      for (const update of updates) {
        const { error } = await supabase
          .from('portfolios')
          .update({ private_equity_value: update.value })
          .eq('id', update.portfolioId);

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolios'] });
      queryClient.invalidateQueries({ queryKey: ['private-equity-calculation'] });
      toast.success('All private equity values synced');
    },
    onError: () => {
      toast.error('Failed to sync private equity values');
    },
  });
};
