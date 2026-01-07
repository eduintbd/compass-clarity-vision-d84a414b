import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { formatCurrency } from '@/lib/formatters';
import { ArrowUpRight, ArrowDownRight, Plus, Minus, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface HoldingDiff {
  symbol: string;
  companyName?: string;
  status: 'new' | 'closed' | 'increased' | 'decreased' | 'unchanged';
  oldQuantity?: number;
  newQuantity?: number;
  quantityChange?: number;
  oldValue?: number;
  newValue?: number;
  valueChange?: number;
}

interface PortfolioChangesSummaryProps {
  previousPortfolio: {
    total_market_value: number;
    total_cost_basis: number;
    total_unrealized_gain: number;
    as_of_date: string | null;
  };
  newPortfolio: {
    total_market_value: number;
    total_cost_basis: number;
    total_unrealized_gain: number;
    as_of_date: string | null;
  };
  holdingChanges: HoldingDiff[];
  onDismiss?: () => void;
}

export const PortfolioChangesSummary = ({ 
  previousPortfolio, 
  newPortfolio, 
  holdingChanges,
  onDismiss 
}: PortfolioChangesSummaryProps) => {
  const valueChange = newPortfolio.total_market_value - previousPortfolio.total_market_value;
  const gainChange = newPortfolio.total_unrealized_gain - previousPortfolio.total_unrealized_gain;
  const valueChangePercent = previousPortfolio.total_market_value > 0 
    ? (valueChange / previousPortfolio.total_market_value) * 100 
    : 0;

  const newPositions = holdingChanges.filter(h => h.status === 'new');
  const closedPositions = holdingChanges.filter(h => h.status === 'closed');
  const changedPositions = holdingChanges.filter(h => h.status === 'increased' || h.status === 'decreased');

  return (
    <Card className="bg-card/50 border-border/50 border-primary/30">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-primary">
              <RefreshCw className="h-5 w-5" />
              Portfolio Updated
            </CardTitle>
            <CardDescription>
              Changes from {previousPortfolio.as_of_date || 'previous'} to {newPortfolio.as_of_date || 'now'}
            </CardDescription>
          </div>
          {onDismiss && (
            <button 
              onClick={onDismiss}
              className="text-muted-foreground hover:text-foreground text-sm"
            >
              Dismiss
            </button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-3 bg-muted/30 rounded-lg">
            <p className="text-xs text-muted-foreground">Value Change</p>
            <p className={`text-lg font-semibold flex items-center gap-1 ${valueChange >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
              {valueChange >= 0 ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
              {formatCurrency(Math.abs(valueChange))}
              <span className="text-xs">({valueChangePercent.toFixed(2)}%)</span>
            </p>
          </div>
          <div className="p-3 bg-muted/30 rounded-lg">
            <p className="text-xs text-muted-foreground">Gain/Loss Change</p>
            <p className={`text-lg font-semibold flex items-center gap-1 ${gainChange >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
              {gainChange >= 0 ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
              {formatCurrency(Math.abs(gainChange))}
            </p>
          </div>
          <div className="p-3 bg-muted/30 rounded-lg">
            <p className="text-xs text-muted-foreground">New Positions</p>
            <p className="text-lg font-semibold text-emerald-500 flex items-center gap-1">
              <Plus className="h-4 w-4" />
              {newPositions.length}
            </p>
          </div>
          <div className="p-3 bg-muted/30 rounded-lg">
            <p className="text-xs text-muted-foreground">Closed Positions</p>
            <p className="text-lg font-semibold text-red-500 flex items-center gap-1">
              <Minus className="h-4 w-4" />
              {closedPositions.length}
            </p>
          </div>
        </div>

        {/* New Positions */}
        {newPositions.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-2 text-emerald-500 flex items-center gap-2">
              <Plus className="h-4 w-4" /> New Positions
            </h4>
            <div className="flex flex-wrap gap-2">
              {newPositions.map((h, i) => (
                <Badge key={i} variant="outline" className="border-emerald-500/50 text-emerald-500">
                  {h.symbol} ({h.newQuantity} shares • {formatCurrency(h.newValue || 0)})
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Closed Positions */}
        {closedPositions.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-2 text-red-500 flex items-center gap-2">
              <Minus className="h-4 w-4" /> Closed Positions
            </h4>
            <div className="flex flex-wrap gap-2">
              {closedPositions.map((h, i) => (
                <Badge key={i} variant="outline" className="border-red-500/50 text-red-500">
                  {h.symbol} ({h.oldQuantity} shares • {formatCurrency(h.oldValue || 0)})
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Changed Positions */}
        {changedPositions.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
              <RefreshCw className="h-4 w-4" /> Changed Positions
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50">
                    <th className="text-left py-2 px-2 text-muted-foreground font-medium">Symbol</th>
                    <th className="text-right py-2 px-2 text-muted-foreground font-medium">Qty Change</th>
                    <th className="text-right py-2 px-2 text-muted-foreground font-medium">Value Change</th>
                  </tr>
                </thead>
                <tbody>
                  {changedPositions.slice(0, 10).map((h, i) => (
                    <tr key={i} className="border-b border-border/30">
                      <td className="py-2 px-2 font-medium">{h.symbol}</td>
                      <td className={`py-2 px-2 text-right ${(h.quantityChange || 0) > 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                        {(h.quantityChange || 0) > 0 ? '+' : ''}{h.quantityChange?.toLocaleString()}
                      </td>
                      <td className={`py-2 px-2 text-right ${(h.valueChange || 0) > 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                        {(h.valueChange || 0) > 0 ? '+' : ''}{formatCurrency(h.valueChange || 0)}
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
