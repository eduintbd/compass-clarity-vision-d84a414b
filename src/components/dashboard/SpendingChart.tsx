import { motion } from 'framer-motion';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { useTransactions } from '@/hooks/useTransactions';
import { formatCurrency, formatCompactCurrency } from '@/lib/formatters';
import { Skeleton } from '@/components/ui/skeleton';

const COLORS = [
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-1))',
  'hsl(var(--chart-5))',
];

export const SpendingChart = () => {
  const { data: transactions, isLoading } = useTransactions();

  if (isLoading) {
    return (
      <div className="glass-card p-6">
        <Skeleton className="h-6 w-40 mb-6" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  // Calculate spending by category from real transactions
  const expenses = transactions?.filter(t => t.type === 'expense') || [];
  const spendingByCategory = expenses.reduce((acc, t) => {
    const category = t.category;
    const amount = Math.abs(t.amount);
    acc[category] = (acc[category] || 0) + amount;
    return acc;
  }, {} as Record<string, number>);

  const chartData = Object.entries(spendingByCategory)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  const totalSpending = chartData.reduce((sum, item) => sum + item.value, 0);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.55 }}
      className="glass-card p-6"
    >
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-display text-lg font-semibold">Spending by Category</h3>
        <span className="text-sm text-muted-foreground">This Month</span>
      </div>

      {chartData.length === 0 ? (
        <div className="h-40 flex items-center justify-center">
          <p className="text-muted-foreground text-sm">No spending data yet</p>
        </div>
      ) : (
        <div className="flex items-center gap-6">
          {/* Pie Chart */}
          <div className="relative w-40 h-40 flex-shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={70}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{
                    background: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                  }}
                  formatter={(value: number) => [formatCurrency(value), 'Spent']}
                />
              </PieChart>
            </ResponsiveContainer>
            {/* Center Text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <p className="text-xs text-muted-foreground">Total</p>
              <p className="text-lg font-bold font-display">{formatCompactCurrency(totalSpending)}</p>
            </div>
          </div>

          {/* Legend */}
          <div className="flex-1 space-y-2">
            {chartData.map((item, index) => (
              <motion.div
                key={item.name}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 + index * 0.05 }}
                className="flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <span className="text-sm">{item.name}</span>
                </div>
                <span className="text-sm text-muted-foreground">
                  {formatCompactCurrency(item.value)}
                </span>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
};
