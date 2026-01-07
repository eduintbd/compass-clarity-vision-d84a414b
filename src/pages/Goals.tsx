import { useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Plus, Target, Calendar } from "lucide-react";
import { useGoals } from "@/hooks/useGoals";
import { AddGoalModal } from "@/components/modals/AddGoalModal";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { Skeleton } from "@/components/ui/skeleton";

const Goals = () => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const { data: goals, isLoading } = useGoals();

  const activeGoals = goals?.filter(g => !g.is_completed) ?? [];
  const completedGoals = goals?.filter(g => g.is_completed) ?? [];
  const totalTarget = activeGoals.reduce((sum, g) => sum + Number(g.target_amount), 0);
  const totalSaved = activeGoals.reduce((sum, g) => sum + Number(g.current_amount), 0);

  return (
    <div className="min-h-screen">
      <Sidebar activeItem="/goals" />
      <main className="ml-64 p-8">
        <Header 
          title="Savings Goals"
          subtitle="Track your progress towards financial goals"
        />
          <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex justify-end">
              <Button onClick={() => setIsAddModalOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Add Goal
              </Button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-card/50 border-border/50">
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground">Active Goals</p>
                  <p className="text-2xl font-bold text-foreground">{activeGoals.length}</p>
                </CardContent>
              </Card>
              <Card className="bg-card/50 border-border/50">
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground">Total Saved</p>
                  <p className="text-2xl font-bold text-emerald-500">{formatCurrency(totalSaved)}</p>
                </CardContent>
              </Card>
              <Card className="bg-card/50 border-border/50">
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground">Total Target</p>
                  <p className="text-2xl font-bold text-foreground">{formatCurrency(totalTarget)}</p>
                </CardContent>
              </Card>
            </div>

            {/* Active Goals */}
            <Card className="bg-card/50 border-border/50">
              <CardHeader>
                <CardTitle>Active Goals</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[1, 2, 3, 4].map((i) => (
                      <Skeleton key={i} className="h-40 w-full" />
                    ))}
                  </div>
                ) : activeGoals.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No active goals. Create a goal to start saving!</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {activeGoals.map((goal) => {
                      const percentage = Math.min((Number(goal.current_amount) / Number(goal.target_amount)) * 100, 100);
                      const remaining = Number(goal.target_amount) - Number(goal.current_amount);

                      return (
                        <Card key={goal.id} className="bg-muted/30 border-border/30">
                          <CardContent className="pt-6 space-y-4">
                            <div className="flex items-start justify-between">
                              <div className="flex items-center gap-3">
                                <span className="text-2xl">{goal.icon || '🎯'}</span>
                                <div>
                                  <p className="font-semibold text-foreground">{goal.name}</p>
                                  {goal.deadline && (
                                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                      <Calendar className="h-3 w-3" />
                                      <span>{formatDate(goal.deadline)}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                              <Badge variant={goal.priority === 1 ? "default" : "secondary"}>
                                P{goal.priority || 1}
                              </Badge>
                            </div>
                            <div className="space-y-2">
                              <div className="flex justify-between text-sm">
                                <span className="text-emerald-500 font-medium">
                                  {formatCurrency(Number(goal.current_amount))}
                                </span>
                                <span className="text-muted-foreground">
                                  {formatCurrency(Number(goal.target_amount))}
                                </span>
                              </div>
                              <Progress value={percentage} className="h-3" />
                              <div className="flex justify-between text-sm text-muted-foreground">
                                <span>{percentage.toFixed(0)}% complete</span>
                                <span>{formatCurrency(remaining)} to go</span>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Completed Goals */}
            {completedGoals.length > 0 && (
              <Card className="bg-card/50 border-border/50">
                <CardHeader>
                  <CardTitle>Completed Goals</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {completedGoals.map((goal) => (
                      <div key={goal.id} className="flex items-center gap-4 p-4 rounded-lg bg-emerald-500/10">
                        <span className="text-2xl">{goal.icon || '🎯'}</span>
                        <div className="flex-1">
                          <p className="font-medium text-foreground">{goal.name}</p>
                          <p className="text-sm text-emerald-500">
                            {formatCurrency(Number(goal.target_amount))} achieved!
                          </p>
                        </div>
                        <Badge variant="default" className="bg-emerald-500">Completed</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </main>
      <AddGoalModal open={isAddModalOpen} onOpenChange={setIsAddModalOpen} />
    </div>
  );
};

export default Goals;
