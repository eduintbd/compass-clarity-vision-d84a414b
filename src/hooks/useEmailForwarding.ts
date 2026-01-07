import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface EmailForwarding {
  id: string;
  user_id: string;
  forwarding_key: string;
  is_active: boolean;
  emails_processed: number;
  last_email_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ParsedTransaction {
  id: string;
  user_id: string;
  raw_email_content: string | null;
  parsed_amount: number | null;
  parsed_description: string | null;
  parsed_date: string | null;
  parsed_merchant: string | null;
  parsed_type: 'income' | 'expense' | 'transfer' | null;
  parsed_category: string | null;
  confidence_score: number | null;
  status: 'pending' | 'approved' | 'rejected';
  linked_transaction_id: string | null;
  created_at: string;
  updated_at: string;
}

export const useEmailForwarding = () => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['email-forwarding', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('email_forwarding')
        .select('*')
        .eq('user_id', user!.id)
        .maybeSingle();
      
      if (error) throw error;
      return data as EmailForwarding | null;
    },
    enabled: !!user,
  });
};

export const useCreateEmailForwarding = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from('email_forwarding')
        .upsert({ user_id: user?.id }, { onConflict: 'user_id' })
        .select()
        .single();
      
      if (error) throw error;
      return data as EmailForwarding;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-forwarding'] });
      toast.success('Email forwarding enabled');
    },
    onError: (error) => {
      toast.error('Failed to enable email forwarding: ' + error.message);
    },
  });
};

export const useToggleEmailForwarding = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { data, error } = await supabase
        .from('email_forwarding')
        .update({ is_active: isActive })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['email-forwarding'] });
      toast.success(variables.isActive ? 'Email forwarding enabled' : 'Email forwarding disabled');
    },
    onError: (error) => {
      toast.error('Failed to update: ' + error.message);
    },
  });
};

export const useParsedTransactions = () => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['parsed-transactions', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('parsed_transactions')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as ParsedTransaction[];
    },
    enabled: !!user,
  });
};

export const useUpdateParsedTransaction = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'approved' | 'rejected' }) => {
      const { data, error } = await supabase
        .from('parsed_transactions')
        .update({ status })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parsed-transactions'] });
    },
    onError: (error) => {
      toast.error('Failed to update: ' + error.message);
    },
  });
};

export const useDeleteParsedTransaction = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('parsed_transactions')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parsed-transactions'] });
      toast.success('Parsed transaction deleted');
    },
    onError: (error) => {
      toast.error('Failed to delete: ' + error.message);
    },
  });
};

export const useSubmitEmailForParsing = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ emailContent, forwardingKey }: { emailContent: string; forwardingKey: string }) => {
      const { data, error } = await supabase.functions.invoke('parse-email', {
        body: { emailContent, forwardingKey },
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parsed-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['email-forwarding'] });
      toast.success('Email parsed successfully');
    },
    onError: (error) => {
      toast.error('Failed to parse email: ' + error.message);
    },
  });
};
