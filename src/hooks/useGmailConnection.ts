import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface GmailConnection {
  id: string;
  user_id: string;
  email: string;
  is_active: boolean;
  last_sync_at: string | null;
  emails_fetched: number;
  created_at: string;
  updated_at: string;
}

interface GmailEmail {
  id: string;
  subject: string;
  from: string;
  date: string;
  attachments: Array<{
    filename: string;
    attachmentId: string;
    mimeType: string;
  }>;
}

export function useGmailConnection() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: connection, isLoading } = useQuery({
    queryKey: ['gmail_connection', user?.id],
    queryFn: async () => {
      if (!user) return null;
      
      const { data, error } = await supabase
        .from('gmail_connections')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle();

      if (error) throw error;
      return data as GmailConnection | null;
    },
    enabled: !!user,
  });

  const connectMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('gmail-auth');
      
      if (error) throw error;
      if (!data?.authUrl) throw new Error('No auth URL returned');
      
      // Redirect to Google OAuth
      window.location.href = data.authUrl;
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to start Gmail connection');
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.functions.invoke('gmail-disconnect');
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gmail_connection'] });
      toast.success('Gmail disconnected successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to disconnect Gmail');
    },
  });

  const fetchEmailsMutation = useMutation({
    mutationFn: async ({ daysBack = 30, parseEmails = false }: { daysBack?: number; parseEmails?: boolean }) => {
      const { data, error } = await supabase.functions.invoke('gmail-fetch-emails', {
        body: { daysBack, parseEmails }
      });
      
      if (error) throw error;
      return data as { emails: GmailEmail[]; count: number; parsed: any[]; parsedCount: number };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['gmail_connection'] });
      toast.success(`Found ${data.count} portfolio emails`);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to fetch emails');
    },
  });

  return {
    connection,
    isLoading,
    isConnected: !!connection,
    connect: connectMutation.mutate,
    isConnecting: connectMutation.isPending,
    disconnect: disconnectMutation.mutate,
    isDisconnecting: disconnectMutation.isPending,
    fetchEmails: fetchEmailsMutation.mutate,
    isFetchingEmails: fetchEmailsMutation.isPending,
    fetchedEmails: fetchEmailsMutation.data,
  };
}
