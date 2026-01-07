import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from '@/components/ui/alert-dialog';
import { Trash2, GitMerge, Calendar, Building2, Wallet } from 'lucide-react';
import { usePortfolios, useUniqueAccounts, Portfolio } from '@/hooks/usePortfolios';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export const PortfolioManagement = () => {
  const { data: allPortfolios, isLoading } = usePortfolios();
  const { data: uniqueAccounts } = useUniqueAccounts();
  const queryClient = useQueryClient();
  
  const [selectedSnapshots, setSelectedSnapshots] = useState<string[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [mergeDialogOpen, setMergeDialogOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Group portfolios by account number
  const groupedPortfolios = allPortfolios?.reduce((acc, portfolio) => {
    const key = portfolio.account_number;
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(portfolio);
    return acc;
  }, {} as Record<string, Portfolio[]>);

  // Sort each group by date (newest first), handling null dates
  Object.values(groupedPortfolios || {}).forEach(group => {
    group.sort((a, b) => {
      if (!a.as_of_date && !b.as_of_date) return 0;
      if (!a.as_of_date) return 1;
      if (!b.as_of_date) return -1;
      return new Date(b.as_of_date).getTime() - new Date(a.as_of_date).getTime();
    });
  });

  const toggleSnapshot = (id: string) => {
    setSelectedSnapshots(prev => 
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const handleDelete = async () => {
    if (selectedSnapshots.length === 0) return;
    
    setIsProcessing(true);
    try {
      // First delete holdings for these portfolios
      const { error: holdingsError } = await supabase
        .from('holdings')
        .delete()
        .in('portfolio_id', selectedSnapshots);
      
      if (holdingsError) throw holdingsError;

      // Delete portfolio snapshots
      const { error: snapshotsError } = await supabase
        .from('portfolio_snapshots')
        .delete()
        .in('portfolio_id', selectedSnapshots);
      
      if (snapshotsError) throw snapshotsError;

      // Delete portfolios
      const { error: portfoliosError } = await supabase
        .from('portfolios')
        .delete()
        .in('id', selectedSnapshots);
      
      if (portfoliosError) throw portfoliosError;

      toast.success(`Deleted ${selectedSnapshots.length} snapshot(s)`);
      setSelectedSnapshots([]);
      queryClient.invalidateQueries({ queryKey: ['portfolios'] });
      queryClient.invalidateQueries({ queryKey: ['holdings'] });
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete snapshots');
    } finally {
      setIsProcessing(false);
      setDeleteDialogOpen(false);
    }
  };

  const handleMerge = async () => {
    if (selectedSnapshots.length < 2) {
      toast.error('Select at least 2 snapshots to merge');
      return;
    }

    // Check all selected are from the same account
    const selectedPortfolios = allPortfolios?.filter(p => selectedSnapshots.includes(p.id));
    const accountNumbers = [...new Set(selectedPortfolios?.map(p => p.account_number))];
    
    if (accountNumbers.length > 1) {
      toast.error('Can only merge snapshots from the same account');
      return;
    }

    setIsProcessing(true);
    try {
      // Keep the one with the latest date as the target
      const sortedSelected = selectedPortfolios?.sort((a, b) => {
        if (!a.as_of_date && !b.as_of_date) return 0;
        if (!a.as_of_date) return 1;
        if (!b.as_of_date) return -1;
        return new Date(b.as_of_date).getTime() - new Date(a.as_of_date).getTime();
      });
      
      const targetPortfolio = sortedSelected?.[0];
      const toMerge = sortedSelected?.slice(1) || [];

      if (!targetPortfolio) throw new Error('No target portfolio found');

      // Get all holdings from portfolios to merge
      const { data: holdingsToMerge, error: holdingsError } = await supabase
        .from('holdings')
        .select('*')
        .in('portfolio_id', toMerge.map(p => p.id));

      if (holdingsError) throw holdingsError;

      // Move holdings to target portfolio (updating portfolio_id)
      if (holdingsToMerge && holdingsToMerge.length > 0) {
        for (const holding of holdingsToMerge) {
          const { error: updateError } = await supabase
            .from('holdings')
            .update({ portfolio_id: targetPortfolio.id })
            .eq('id', holding.id);
          
          if (updateError) throw updateError;
        }
      }

      // Recalculate target portfolio totals
      const { data: allHoldings } = await supabase
        .from('holdings')
        .select('*')
        .eq('portfolio_id', targetPortfolio.id);

      const totals = allHoldings?.reduce((acc, h) => ({
        total_market_value: acc.total_market_value + Number(h.market_value),
        total_cost_basis: acc.total_cost_basis + Number(h.cost_basis),
        total_unrealized_gain: acc.total_unrealized_gain + Number(h.unrealized_gain),
        total_realized_gain: acc.total_realized_gain + Number(h.realized_gain),
      }), {
        total_market_value: 0,
        total_cost_basis: 0,
        total_unrealized_gain: 0,
        total_realized_gain: 0,
      });

      // Update target portfolio with new totals
      await supabase
        .from('portfolios')
        .update(totals)
        .eq('id', targetPortfolio.id);

      // Delete merged portfolios
      for (const portfolio of toMerge) {
        await supabase.from('portfolio_snapshots').delete().eq('portfolio_id', portfolio.id);
        await supabase.from('portfolios').delete().eq('id', portfolio.id);
      }

      toast.success(`Merged ${toMerge.length + 1} snapshots into one`);
      setSelectedSnapshots([]);
      queryClient.invalidateQueries({ queryKey: ['portfolios'] });
      queryClient.invalidateQueries({ queryKey: ['holdings'] });
    } catch (error) {
      console.error('Merge error:', error);
      toast.error('Failed to merge snapshots');
    } finally {
      setIsProcessing(false);
      setMergeDialogOpen(false);
    }
  };

  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground">Loading...</div>;
  }

  if (!allPortfolios || allPortfolios.length === 0) {
    return (
      <Card className="bg-card/50 border-border/50">
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">No portfolio snapshots to manage</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Action Bar */}
      {selectedSnapshots.length > 0 && (
        <Card className="bg-primary/10 border-primary/30">
          <CardContent className="py-4 flex items-center justify-between">
            <span className="text-sm font-medium">
              {selectedSnapshots.length} snapshot(s) selected
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedSnapshots([])}
              >
                Clear
              </Button>
              {selectedSnapshots.length >= 2 && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setMergeDialogOpen(true)}
                  disabled={isProcessing}
                >
                  <GitMerge className="h-4 w-4 mr-1" />
                  Merge
                </Button>
              )}
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setDeleteDialogOpen(true)}
                disabled={isProcessing}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Delete
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Grouped Portfolios */}
      {Object.entries(groupedPortfolios || {}).map(([accountNumber, portfolios]) => (
        <Card key={accountNumber} className="bg-card/50 border-border/50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">{portfolios[0].broker_name || 'Unknown Broker'}</CardTitle>
              </div>
              <Badge variant="outline" className="font-mono">
                {accountNumber}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {portfolios[0].account_name} • {portfolios.length} snapshot(s)
            </p>
          </CardHeader>
          <CardContent className="space-y-2">
            {portfolios.map((portfolio, index) => (
              <div
                key={portfolio.id}
                className={`flex items-center gap-4 p-3 rounded-lg border transition-colors ${
                  selectedSnapshots.includes(portfolio.id)
                    ? 'bg-primary/10 border-primary/30'
                    : 'bg-muted/30 border-border/50 hover:bg-muted/50'
                }`}
              >
                <Checkbox
                  checked={selectedSnapshots.includes(portfolio.id)}
                  onCheckedChange={() => toggleSnapshot(portfolio.id)}
                />
                
                <div className="flex items-center gap-2 min-w-[120px]">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    {portfolio.as_of_date ? formatDate(portfolio.as_of_date) : 'No date'}
                  </span>
                </div>

                <div className="flex-1 flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Wallet className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{formatCurrency(portfolio.total_market_value)}</span>
                  </div>
                  <span className={`text-sm ${portfolio.total_unrealized_gain >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                    {portfolio.total_unrealized_gain >= 0 ? '+' : ''}{formatCurrency(portfolio.total_unrealized_gain)}
                  </span>
                </div>

                {index === 0 && portfolios.length > 1 && (
                  <Badge variant="secondary" className="text-xs">Latest</Badge>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      ))}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Snapshots</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedSnapshots.length} snapshot(s)? 
              This will permanently remove all associated holdings data. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete} 
              disabled={isProcessing}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isProcessing ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Merge Confirmation Dialog */}
      <AlertDialog open={mergeDialogOpen} onOpenChange={setMergeDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Merge Snapshots</AlertDialogTitle>
            <AlertDialogDescription>
              This will merge {selectedSnapshots.length} snapshots into the one with the latest date. 
              All holdings will be combined and duplicate portfolios will be removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleMerge} disabled={isProcessing}>
              {isProcessing ? 'Merging...' : 'Merge'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
