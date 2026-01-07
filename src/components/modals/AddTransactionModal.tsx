import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useCreateTransaction } from '@/hooks/useTransactions';
import { useAccounts } from '@/hooks/useAccounts';

const categories = [
  { value: 'Income', subcategories: ['Salary', 'Freelance', 'Investment', 'Bonus', 'Other'] },
  { value: 'Groceries', subcategories: ['Supermarket', 'Market', 'Online'] },
  { value: 'Transport', subcategories: ['Fuel', 'Ride Share', 'Public Transport', 'Maintenance'] },
  { value: 'Dining', subcategories: ['Restaurant', 'Takeaway', 'Coffee'] },
  { value: 'Entertainment', subcategories: ['Streaming', 'Movies', 'Games', 'Sports'] },
  { value: 'Utilities', subcategories: ['Electricity', 'Water', 'Gas', 'Internet', 'Phone'] },
  { value: 'Shopping', subcategories: ['Clothing', 'Electronics', 'Home', 'Personal Care'] },
  { value: 'Healthcare', subcategories: ['Medicine', 'Doctor', 'Hospital', 'Insurance'] },
  { value: 'Education', subcategories: ['Tuition', 'Books', 'Courses'] },
  { value: 'Transfer', subcategories: ['Between Accounts', 'To Others'] },
];

interface AddTransactionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const AddTransactionModal = ({ open, onOpenChange }: AddTransactionModalProps) => {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'income' | 'expense' | 'transfer'>('expense');
  const [category, setCategory] = useState('');
  const [subcategory, setSubcategory] = useState('');
  const [accountId, setAccountId] = useState('');
  const [merchant, setMerchant] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  
  const createTransaction = useCreateTransaction();
  const { data: accounts } = useAccounts();
  
  const selectedCategory = categories.find(c => c.value === category);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const parsedAmount = parseFloat(amount);
    const finalAmount = type === 'expense' ? -Math.abs(parsedAmount) : Math.abs(parsedAmount);
    
    await createTransaction.mutateAsync({
      description,
      amount: finalAmount,
      type,
      category,
      subcategory: subcategory || null,
      account_id: accountId,
      merchant: merchant || null,
      date,
      notes: notes || null,
      tags: null,
      is_reviewed: false,
      is_recurring: false,
    });
    
    // Reset form
    setDescription('');
    setAmount('');
    setType('expense');
    setCategory('');
    setSubcategory('');
    setAccountId('');
    setMerchant('');
    setDate(new Date().toISOString().split('T')[0]);
    setNotes('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-card border-border/50 sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Add Transaction</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {/* Transaction Type */}
          <div className="flex gap-2">
            {(['expense', 'income', 'transfer'] as const).map((t) => (
              <Button
                key={t}
                type="button"
                variant={type === t ? 'premium' : 'ghost'}
                className="flex-1 capitalize"
                onClick={() => {
                  setType(t);
                  if (t === 'income') setCategory('Income');
                  else if (t === 'transfer') setCategory('Transfer');
                  else setCategory('');
                }}
              >
                {t}
              </Button>
            ))}
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Amount</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                className="bg-secondary/50 border-border/50 text-lg font-semibold"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="bg-secondary/50 border-border/50"
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              placeholder="e.g., Grocery shopping"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              className="bg-secondary/50 border-border/50"
            />
          </div>
          
          <div className="space-y-2">
            <Label>Account</Label>
            <Select value={accountId} onValueChange={setAccountId} required>
              <SelectTrigger className="bg-secondary/50 border-border/50">
                <SelectValue placeholder="Select account" />
              </SelectTrigger>
              <SelectContent>
                {accounts?.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    <span className="flex items-center gap-2">
                      <span>{account.icon}</span>
                      <span>{account.name}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={category} onValueChange={(val) => { setCategory(val); setSubcategory(''); }}>
                <SelectTrigger className="bg-secondary/50 border-border/50">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.filter(c => {
                    if (type === 'income') return c.value === 'Income';
                    if (type === 'transfer') return c.value === 'Transfer';
                    return c.value !== 'Income';
                  }).map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.value}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Subcategory</Label>
              <Select value={subcategory} onValueChange={setSubcategory} disabled={!selectedCategory}>
                <SelectTrigger className="bg-secondary/50 border-border/50">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {selectedCategory?.subcategories.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="merchant">Merchant (Optional)</Label>
            <Input
              id="merchant"
              placeholder="e.g., Shwapno"
              value={merchant}
              onChange={(e) => setMerchant(e.target.value)}
              className="bg-secondary/50 border-border/50"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="Additional details..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="bg-secondary/50 border-border/50 resize-none"
              rows={2}
            />
          </div>
          
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="premium" disabled={createTransaction.isPending || !accountId}>
              {createTransaction.isPending ? 'Adding...' : 'Add Transaction'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
