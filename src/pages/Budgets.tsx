import { useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Plus, PieChart } from "lucide-react";
import { useBudgets } from "@/hooks/useBudgets";
import { AddBudgetModal } from "@/components/modals/AddBudgetModal";
import { formatCurrency } from "@/lib/formatters";
import { Skeleton } from "@/components/ui/skeleton";

const Budgets = () => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const { data: budgets, isLoading } = useBudgets();

  const totalAllocated = budgets?.reduce((sum, b) => sum + Number(b.allocated), 0) ?? 0;
  const totalSpent = budgets?.reduce((sum, b) => sum + Number(b.spent), 0) ?? 0;
  const totalRemaining = totalAllocated - totalSpent;

  return (
    <div className="min-h-screen">
      <Sidebar activeItem="/budgets" />
      <main className="ml-64 p-8">
        <Header 
          title="Budgets"
          subtitle="Set and track your spending limits"
        />
          <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex justify-end">
              <Button onClick={() => setIsAddModalOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Add Budget
              </Button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-card/50 border-border/50">
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground">Total Allocated</p>
                  <p className="text-2xl font-bold text-foreground">{formatCurrency(totalAllocated)}</p>
                </CardContent>
              </Card>
              <Card className="bg-card/50 border-border/50">
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground">Total Spent</p>
                  <p className="text-2xl font-bold text-amber-500">{formatCurrency(totalSpent)}</p>
                </CardContent>
              </Card>
              <Card className="bg-card/50 border-border/50">
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground">Remaining</p>
                  <p className={`text-2xl font-bold ${totalRemaining >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                    {formatCurrency(totalRemaining)}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Budgets List */}
            <Card className="bg-card/50 border-border/50">
              <CardHeader>
                <CardTitle>All Budgets</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-6">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-24 w-full" />
                    ))}
                  </div>
                ) : budgets?.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <PieChart className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No budgets yet. Create your first budget to start tracking.</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {budgets?.map((budget) => {
                      const percentage = Math.min((Number(budget.spent) / Number(budget.allocated)) * 100, 100);
                      const remaining = Number(budget.allocated) - Number(budget.spent);
                      const isOverBudget = remaining < 0;

                      return (
                        <div key={budget.id} className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div
                                className="h-4 w-4 rounded-full"
                                style={{ backgroundColor: budget.color || 'hsl(var(--primary))' }}
                              />
                              <span className="font-medium text-foreground">{budget.category}</span>
                            </div>
                            <div className="text-right">
                              <span className={`font-semibold ${isOverBudget ? 'text-red-500' : 'text-foreground'}`}>
                                {formatCurrency(Number(budget.spent))}
                              </span>
                              <span className="text-muted-foreground"> / {formatCurrency(Number(budget.allocated))}</span>
                            </div>
                          </div>
                          <Progress
                            value={percentage}
                            className="h-3"
                            style={{
                              '--progress-background': isOverBudget ? 'hsl(0 84% 60%)' : budget.color || 'hsl(var(--primary))'
                            } as React.CSSProperties}
                          />
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">{percentage.toFixed(0)}% used</span>
                            <span className={isOverBudget ? 'text-red-500' : 'text-muted-foreground'}>
                              {isOverBudget ? `${formatCurrency(Math.abs(remaining))} over` : `${formatCurrency(remaining)} left`}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      <AddBudgetModal open={isAddModalOpen} onOpenChange={setIsAddModalOpen} />
    </div>
  );
};

export default Budgets;
