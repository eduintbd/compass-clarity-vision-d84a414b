import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useUniqueAccounts, usePortfolios } from "@/hooks/usePortfolios";
import { usePrivateEquityCalculation } from "@/hooks/usePrivateEquityCalculation";
import { formatCurrency } from "@/lib/formatters";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, Upload, GitCompare, BarChart3, Calculator, FileText, Settings2, Wallet, Briefcase, DollarSign, Users, TrendingDown, Layers, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { PortfolioUpload } from "@/components/investments/PortfolioUpload";
import { PortfolioComparison } from "@/components/investments/PortfolioComparison";
import { PortfolioCharts } from "@/components/investments/PortfolioCharts";
import { PortfolioAnalytics } from "@/components/investments/PortfolioAnalytics";
import { TaxDocuments } from "@/components/investments/TaxDocuments";
import { PortfolioManagement } from "@/components/investments/PortfolioManagement";
import { CashFlowTracker } from "@/components/investments/CashFlowTracker";
import { AccountBreakdown } from "@/components/investments/AccountBreakdown";
import { PortfolioHoldings } from "@/components/investments/PortfolioHoldings";
import { useQueryClient } from "@tanstack/react-query";

const Investments = () => {
  const { data: uniqueAccounts, isLoading: portfoliosLoading } = useUniqueAccounts();
  const { data: allPortfolios } = usePortfolios();
  const { data: privateEquityData } = usePrivateEquityCalculation();
  const queryClient = useQueryClient();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ['portfolios'] });
    await queryClient.invalidateQueries({ queryKey: ['holdings'] });
    await queryClient.invalidateQueries({ queryKey: ['all-holdings'] });
    await queryClient.invalidateQueries({ queryKey: ['private-equity-calculation'] });
    await queryClient.invalidateQueries({ queryKey: ['holding-classifications'] });
    setTimeout(() => setIsRefreshing(false), 500);
  };

  // Calculate totals matching the AccountBreakdown table (using calculated private equity)
  const totals = uniqueAccounts?.reduce((acc, account) => {
    const loanCash = account.cash_balance - (account.margin_balance || 0);
    const peData = privateEquityData?.[account.account_number];
    const privateEquity = peData?.calculatedValue ?? (account.private_equity_value || 0);
    const equityAtMarket = account.total_market_value + loanCash - privateEquity;
    return {
      equityAtMarket: acc.equityAtMarket + equityAtMarket,
      loanCash: acc.loanCash + loanCash,
      unrealizedGain: acc.unrealizedGain + account.total_unrealized_gain,
    };
  }, { equityAtMarket: 0, loanCash: 0, unrealizedGain: 0 });
  
  const totalSnapshots = allPortfolios?.length || 0;

  const handleSaveSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['portfolios'] });
  };

  return (
    <div className="min-h-screen">
      <Sidebar activeItem="/investments" />
      <main className="ml-64 p-8">
        <div className="flex items-center justify-between mb-6">
          <Header 
            title="Investments"
            subtitle="Track your investment portfolio"
          />
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-card/50 border-border/50 hover:bg-card/70 transition-colors">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-muted-foreground">Equity at Market</p>
                  <div className="p-2 rounded-full bg-primary/10">
                    <Briefcase className="h-4 w-4 text-primary" />
                  </div>
                </div>
                {portfoliosLoading ? (
                  <Skeleton className="h-8 w-32" />
                ) : (
                  <p className="text-2xl font-bold text-foreground">{formatCurrency(totals?.equityAtMarket || 0)}</p>
                )}
              </CardContent>
            </Card>
            
            <Card className="bg-card/50 border-border/50 hover:bg-card/70 transition-colors">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-muted-foreground">Loan/Cash</p>
                  <div className={`p-2 rounded-full ${(totals?.loanCash || 0) >= 0 ? 'bg-emerald-500/10' : 'bg-red-500/10'}`}>
                    <DollarSign className={`h-4 w-4 ${(totals?.loanCash || 0) >= 0 ? 'text-emerald-500' : 'text-red-500'}`} />
                  </div>
                </div>
                {portfoliosLoading ? (
                  <Skeleton className="h-8 w-28" />
                ) : (
                  <p className={`text-2xl font-bold ${(totals?.loanCash || 0) >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                    {formatCurrency(totals?.loanCash || 0)}
                  </p>
                )}
              </CardContent>
            </Card>
            
            <Card className="bg-card/50 border-border/50 hover:bg-card/70 transition-colors">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-muted-foreground">Accounts</p>
                  <div className="p-2 rounded-full bg-blue-500/10">
                    <Users className="h-4 w-4 text-blue-500" />
                  </div>
                </div>
                {portfoliosLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <>
                    <p className="text-2xl font-bold text-foreground">{uniqueAccounts?.length || 0}</p>
                    <p className="text-xs text-muted-foreground mt-1">{totalSnapshots} snapshots</p>
                  </>
                )}
              </CardContent>
            </Card>
            
            <Card className="bg-card/50 border-border/50 hover:bg-card/70 transition-colors">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-muted-foreground">Unrealized Gain/Loss</p>
                  <div className={`p-2 rounded-full ${(totals?.unrealizedGain || 0) >= 0 ? 'bg-emerald-500/10' : 'bg-red-500/10'}`}>
                    {(totals?.unrealizedGain || 0) >= 0 ? (
                      <TrendingUp className="h-4 w-4 text-emerald-500" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-red-500" />
                    )}
                  </div>
                </div>
                {portfoliosLoading ? (
                  <Skeleton className="h-8 w-28" />
                ) : (
                  <p className={`text-2xl font-bold ${(totals?.unrealizedGain || 0) >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                    {formatCurrency(totals?.unrealizedGain || 0)}
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Account Breakdown Table */}
          <AccountBreakdown />

          {/* Tabs */}
          <Tabs defaultValue="upload" className="space-y-6">
            <TabsList className="bg-muted/30 flex-wrap">
              <TabsTrigger value="upload" className="flex items-center gap-2">
                <Upload className="h-4 w-4" /> Upload
              </TabsTrigger>
              <TabsTrigger value="holdings" className="flex items-center gap-2">
                <Layers className="h-4 w-4" /> Holdings
              </TabsTrigger>
              <TabsTrigger value="analytics" className="flex items-center gap-2">
                <Calculator className="h-4 w-4" /> Analytics
              </TabsTrigger>
              <TabsTrigger value="performance" className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" /> Performance
              </TabsTrigger>
              <TabsTrigger value="compare" className="flex items-center gap-2">
                <GitCompare className="h-4 w-4" /> Compare
              </TabsTrigger>
              <TabsTrigger value="tax" className="flex items-center gap-2">
                <FileText className="h-4 w-4" /> Tax Documents
              </TabsTrigger>
              <TabsTrigger value="cashflows" className="flex items-center gap-2">
                <Wallet className="h-4 w-4" /> Cash Flows
              </TabsTrigger>
              <TabsTrigger value="manage" className="flex items-center gap-2">
                <Settings2 className="h-4 w-4" /> Manage
              </TabsTrigger>
            </TabsList>

            <TabsContent value="upload">
              <PortfolioUpload onSaveSuccess={handleSaveSuccess} />
            </TabsContent>

            <TabsContent value="holdings">
              <PortfolioHoldings />
            </TabsContent>

            <TabsContent value="analytics">
              <PortfolioAnalytics />
            </TabsContent>

            <TabsContent value="performance">
              <PortfolioCharts />
            </TabsContent>

            <TabsContent value="compare">
              <PortfolioComparison />
            </TabsContent>

            <TabsContent value="tax">
              <TaxDocuments />
            </TabsContent>

            <TabsContent value="cashflows">
              <CashFlowTracker />
            </TabsContent>

            <TabsContent value="manage">
              <PortfolioManagement />
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
};

export default Investments;