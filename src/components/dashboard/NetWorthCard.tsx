import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, ArrowUpRight } from 'lucide-react';
import { useAccounts } from '@/hooks/useAccounts';
import { formatCurrency, formatCompactCurrency } from '@/lib/formatters';
import { AreaChart, Area, ResponsiveContainer, Tooltip, XAxis } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';

export const NetWorthCard = () => {
  const { data: accounts, isLoading } = useAccounts();

  if (isLoading) {
    return (
      <div className="glass-card p-6 col-span-full lg:col-span-2">
        <Skeleton className="h-8 w-48 mb-2" />
        <Skeleton className="h-12 w-64 mb-4" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  const totalAssets = accounts?.filter(a => a.balance > 0).reduce((sum, a) => sum + a.balance, 0) || 0;
  const totalLiabilities = Math.abs(accounts?.filter(a => a.balance < 0).reduce((sum, a) => sum + a.balance, 0) || 0);
  const netWorth = totalAssets - totalLiabilities;

  // Generate sample history data based on current net worth
  const netWorthHistory = [
    { month: 'Aug', value: netWorth * 0.85 },
    { month: 'Sep', value: netWorth * 0.88 },
    { month: 'Oct', value: netWorth * 0.92 },
    { month: 'Nov', value: netWorth * 0.95 },
    { month: 'Dec', value: netWorth * 0.98 },
    { month: 'Jan', value: netWorth },
  ];

  const previousNetWorth = netWorthHistory[netWorthHistory.length - 2].value;
  const changeAmount = netWorth - previousNetWorth;
  const changePercent = previousNetWorth > 0 ? ((changeAmount / previousNetWorth) * 100).toFixed(1) : '0';
  const isPositive = changeAmount >= 0;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="glass-card p-6 col-span-full lg:col-span-2"
    >
      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="stat-label mb-2">Total Net Worth</p>
          <h2 className="text-4xl font-display font-bold gold-text mb-2">
            {accounts?.length === 0 ? '৳0' : formatCurrency(netWorth)}
          </h2>
          {accounts && accounts.length > 0 && (
            <div className={`flex items-center gap-1 ${isPositive ? 'text-success' : 'text-destructive'}`}>
              {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              <span className="text-sm font-medium">
                {isPositive ? '+' : ''}{formatCompactCurrency(changeAmount)} ({changePercent}%)
              </span>
              <span className="text-muted-foreground text-sm ml-1">vs last month</span>
            </div>
          )}
        </div>
        <button className="flex items-center gap-1 text-primary text-sm font-medium hover:underline">
          View Details <ArrowUpRight className="w-4 h-4" />
        </button>
      </div>

      {accounts && accounts.length > 0 && (
        <>
          <div className="h-32">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={netWorthHistory}>
                <defs>
                  <linearGradient id="netWorthGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis 
                  dataKey="month" 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                />
                <Tooltip 
                  contentStyle={{
                    background: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                  }}
                  labelStyle={{ color: 'hsl(var(--foreground))' }}
                  formatter={(value: number) => [formatCurrency(value), 'Net Worth']}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  fill="url(#netWorthGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t border-border/50">
            <div>
              <p className="text-muted-foreground text-sm mb-1">Total Assets</p>
              <p className="text-xl font-semibold text-success">{formatCompactCurrency(totalAssets)}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-sm mb-1">Total Liabilities</p>
              <p className="text-xl font-semibold text-destructive">{formatCompactCurrency(totalLiabilities)}</p>
            </div>
          </div>
        </>
      )}

      {(!accounts || accounts.length === 0) && (
        <p className="text-muted-foreground text-center py-8">Add accounts to see your net worth</p>
      )}
    </motion.div>
  );
};
