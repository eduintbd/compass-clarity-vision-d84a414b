import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Mail, Copy, Check, Send, Clock, CheckCircle, XCircle, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  useEmailForwarding, 
  useCreateEmailForwarding, 
  useToggleEmailForwarding,
  useParsedTransactions,
  useUpdateParsedTransaction,
  useDeleteParsedTransaction,
  useSubmitEmailForParsing 
} from '@/hooks/useEmailForwarding';
import { useCreateTransaction } from '@/hooks/useTransactions';
import { useAccounts } from '@/hooks/useAccounts';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export const EmailParsingSection = () => {
  const [emailContent, setEmailContent] = useState('');
  const [copied, setCopied] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<string>('');

  const { data: forwarding, isLoading: forwardingLoading } = useEmailForwarding();
  const { data: parsedTransactions, isLoading: transactionsLoading } = useParsedTransactions();
  const { data: accounts } = useAccounts();
  
  const createForwarding = useCreateEmailForwarding();
  const toggleForwarding = useToggleEmailForwarding();
  const submitEmail = useSubmitEmailForParsing();
  const updateParsed = useUpdateParsedTransaction();
  const deleteParsed = useDeleteParsedTransaction();
  const createTransaction = useCreateTransaction();

  const handleCopyEmail = () => {
    if (forwarding?.forwarding_key) {
      navigator.clipboard.writeText(`${forwarding.forwarding_key}@eduintbd.cloud`);
      setCopied(true);
      toast.success('Email address copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSubmitEmail = () => {
    if (!forwarding?.forwarding_key || !emailContent.trim()) return;
    submitEmail.mutate({ 
      emailContent: emailContent.trim(), 
      forwardingKey: forwarding.forwarding_key 
    });
    setEmailContent('');
  };

  const handleApprove = async (parsed: typeof parsedTransactions[0]) => {
    if (!selectedAccount) {
      toast.error('Please select an account first');
      return;
    }

    try {
      await createTransaction.mutateAsync({
        account_id: selectedAccount,
        amount: parsed.parsed_amount || 0,
        description: parsed.parsed_description || 'Parsed transaction',
        date: parsed.parsed_date || new Date().toISOString().split('T')[0],
        category: parsed.parsed_category || 'Other',
        subcategory: null,
        type: parsed.parsed_type || 'expense',
        merchant: parsed.parsed_merchant,
        tags: ['parsed-from-email'],
        notes: 'Automatically parsed from bank email',
        is_reviewed: false,
        is_recurring: false,
      });
      
      await updateParsed.mutateAsync({ id: parsed.id, status: 'approved' });
      toast.success('Transaction added to your ledger');
    } catch (error) {
      console.error('Failed to approve transaction:', error);
    }
  };

  const pendingTransactions = parsedTransactions?.filter(t => t.status === 'pending') || [];

  if (forwardingLoading) {
    return (
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64 mt-2" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Setup Section */}
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Mail className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">Email Transaction Parser</CardTitle>
                <CardDescription>
                  Forward bank emails to automatically extract transactions
                </CardDescription>
              </div>
            </div>
            {forwarding && (
              <Switch
                checked={forwarding.is_active}
                onCheckedChange={(checked) => 
                  toggleForwarding.mutate({ id: forwarding.id, isActive: checked })
                }
              />
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {!forwarding ? (
            <Button 
              onClick={() => createForwarding.mutate()}
              disabled={createForwarding.isPending}
              className="w-full"
            >
              <Mail className="mr-2 h-4 w-4" />
              Enable Email Parsing
            </Button>
          ) : (
            <>
              <div className="p-4 rounded-lg bg-muted/50 border border-border/50">
                <p className="text-sm text-muted-foreground mb-2">Your forwarding email address:</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 px-3 py-2 rounded bg-background text-sm font-mono">
                    {forwarding.forwarding_key}@eduintbd.cloud
                  </code>
                  <Button 
                    size="icon" 
                    variant="outline"
                    onClick={handleCopyEmail}
                  >
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="p-3 rounded-lg bg-muted/30">
                  <p className="text-muted-foreground">Emails Processed</p>
                  <p className="text-2xl font-semibold">{forwarding.emails_processed}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/30">
                  <p className="text-muted-foreground">Last Email</p>
                  <p className="text-lg font-medium">
                    {forwarding.last_email_at 
                      ? formatDate(forwarding.last_email_at) 
                      : 'Never'}
                  </p>
                </div>
              </div>

              {/* Manual paste section */}
              <div className="space-y-3 pt-4 border-t border-border/50">
                <p className="text-sm font-medium">Or paste email content manually:</p>
                <Textarea
                  placeholder="Paste your bank email content here..."
                  value={emailContent}
                  onChange={(e) => setEmailContent(e.target.value)}
                  rows={4}
                  className="resize-none"
                />
                <Button 
                  onClick={handleSubmitEmail}
                  disabled={!emailContent.trim() || submitEmail.isPending}
                  className="w-full"
                >
                  <Send className="mr-2 h-4 w-4" />
                  {submitEmail.isPending ? 'Parsing...' : 'Parse Email'}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Pending Transactions */}
      {pendingTransactions.length > 0 && (
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Pending Review</CardTitle>
              <Badge variant="secondary">{pendingTransactions.length} pending</Badge>
            </div>
            <CardDescription>
              Review and approve parsed transactions to add them to your ledger
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Account selector */}
            <div className="flex items-center gap-2">
              <p className="text-sm text-muted-foreground">Add to account:</p>
              <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Select account" />
                </SelectTrigger>
                <SelectContent>
                  {accounts?.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.icon} {account.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <AnimatePresence mode="popLayout">
              {pendingTransactions.map((parsed) => (
                <motion.div
                  key={parsed.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="p-4 rounded-lg border border-border/50 bg-background/50 space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium">{parsed.parsed_description || 'Unknown transaction'}</p>
                      <p className="text-sm text-muted-foreground">
                        {parsed.parsed_merchant && `${parsed.parsed_merchant} • `}
                        {parsed.parsed_date ? formatDate(parsed.parsed_date) : 'Unknown date'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={`text-lg font-semibold ${
                        parsed.parsed_type === 'income' ? 'text-green-500' : 'text-red-500'
                      }`}>
                        {parsed.parsed_type === 'income' ? '+' : '-'}
                        {formatCurrency(parsed.parsed_amount || 0)}
                      </p>
                      <Badge variant="outline" className="mt-1">
                        {parsed.parsed_category || 'Uncategorized'}
                      </Badge>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-border/30">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>Confidence: {Math.round((parsed.confidence_score || 0) * 100)}%</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => deleteParsed.mutate(parsed.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateParsed.mutate({ id: parsed.id, status: 'rejected' })}
                      >
                        <XCircle className="mr-1 h-4 w-4" />
                        Reject
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleApprove(parsed)}
                        disabled={!selectedAccount || createTransaction.isPending}
                      >
                        <CheckCircle className="mr-1 h-4 w-4" />
                        Approve
                      </Button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
