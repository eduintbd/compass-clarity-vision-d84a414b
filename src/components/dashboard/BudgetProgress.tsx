import { motion } from 'framer-motion';
import { ArrowUpRight, AlertCircle } from 'lucide-react';
import { useBudgets } from '@/hooks/useBudgets';
import { formatCurrency, formatPercentage } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

interface BudgetProgressProps {
  onAddBudget?: () => void;
}

export const BudgetProgress = ({ onAddBudget }: BudgetProgressProps) => {
  const { data: budgets, isLoading } = useBudgets();

  if (isLoading) {
    return (
      <div className="glass-card p-6">
        <Skeleton className="h-6 w-40 mb-6" />
        <Skeleton className="h-3 w-full mb-4" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
        </div>
      </div>
    );
  }

  const totalAllocated = budgets?.reduce((sum, b) => sum + b.allocated, 0) || 0;
  const totalSpent = budgets?.reduce((sum, b) => sum + b.spent, 0) || 0;
  const overallPercentage = totalAllocated > 0 ? (totalSpent / totalAllocated) * 100 : 0;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="glass-card p-6"
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="font-display text-lg font-semibold">Monthly Budget</h3>
          <p className="text-sm text-muted-foreground mt-1">
            {formatCurrency(totalSpent)} of {formatCurrency(totalAllocated)}
          </p>
        </div>
        <button className="flex items-center gap-1 text-primary text-sm font-medium hover:underline" onClick={onAddBudget}>
          Manage <ArrowUpRight className="w-4 h-4" />
        </button>
      </div>

      {budgets?.length === 0 ? (
        <p className="text-muted-foreground text-sm text-center py-4">No budgets set. Create your first budget!</p>
      ) : (
        <>
          <div className="mb-6">
            <div className="progress-track h-3 mb-2">
              <motion.div 
                className="progress-fill"
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(overallPercentage, 100)}%` }}
                transition={{ duration: 1, delay: 0.5 }}
              />
            </div>
            <p className="text-xs text-muted-foreground text-right">
              {formatPercentage(overallPercentage)} used
            </p>
          </div>

          <div className="space-y-4">
            {budgets?.slice(0, 5).map((budget, index) => {
              const percentage = budget.allocated > 0 ? (budget.spent / budget.allocated) * 100 : 0;
              const isOverBudget = percentage >= 90;
              
              return (
                <motion.div
                  key={budget.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + index * 0.05 }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{budget.category}</span>
                      {isOverBudget && <AlertCircle className="w-4 h-4 text-warning" />}
                    </div>
                    <span className={cn("text-sm", isOverBudget ? 'text-warning' : 'text-muted-foreground')}>
                      {formatCurrency(budget.spent)} / {formatCurrency(budget.allocated)}
                    </span>
                  </div>
                  <div className="progress-track h-2">
                    <motion.div 
                      className="h-full rounded-full transition-all duration-500"
                      style={{ 
                        backgroundColor: isOverBudget ? 'hsl(var(--warning))' : budget.color,
                        width: `${Math.min(percentage, 100)}%`
                      }}
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(percentage, 100)}%` }}
                      transition={{ duration: 0.8, delay: 0.5 + index * 0.1 }}
                    />
                  </div>
                </motion.div>
              );
            })}
          </div>
        </>
      )}
    </motion.div>
  );
};
