import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usePortfolios, usePortfolioHoldings, Portfolio, Holding } from '@/hooks/usePortfolios';
import { formatCurrency } from '@/lib/formatters';
import { ArrowUpRight, ArrowDownRight, Minus, GitCompare } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface HoldingChange {
  symbol: string;
  companyName: string | null;
  status: 'new' | 'closed' | 'changed' | 'unchanged';
  oldQuantity?: number;
  newQuantity?: number;
  oldValue?: number;
  newValue?: number;
  quantityChange?: number;
  valueChange?: number;
  valueChangePercent?: number;
}

export const PortfolioComparison = () => {
  const { data: portfolios } = usePortfolios();
  const [portfolio1Id, setPortfolio1Id] = useState<string | null>(null);
  const [portfolio2Id, setPortfolio2Id] = useState<string | null>(null);

  const { data: holdings1 } = usePortfolioHoldings(portfolio1Id);
  const { data: holdings2 } = usePortfolioHoldings(portfolio2Id);

  const portfolio1 = portfolios?.find(p => p.id === portfolio1Id);
  const portfolio2 = portfolios?.find(p => p.id === portfolio2Id);

  const compareHoldings = (): HoldingChange[] => {
    if (!holdings1 || !holdings2) return [];

    const changes: HoldingChange[] = [];
    const holdings2Map = new Map(holdings2.map(h => [h.symbol, h]));
    const holdings1Map = new Map(holdings1.map(h => [h.symbol, h]));

    // Check holdings in portfolio1 (older)
    holdings1.forEach(h1 => {
      const h2 = holdings2Map.get(h1.symbol);
      if (!h2) {
        // Position closed
        changes.push({
          symbol: h1.symbol,
          companyName: h1.company_name,
          status: 'closed',
          oldQuantity: h1.quantity,
          oldValue: h1.market_value,
          newQuantity: 0,
          newValue: 0,
          quantityChange: -h1.quantity,
          valueChange: -h1.market_value,
        });
      } else {
        // Position exists in both
        const quantityChange = h2.quantity - h1.quantity;
        const valueChange = h2.market_value - h1.market_value;
        const valueChangePercent = h1.market_value > 0 
          ? ((h2.market_value - h1.market_value) / h1.market_value) * 100 
          : 0;

        changes.push({
          symbol: h1.symbol,
          companyName: h2.company_name || h1.company_name,
          status: quantityChange === 0 && Math.abs(valueChange) < 1 ? 'unchanged' : 'changed',
          oldQuantity: h1.quantity,
          newQuantity: h2.quantity,
          oldValue: h1.market_value,
          newValue: h2.market_value,
          quantityChange,
          valueChange,
          valueChangePercent,
        });
      }
    });

    // Check for new positions in portfolio2
    holdings2.forEach(h2 => {
      if (!holdings1Map.has(h2.symbol)) {
        changes.push({
          symbol: h2.symbol,
          companyName: h2.company_name,
          status: 'new',
          newQuantity: h2.quantity,
          newValue: h2.market_value,
          quantityChange: h2.quantity,
          valueChange: h2.market_value,
        });
      }
    });

    return changes.sort((a, b) => {
      const order = { new: 0, closed: 1, changed: 2, unchanged: 3 };
      return order[a.status] - order[b.status];
    });
  };

  const changes = compareHoldings();
  const totalValueChange = portfolio1 && portfolio2 
    ? portfolio2.total_market_value - portfolio1.total_market_value 
    : 0;
  const totalGainChange = portfolio1 && portfolio2
    ? portfolio2.total_unrealized_gain - portfolio1.total_unrealized_gain
    : 0;

  if (!portfolios || portfolios.length < 2) {
    return (
      <Card className="bg-card/50 border-border/50">
        <CardContent className="pt-6 text-center text-muted-foreground">
          <GitCompare className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Upload at least 2 portfolio statements to compare changes</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card/50 border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <GitCompare className="h-5 w-5" />
          Portfolio Comparison
        </CardTitle>
        <CardDescription>Compare holdings between two portfolio snapshots</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Selectors */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">From (Earlier)</label>
            <Select value={portfolio1Id || ''} onValueChange={setPortfolio1Id}>
              <SelectTrigger>
                <SelectValue placeholder="Select portfolio" />
              </SelectTrigger>
              <SelectContent>
                {portfolios.map(p => (
                  <SelectItem key={p.id} value={p.id} disabled={p.id === portfolio2Id}>
                    {p.broker_name} - {p.account_number} ({p.as_of_date || 'No date'})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">To (Later)</label>
            <Select value={portfolio2Id || ''} onValueChange={setPortfolio2Id}>
              <SelectTrigger>
                <SelectValue placeholder="Select portfolio" />
              </SelectTrigger>
              <SelectContent>
                {portfolios.map(p => (
                  <SelectItem key={p.id} value={p.id} disabled={p.id === portfolio1Id}>
                    {p.broker_name} - {p.account_number} ({p.as_of_date || 'No date'})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Summary Changes */}
        {portfolio1 && portfolio2 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-3 bg-muted/30 rounded-lg">
              <p className="text-xs text-muted-foreground">Value Change</p>
              <p className={`text-lg font-semibold flex items-center gap-1 ${totalValueChange >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                {totalValueChange >= 0 ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                {formatCurrency(Math.abs(totalValueChange))}
              </p>
            </div>
            <div className="p-3 bg-muted/30 rounded-lg">
              <p className="text-xs text-muted-foreground">Gain/Loss Change</p>
              <p className={`text-lg font-semibold flex items-center gap-1 ${totalGainChange >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                {totalGainChange >= 0 ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                {formatCurrency(Math.abs(totalGainChange))}
              </p>
            </div>
            <div className="p-3 bg-muted/30 rounded-lg">
              <p className="text-xs text-muted-foreground">New Positions</p>
              <p className="text-lg font-semibold text-emerald-500">
                {changes.filter(c => c.status === 'new').length}
              </p>
            </div>
            <div className="p-3 bg-muted/30 rounded-lg">
              <p className="text-xs text-muted-foreground">Closed Positions</p>
              <p className="text-lg font-semibold text-red-500">
                {changes.filter(c => c.status === 'closed').length}
              </p>
            </div>
          </div>
        )}

        {/* Holdings Changes Table */}
        {changes.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-3">Position Changes</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50">
                    <th className="text-left py-2 px-2 text-muted-foreground font-medium">Symbol</th>
                    <th className="text-left py-2 px-2 text-muted-foreground font-medium">Status</th>
                    <th className="text-right py-2 px-2 text-muted-foreground font-medium">Old Qty</th>
                    <th className="text-right py-2 px-2 text-muted-foreground font-medium">New Qty</th>
                    <th className="text-right py-2 px-2 text-muted-foreground font-medium">Qty Change</th>
                    <th className="text-right py-2 px-2 text-muted-foreground font-medium">Old Value</th>
                    <th className="text-right py-2 px-2 text-muted-foreground font-medium">New Value</th>
                    <th className="text-right py-2 px-2 text-muted-foreground font-medium">Value Change</th>
                  </tr>
                </thead>
                <tbody>
                  {changes.map((change, idx) => (
                    <tr key={idx} className="border-b border-border/30 hover:bg-muted/20">
                      <td className="py-2 px-2">
                        <div>
                          <p className="font-medium">{change.symbol}</p>
                          {change.companyName && (
                            <p className="text-xs text-muted-foreground truncate max-w-32">{change.companyName}</p>
                          )}
                        </div>
                      </td>
                      <td className="py-2 px-2">
                        <Badge variant={
                          change.status === 'new' ? 'default' :
                          change.status === 'closed' ? 'destructive' :
                          change.status === 'changed' ? 'secondary' : 'outline'
                        }>
                          {change.status}
                        </Badge>
                      </td>
                      <td className="py-2 px-2 text-right">{change.oldQuantity?.toLocaleString() || '-'}</td>
                      <td className="py-2 px-2 text-right">{change.newQuantity?.toLocaleString() || '-'}</td>
                      <td className={`py-2 px-2 text-right ${(change.quantityChange || 0) > 0 ? 'text-emerald-500' : (change.quantityChange || 0) < 0 ? 'text-red-500' : ''}`}>
                        {change.quantityChange !== undefined ? (
                          change.quantityChange > 0 ? `+${change.quantityChange.toLocaleString()}` : change.quantityChange.toLocaleString()
                        ) : '-'}
                      </td>
                      <td className="py-2 px-2 text-right">{change.oldValue !== undefined ? formatCurrency(change.oldValue) : '-'}</td>
                      <td className="py-2 px-2 text-right">{change.newValue !== undefined ? formatCurrency(change.newValue) : '-'}</td>
                      <td className={`py-2 px-2 text-right ${(change.valueChange || 0) > 0 ? 'text-emerald-500' : (change.valueChange || 0) < 0 ? 'text-red-500' : ''}`}>
                        {change.valueChange !== undefined ? (
                          <>
                            {change.valueChange > 0 ? '+' : ''}{formatCurrency(change.valueChange)}
                            {change.valueChangePercent !== undefined && (
                              <span className="text-xs ml-1">({change.valueChangePercent.toFixed(1)}%)</span>
                            )}
                          </>
                        ) : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
