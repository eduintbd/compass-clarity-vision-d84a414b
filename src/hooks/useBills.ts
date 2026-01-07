import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface Bill {
  id: string;
  user_id: string;
  name: string;
  amount: number;
  category: string;
  due_date: number | null;
  frequency: 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  account_id: string | null;
  is_active: boolean;
  auto_pay: boolean;
  next_due_date: string | null;
  created_at: string;
  updated_at: string;
}

export const useBills = () => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['bills', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bills')
        .select('*')
        .order('next_due_date', { ascending: true });
      
      if (error) throw error;
      return data as Bill[];
    },
    enabled: !!user,
  });
};

export const useCreateBill = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async (bill: Omit<Bill, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('bills')
        .insert({ ...bill, user_id: user?.id })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bills'] });
      toast.success('Bill created successfully');
    },
    onError: (error) => {
      toast.error('Failed to create bill: ' + error.message);
    },
  });
};

export const useUpdateBill = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Bill> & { id: string }) => {
      const { data, error } = await supabase
        .from('bills')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bills'] });
      toast.success('Bill updated successfully');
    },
    onError: (error) => {
      toast.error('Failed to update bill: ' + error.message);
    },
  });
};

export const useDeleteBill = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('bills')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bills'] });
      toast.success('Bill deleted successfully');
    },
    onError: (error) => {
      toast.error('Failed to delete bill: ' + error.message);
    },
  });
};
