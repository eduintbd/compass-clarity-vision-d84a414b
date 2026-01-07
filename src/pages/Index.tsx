import { useState } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { NetWorthCard } from '@/components/dashboard/NetWorthCard';
import { AccountsOverview } from '@/components/dashboard/AccountsOverview';
import { BudgetProgress } from '@/components/dashboard/BudgetProgress';
import { GoalsProgress } from '@/components/dashboard/GoalsProgress';
import { RecentTransactions } from '@/components/dashboard/RecentTransactions';
import { CashFlowChart } from '@/components/dashboard/CashFlowChart';
import { AlertsPanel } from '@/components/dashboard/AlertsPanel';
import { SpendingChart } from '@/components/dashboard/SpendingChart';
import { FinancialHealthScore } from '@/components/dashboard/FinancialHealthScore';
import { EmailParsingCard } from '@/components/dashboard/EmailParsingCard';
import { AddTransactionModal } from '@/components/modals/AddTransactionModal';
import { AddAccountModal } from '@/components/modals/AddAccountModal';
import { AddBudgetModal } from '@/components/modals/AddBudgetModal';
import { AddGoalModal } from '@/components/modals/AddGoalModal';
import { useProfile } from '@/hooks/useProfile';

const Index = () => {
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [showGoalModal, setShowGoalModal] = useState(false);
  
  const { data: profile } = useProfile();
  
  const today = new Date();
  const formattedDate = today.toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  const userName = profile?.full_name?.split(' ')[0] || 'there';

  return (
    <div className="min-h-screen">
      <Sidebar activeItem="/" />
      
      <main className="ml-64 p-8">
        <Header 
          title={`Welcome back, ${userName}`}
          subtitle={formattedDate}
          onAddTransaction={() => setShowTransactionModal(true)}
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <NetWorthCard />
          <FinancialHealthScore />
          <AccountsOverview onAddAccount={() => setShowAccountModal(true)} />
          <BudgetProgress onAddBudget={() => setShowBudgetModal(true)} />
          <GoalsProgress onAddGoal={() => setShowGoalModal(true)} />
          <RecentTransactions onAddTransaction={() => setShowTransactionModal(true)} />
          <CashFlowChart />
          <SpendingChart />
          <AlertsPanel />
          <EmailParsingCard />
        </div>
      </main>

      <AddTransactionModal open={showTransactionModal} onOpenChange={setShowTransactionModal} />
      <AddAccountModal open={showAccountModal} onOpenChange={setShowAccountModal} />
      <AddBudgetModal open={showBudgetModal} onOpenChange={setShowBudgetModal} />
      <AddGoalModal open={showGoalModal} onOpenChange={setShowGoalModal} />
    </div>
  );
};

export default Index;
