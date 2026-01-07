import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { CashFlowChart } from "@/components/dashboard/CashFlowChart";

const CashFlow = () => {
  return (
    <div className="min-h-screen">
      <Sidebar activeItem="/cashflow" />
      <main className="ml-64 p-8">
        <Header 
          title="Cash Flow"
          subtitle="Track your income and expenses over time"
        />
        <div className="space-y-6">
          <CashFlowChart />
        </div>
      </main>
    </div>
  );
};

export default CashFlow;
