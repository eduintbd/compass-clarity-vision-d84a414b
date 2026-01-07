import { motion } from 'framer-motion';
import { ArrowUpRight, RefreshCw } from 'lucide-react';
import { useAccounts } from '@/hooks/useAccounts';
import { formatCurrency, getTimeAgo } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

interface AccountsOverviewProps {
  onAddAccount?: () => void;
}

export const AccountsOverview = ({ onAddAccount }: AccountsOverviewProps) => {
  const { data: accounts, isLoading } = useAccounts();

  if (isLoading) {
    return (
      <div className="glass-card p-6">
        <Skeleton className="h-6 w-32 mb-6" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="glass-card p-6"
    >
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-display text-lg font-semibold">Accounts</h3>
        <button className="flex items-center gap-1 text-primary text-sm font-medium hover:underline">
          View All <ArrowUpRight className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-3">
        {accounts?.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-4">No accounts yet. Add your first account!</p>
        ) : (
          accounts?.slice(0, 5).map((account, index) => (
            <motion.div
              key={account.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 + index * 0.05 }}
              className="flex items-center gap-4 p-3 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-colors cursor-pointer group"
            >
              <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center text-lg">
                {account.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{account.name}</p>
                <p className="text-xs text-muted-foreground">{account.institution}</p>
              </div>
              <div className="text-right">
                <p className={cn(
                  "font-semibold font-display",
                  account.balance >= 0 ? 'text-foreground' : 'text-destructive'
                )}>
                  {formatCurrency(account.balance)}
                </p>
                <div className="flex items-center justify-end gap-1 text-xs text-muted-foreground">
                  <RefreshCw className="w-3 h-3" />
                  {getTimeAgo(account.last_synced_at)}
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>

      <button 
        onClick={onAddAccount}
        className="w-full mt-4 p-3 rounded-xl border border-dashed border-border/50 text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors text-sm font-medium"
      >
        + Link New Account
      </button>
    </motion.div>
  );
};
