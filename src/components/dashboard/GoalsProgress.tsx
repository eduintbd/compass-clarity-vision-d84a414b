import { motion } from 'framer-motion';
import { ArrowUpRight, Calendar } from 'lucide-react';
import { useGoals } from '@/hooks/useGoals';
import { formatCompactCurrency } from '@/lib/formatters';
import { Skeleton } from '@/components/ui/skeleton';

interface GoalsProgressProps {
  onAddGoal?: () => void;
}

export const GoalsProgress = ({ onAddGoal }: GoalsProgressProps) => {
  const { data: goals, isLoading } = useGoals();

  if (isLoading) {
    return (
      <div className="glass-card p-6">
        <Skeleton className="h-6 w-32 mb-6" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 w-full" />)}
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.35 }}
      className="glass-card p-6"
    >
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-display text-lg font-semibold">Savings Goals</h3>
        <button className="flex items-center gap-1 text-primary text-sm font-medium hover:underline">
          View All <ArrowUpRight className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-4">
        {goals?.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-4">No goals yet. Set your first savings goal!</p>
        ) : (
          goals?.filter(g => !g.is_completed).slice(0, 3).map((goal, index) => {
            const percentage = goal.target_amount > 0 ? (goal.current_amount / goal.target_amount) * 100 : 0;
            const deadline = goal.deadline ? new Date(goal.deadline) : null;
            const today = new Date();
            const daysRemaining = deadline ? Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) : null;
            
            return (
              <motion.div
                key={goal.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 + index * 0.1 }}
                className="p-4 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-colors cursor-pointer"
              >
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-lg">
                    {goal.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{goal.name}</p>
                    {deadline && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                        <Calendar className="w-3 h-3" />
                        {daysRemaining !== null && daysRemaining > 0 ? `${daysRemaining} days left` : 'Deadline passed'}
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold font-display gold-text">
                      {Math.round(percentage)}%
                    </p>
                  </div>
                </div>
                
                <div className="progress-track h-2 mb-2">
                  <motion.div 
                    className="progress-fill"
                    initial={{ width: 0 }}
                    animate={{ width: `${percentage}%` }}
                    transition={{ duration: 1, delay: 0.6 + index * 0.1 }}
                  />
                </div>
                
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{formatCompactCurrency(goal.current_amount)} saved</span>
                  <span>{formatCompactCurrency(goal.target_amount)} target</span>
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      <button 
        onClick={onAddGoal}
        className="w-full mt-4 p-3 rounded-xl border border-dashed border-border/50 text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors text-sm font-medium"
      >
        + Create New Goal
      </button>
    </motion.div>
  );
};
