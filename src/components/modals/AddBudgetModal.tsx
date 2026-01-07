import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useCreateBudget } from '@/hooks/useBudgets';

const categories = [
  'Groceries', 'Transport', 'Dining', 'Entertainment', 'Utilities',
  'Shopping', 'Healthcare', 'Education', 'Personal Care', 'Other'
];

const colors = [
  { name: 'Gold', value: 'hsl(var(--chart-1))' },
  { name: 'Green', value: 'hsl(var(--chart-2))' },
  { name: 'Blue', value: 'hsl(var(--chart-3))' },
  { name: 'Purple', value: 'hsl(var(--chart-4))' },
  { name: 'Red', value: 'hsl(var(--chart-5))' },
];

interface AddBudgetModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const AddBudgetModal = ({ open, onOpenChange }: AddBudgetModalProps) => {
  const [category, setCategory] = useState('');
  const [allocated, setAllocated] = useState('');
  const [period, setPeriod] = useState<'weekly' | 'monthly' | 'yearly'>('monthly');
  const [color, setColor] = useState(colors[0].value);
  const [rollover, setRollover] = useState(false);
  
  const createBudget = useCreateBudget();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    await createBudget.mutateAsync({
      category,
      allocated: parseFloat(allocated),
      period,
      color,
      rollover,
      start_date: null,
      end_date: null,
    });
    
    // Reset form
    setCategory('');
    setAllocated('');
    setPeriod('monthly');
    setColor(colors[0].value);
    setRollover(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-card border-border/50 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Create Budget</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label>Category</Label>
            <Select value={category} onValueChange={setCategory} required>
              <SelectTrigger className="bg-secondary/50 border-border/50">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="allocated">Budget Amount (BDT)</Label>
            <Input
              id="allocated"
              type="number"
              step="100"
              placeholder="10000"
              value={allocated}
              onChange={(e) => setAllocated(e.target.value)}
              required
              className="bg-secondary/50 border-border/50"
            />
          </div>
          
          <div className="space-y-2">
            <Label>Period</Label>
            <Select value={period} onValueChange={(val) => setPeriod(val as 'weekly' | 'monthly' | 'yearly')}>
              <SelectTrigger className="bg-secondary/50 border-border/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="yearly">Yearly</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label>Color</Label>
            <div className="flex gap-2">
              {colors.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setColor(c.value)}
                  className={`w-8 h-8 rounded-full transition-all ${color === c.value ? 'ring-2 ring-offset-2 ring-offset-background ring-primary scale-110' : ''}`}
                  style={{ backgroundColor: c.value }}
                  title={c.name}
                />
              ))}
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="rollover">Rollover unused amount</Label>
              <p className="text-xs text-muted-foreground">Carry over remaining budget to next period</p>
            </div>
            <Switch id="rollover" checked={rollover} onCheckedChange={setRollover} />
          </div>
          
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="premium" disabled={createBudget.isPending}>
              {createBudget.isPending ? 'Creating...' : 'Create Budget'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
