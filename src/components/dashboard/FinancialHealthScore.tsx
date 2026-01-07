import { motion } from 'framer-motion';
import { Shield, TrendingUp, Wallet, PiggyBank } from 'lucide-react';
import { useAccounts } from '@/hooks/useAccounts';
import { useBudgets } from '@/hooks/useBudgets';
import { useGoals } from '@/hooks/useGoals';
import { Skeleton } from '@/components/ui/skeleton';

const statusColors = {
  'good': 'text-success',
  'moderate': 'text-warning',
  'needs-attention': 'text-destructive',
};

export const FinancialHealthScore = () => {
  const { data: accounts, isLoading: accountsLoading } = useAccounts();
  const { data: budgets, isLoading: budgetsLoading } = useBudgets();
  const { data: goals, isLoading: goalsLoading } = useGoals();

  const isLoading = accountsLoading || budgetsLoading || goalsLoading;

  if (isLoading) {
    return (
      <div className="glass-card p-6">
        <Skeleton className="h-6 w-48 mb-6" />
        <div className="flex items-center gap-6 mb-6">
          <Skeleton className="w-28 h-28 rounded-full" />
          <div className="flex-1">
            <Skeleton className="h-5 w-24 mb-2" />
            <Skeleton className="h-12 w-full" />
          </div>
        </div>
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
        </div>
      </div>
    );
  }

  const hasData = accounts && accounts.length > 0;

  // Calculate real metrics
  const totalAssets = accounts?.filter(a => a.balance > 0).reduce((sum, a) => sum + a.balance, 0) || 0;
  const totalLiabilities = Math.abs(accounts?.filter(a => a.balance < 0).reduce((sum, a) => sum + a.balance, 0) || 0);
  
  // Savings Rate (0-30 points)
  const savingsBalance = accounts?.filter(a => a.type === 'savings').reduce((sum, a) => sum + a.balance, 0) || 0;
  const savingsRatio = totalAssets > 0 ? (savingsBalance / totalAssets) * 100 : 0;
  const savingsScore = Math.min(30, Math.round((savingsRatio / 30) * 30));
  const savingsStatus = savingsScore >= 20 ? 'good' : savingsScore >= 10 ? 'moderate' : 'needs-attention';

  // Debt Ratio (0-25 points)
  const debtRatio = totalAssets > 0 ? (totalLiabilities / totalAssets) * 100 : 0;
  const debtScore = Math.max(0, Math.round(25 - (debtRatio / 4)));
  const debtStatus = debtScore >= 18 ? 'good' : debtScore >= 10 ? 'moderate' : 'needs-attention';

  // Emergency Fund (0-25 points) - based on having 3-6 months expenses
  const emergencyGoal = goals?.find(g => g.name.toLowerCase().includes('emergency'));
  const emergencyProgress = emergencyGoal 
    ? (emergencyGoal.current_amount / emergencyGoal.target_amount) * 100 
    : (savingsBalance > 0 ? 50 : 0);
  const emergencyScore = Math.min(25, Math.round((emergencyProgress / 100) * 25));
  const emergencyStatus = emergencyScore >= 18 ? 'good' : emergencyScore >= 10 ? 'moderate' : 'needs-attention';

  // Investment Diversification (0-20 points)
  const investmentAccounts = accounts?.filter(a => a.type === 'investment') || [];
  const investmentBalance = investmentAccounts.reduce((sum, a) => sum + a.balance, 0);
  const investmentRatio = totalAssets > 0 ? (investmentBalance / totalAssets) * 100 : 0;
  const investmentScore = Math.min(20, Math.round((investmentRatio / 30) * 20));
  const investmentStatus = investmentScore >= 14 ? 'good' : investmentScore >= 8 ? 'moderate' : 'needs-attention';

  const metrics = [
    { icon: PiggyBank, label: 'Savings Rate', score: savingsScore, maxScore: 30, status: savingsStatus as keyof typeof statusColors },
    { icon: Wallet, label: 'Debt Ratio', score: debtScore, maxScore: 25, status: debtStatus as keyof typeof statusColors },
    { icon: Shield, label: 'Emergency Fund', score: emergencyScore, maxScore: 25, status: emergencyStatus as keyof typeof statusColors },
    { icon: TrendingUp, label: 'Investment Diversification', score: investmentScore, maxScore: 20, status: investmentStatus as keyof typeof statusColors },
  ];

  const totalScore = metrics.reduce((sum, m) => sum + m.score, 0);
  const maxScore = metrics.reduce((sum, m) => sum + m.maxScore, 0);
  const percentage = (totalScore / maxScore) * 100;

  const getOverallStatus = () => {
    if (percentage >= 70) return { label: 'Good Standing', color: 'text-success' };
    if (percentage >= 50) return { label: 'Fair', color: 'text-warning' };
    return { label: 'Needs Improvement', color: 'text-destructive' };
  };

  const overallStatus = getOverallStatus();

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.6 }}
      className="glass-card p-6"
    >
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-display text-lg font-semibold">Financial Health Score</h3>
      </div>

      {!hasData ? (
        <div className="text-center py-8">
          <p className="text-muted-foreground text-sm">Add accounts to see your financial health score</p>
        </div>
      ) : (
        <>
          {/* Main Score */}
          <div className="flex items-center gap-6 mb-6">
            <div className="relative w-28 h-28">
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="56"
                  cy="56"
                  r="48"
                  stroke="hsl(var(--muted))"
                  strokeWidth="8"
                  fill="none"
                />
                <motion.circle
                  cx="56"
                  cy="56"
                  r="48"
                  stroke="url(#scoreGradient)"
                  strokeWidth="8"
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 48}
                  initial={{ strokeDashoffset: 2 * Math.PI * 48 }}
                  animate={{ strokeDashoffset: 2 * Math.PI * 48 * (1 - percentage / 100) }}
                  transition={{ duration: 1.5, ease: 'easeOut', delay: 0.7 }}
                />
                <defs>
                  <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="hsl(var(--primary))" />
                    <stop offset="100%" stopColor="hsl(var(--success))" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <motion.span 
                  className="text-3xl font-bold font-display gold-text"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1 }}
                >
                  {totalScore}
                </motion.span>
                <span className="text-xs text-muted-foreground">/ {maxScore}</span>
              </div>
            </div>
            <div className="flex-1">
              <p className={`font-semibold mb-1 ${overallStatus.color}`}>{overallStatus.label}</p>
              <p className="text-sm text-muted-foreground">
                {percentage >= 70 
                  ? 'Your financial health is above average. Keep up the good work!'
                  : percentage >= 50
                  ? 'Focus on improving your savings rate and reducing debt for a better score.'
                  : 'Consider building your emergency fund and reviewing your spending habits.'}
              </p>
            </div>
          </div>

          {/* Breakdown */}
          <div className="space-y-3">
            {metrics.map((metric, index) => (
              <motion.div
                key={metric.label}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.8 + index * 0.1 }}
                className="flex items-center gap-3"
              >
                <div className="w-8 h-8 rounded-lg bg-secondary/50 flex items-center justify-center">
                  <metric.icon className={`w-4 h-4 ${statusColors[metric.status]}`} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm">{metric.label}</span>
                    <span className={`text-sm font-semibold ${statusColors[metric.status]}`}>
                      {metric.score}/{metric.maxScore}
                    </span>
                  </div>
                  <div className="progress-track h-1.5">
                    <motion.div 
                      className={`h-full rounded-full ${
                        metric.status === 'good' ? 'bg-success' : 
                        metric.status === 'moderate' ? 'bg-warning' : 'bg-destructive'
                      }`}
                      initial={{ width: 0 }}
                      animate={{ width: `${(metric.score / metric.maxScore) * 100}%` }}
                      transition={{ duration: 0.8, delay: 1 + index * 0.1 }}
                    />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </>
      )}
    </motion.div>
  );
};
