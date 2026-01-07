import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface ShareTransfer {
  id: string;
  user_id: string;
  from_portfolio_id: string | null;
  to_portfolio_id: string | null;
  symbol: string;
  quantity: number;
  cost_basis: number;
  market_value: number;
  transfer_date: string;
  notes: string | null;
  created_at: string;
}

export const useShareTransfers = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['share_transfers', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('share_transfers')
        .select('*')
        .order('transfer_date', { ascending: false });

      if (error) throw error;
      return data as ShareTransfer[];
    },
    enabled: !!user,
  });
};

export const useCreateShareTransfer = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (transfer: Omit<ShareTransfer, 'id' | 'created_at' | 'user_id'>) => {
      if (!user) throw new Error('Not authenticated');
      
      const { data, error } = await supabase
        .from('share_transfers')
        .insert({ ...transfer, user_id: user.id })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['share_transfers'] });
      queryClient.invalidateQueries({ queryKey: ['implied_deposits'] });
      toast.success('Share transfer recorded');
    },
    onError: () => {
      toast.error('Failed to record share transfer');
    },
  });
};

export const useDeleteShareTransfer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('share_transfers')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['share_transfers'] });
      queryClient.invalidateQueries({ queryKey: ['implied_deposits'] });
      toast.success('Share transfer deleted');
    },
    onError: () => {
      toast.error('Failed to delete share transfer');
    },
  });
};
