import { useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Building2, CreditCard, Wallet, TrendingUp, Landmark } from "lucide-react";
import { useAccounts } from "@/hooks/useAccounts";
import { AddAccountModal } from "@/components/modals/AddAccountModal";
import { formatCurrency } from "@/lib/formatters";
import { Skeleton } from "@/components/ui/skeleton";

const accountTypeIcons: Record<string, React.ReactNode> = {
  checking: <Building2 className="h-5 w-5" />,
  savings: <Landmark className="h-5 w-5" />,
  credit: <CreditCard className="h-5 w-5" />,
  investment: <TrendingUp className="h-5 w-5" />,
  wallet: <Wallet className="h-5 w-5" />,
};

const Accounts = () => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const { data: accounts, isLoading } = useAccounts();

  const totalBalance = accounts?.reduce((sum, acc) => sum + Number(acc.balance), 0) ?? 0;
  const totalAssets = accounts?.filter(a => Number(a.balance) > 0).reduce((sum, acc) => sum + Number(acc.balance), 0) ?? 0;
  const totalLiabilities = accounts?.filter(a => Number(a.balance) < 0).reduce((sum, acc) => sum + Math.abs(Number(acc.balance)), 0) ?? 0;

  return (
    <div className="min-h-screen">
      <Sidebar activeItem="/accounts" />
      <main className="ml-64 p-8">
        <Header 
          title="Accounts"
          subtitle="Manage all your financial accounts"
        />
          <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex justify-end">
              <Button onClick={() => setIsAddModalOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Add Account
              </Button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-card/50 border-border/50">
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground">Total Balance</p>
                  <p className="text-2xl font-bold text-foreground">{formatCurrency(totalBalance)}</p>
                </CardContent>
              </Card>
              <Card className="bg-card/50 border-border/50">
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground">Total Assets</p>
                  <p className="text-2xl font-bold text-emerald-500">{formatCurrency(totalAssets)}</p>
                </CardContent>
              </Card>
              <Card className="bg-card/50 border-border/50">
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground">Total Liabilities</p>
                  <p className="text-2xl font-bold text-red-500">{formatCurrency(totalLiabilities)}</p>
                </CardContent>
              </Card>
            </div>

            {/* Accounts List */}
            <Card className="bg-card/50 border-border/50">
              <CardHeader>
                <CardTitle>All Accounts</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-20 w-full" />
                    ))}
                  </div>
                ) : accounts?.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Wallet className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No accounts yet. Add your first account to get started.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {accounts?.map((account) => (
                      <div
                        key={account.id}
                        className="flex items-center justify-between p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                            {accountTypeIcons[account.type] || <Wallet className="h-5 w-5" />}
                          </div>
                          <div>
                            <p className="font-medium text-foreground">{account.name}</p>
                            <p className="text-sm text-muted-foreground">{account.institution}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`text-lg font-semibold ${Number(account.balance) >= 0 ? 'text-foreground' : 'text-red-500'}`}>
                            {formatCurrency(Number(account.balance))}
                          </p>
                          <Badge variant="secondary" className="capitalize">
                            {account.type}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      <AddAccountModal open={isAddModalOpen} onOpenChange={setIsAddModalOpen} />
    </div>
  );
};

export default Accounts;
