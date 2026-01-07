import { motion } from 'framer-motion';
import { ArrowUpRight, Check, Clock } from 'lucide-react';
import { useTransactions } from '@/hooks/useTransactions';
import { useAccounts } from '@/hooks/useAccounts';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

const categoryIcons: Record<string, string> = {
  'Income': '💰', 'Groceries': '🛒', 'Transport': '🚗', 'Dining': '🍽️',
  'Entertainment': '🎬', 'Utilities': '⚡', 'Shopping': '🛍️', 'Healthcare': '💊',
  'Education': '📚', 'Transfer': '🔄',
};

interface RecentTransactionsProps {
  onAddTransaction?: () => void;
}

export const RecentTransactions = ({ onAddTransaction }: RecentTransactionsProps) => {
  const { data: transactions, isLoading } = useTransactions(6);
  const { data: accounts } = useAccounts();

  const getAccountName = (accountId: string) => {
    return accounts?.find(a => a.id === accountId)?.name || 'Unknown';
  };

  if (isLoading) {
    return (
      <div className="glass-card p-6 col-span-full lg:col-span-2">
        <Skeleton className="h-6 w-48 mb-6" />
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="glass-card p-6 col-span-full lg:col-span-2"
    >
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-display text-lg font-semibold">Recent Transactions</h3>
        <button className="flex items-center gap-1 text-primary text-sm font-medium hover:underline">
          View All <ArrowUpRight className="w-4 h-4" />
        </button>
      </div>

      {transactions?.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-muted-foreground mb-4">No transactions yet.</p>
          <button onClick={onAddTransaction} className="text-primary hover:underline text-sm font-medium">
            Add your first transaction
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border/50">
                <th className="text-left py-3 px-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">Transaction</th>
                <th className="text-left py-3 px-2 text-xs font-medium text-muted-foreground uppercase tracking-wider hidden sm:table-cell">Category</th>
                <th className="text-left py-3 px-2 text-xs font-medium text-muted-foreground uppercase tracking-wider hidden md:table-cell">Account</th>
                <th className="text-right py-3 px-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">Amount</th>
                <th className="text-center py-3 px-2 text-xs font-medium text-muted-foreground uppercase tracking-wider w-16">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {transactions?.map((transaction, index) => (
                <motion.tr
                  key={transaction.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 + index * 0.05 }}
                  className="hover:bg-secondary/20 transition-colors cursor-pointer"
                >
                  <td className="py-4 px-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-secondary/50 flex items-center justify-center text-lg">
                        {categoryIcons[transaction.category] || '📝'}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{transaction.description}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(transaction.date)}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-2 hidden sm:table-cell">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-secondary/50 text-xs font-medium">
                      {transaction.category}
                    </span>
                  </td>
                  <td className="py-4 px-2 hidden md:table-cell">
                    <span className="text-sm text-muted-foreground">
                      {getAccountName(transaction.account_id)}
                    </span>
                  </td>
                  <td className="py-4 px-2 text-right">
                    <span className={cn(
                      "font-semibold font-display",
                      transaction.type === 'income' ? 'text-success' : 'text-foreground'
                    )}>
                      {transaction.type === 'income' ? '+' : ''}{formatCurrency(transaction.amount)}
                    </span>
                  </td>
                  <td className="py-4 px-2">
                    <div className="flex justify-center">
                      {transaction.is_reviewed ? (
                        <div className="w-6 h-6 rounded-full bg-success/10 flex items-center justify-center">
                          <Check className="w-3.5 h-3.5 text-success" />
                        </div>
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-warning/10 flex items-center justify-center">
                          <Clock className="w-3.5 h-3.5 text-warning" />
                        </div>
                      )}
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </motion.div>
  );
};
