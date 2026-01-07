import { motion } from 'framer-motion';
import { ArrowUpRight, TrendingUp, TrendingDown } from 'lucide-react';
import { useTransactions } from '@/hooks/useTransactions';
import { formatCompactCurrency } from '@/lib/formatters';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';

export const CashFlowChart = () => {
  const { data: transactions, isLoading } = useTransactions();

  if (isLoading) {
    return (
      <div className="glass-card p-6">
        <Skeleton className="h-6 w-32 mb-6" />
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
        </div>
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  // Group transactions by week
  const cashFlowData = transactions?.reduce((acc, t) => {
    const date = new Date(t.date);
    const weekStart = new Date(date);
    weekStart.setDate(date.getDate() - date.getDay());
    const key = weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    
    if (!acc[key]) {
      acc[key] = { date: key, income: 0, expenses: 0 };
    }
    
    if (t.type === 'income') {
      acc[key].income += t.amount;
    } else if (t.type === 'expense') {
      acc[key].expenses += Math.abs(t.amount);
    }
    
    return acc;
  }, {} as Record<string, { date: string; income: number; expenses: number }>) || {};

  const chartData = Object.values(cashFlowData)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(-7);

  const totalIncome = chartData.reduce((sum, d) => sum + d.income, 0);
  const totalExpenses = chartData.reduce((sum, d) => sum + d.expenses, 0);
  const netCashFlow = totalIncome - totalExpenses;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.45 }}
      className="glass-card p-6"
    >
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-display text-lg font-semibold">Cash Flow</h3>
        <button className="flex items-center gap-1 text-primary text-sm font-medium hover:underline">
          Details <ArrowUpRight className="w-4 h-4" />
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="p-3 rounded-xl bg-success/10">
          <div className="flex items-center gap-1 text-success mb-1">
            <TrendingUp className="w-4 h-4" />
            <span className="text-xs font-medium">Income</span>
          </div>
          <p className="text-lg font-semibold font-display">{formatCompactCurrency(totalIncome)}</p>
        </div>
        <div className="p-3 rounded-xl bg-destructive/10">
          <div className="flex items-center gap-1 text-destructive mb-1">
            <TrendingDown className="w-4 h-4" />
            <span className="text-xs font-medium">Expenses</span>
          </div>
          <p className="text-lg font-semibold font-display">{formatCompactCurrency(totalExpenses)}</p>
        </div>
        <div className="p-3 rounded-xl bg-primary/10">
          <div className="flex items-center gap-1 text-primary mb-1">
            <span className="text-xs font-medium">Net</span>
          </div>
          <p className={`text-lg font-semibold font-display ${netCashFlow >= 0 ? 'gold-text' : 'text-destructive'}`}>
            {formatCompactCurrency(netCashFlow)}
          </p>
        </div>
      </div>

      {/* Chart */}
      {chartData.length === 0 ? (
        <div className="h-48 flex items-center justify-center">
          <p className="text-muted-foreground text-sm">No cash flow data yet</p>
        </div>
      ) : (
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} barGap={0}>
              <XAxis 
                dataKey="date" 
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
              />
              <YAxis 
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`}
              />
              <Tooltip 
                contentStyle={{
                  background: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                }}
                labelStyle={{ color: 'hsl(var(--foreground))' }}
                formatter={(value: number, name: string) => [
                  formatCompactCurrency(value), 
                  name === 'income' ? 'Income' : 'Expenses'
                ]}
              />
              <Bar dataKey="income" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
              <Bar dataKey="expenses" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </motion.div>
  );
};
