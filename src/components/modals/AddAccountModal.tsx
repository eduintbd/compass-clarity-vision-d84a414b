import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCreateAccount } from '@/hooks/useAccounts';

const accountTypes = [
  { value: 'bank', label: 'Bank Account', icon: '🏦' },
  { value: 'savings', label: 'Savings Account', icon: '💰' },
  { value: 'mobile_wallet', label: 'Mobile Wallet', icon: '📱' },
  { value: 'credit_card', label: 'Credit Card', icon: '💳' },
  { value: 'investment', label: 'Investment', icon: '📈' },
  { value: 'loan', label: 'Loan', icon: '🏠' },
  { value: 'real_estate', label: 'Real Estate', icon: '🏢' },
  { value: 'business', label: 'Business', icon: '💼' },
];

const currencies = ['BDT', 'USD', 'EUR', 'GBP', 'INR'];

interface AddAccountModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const AddAccountModal = ({ open, onOpenChange }: AddAccountModalProps) => {
  const [name, setName] = useState('');
  const [type, setType] = useState<string>('bank');
  const [institution, setInstitution] = useState('');
  const [balance, setBalance] = useState('');
  const [currency, setCurrency] = useState('BDT');
  
  const createAccount = useCreateAccount();
  
  const selectedType = accountTypes.find(t => t.value === type);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    await createAccount.mutateAsync({
      name,
      type: type as 'bank' | 'mobile_wallet' | 'credit_card' | 'investment' | 'loan' | 'savings' | 'real_estate' | 'business',
      institution,
      balance: parseFloat(balance) || 0,
      currency,
      icon: selectedType?.icon || '🏦',
      is_active: true,
    });
    
    // Reset form
    setName('');
    setType('bank');
    setInstitution('');
    setBalance('');
    setCurrency('BDT');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-card border-border/50 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Add New Account</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="name">Account Name</Label>
            <Input
              id="name"
              placeholder="e.g., Primary Checking"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="bg-secondary/50 border-border/50"
            />
          </div>
          
          <div className="space-y-2">
            <Label>Account Type</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="bg-secondary/50 border-border/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {accountTypes.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    <span className="flex items-center gap-2">
                      <span>{t.icon}</span>
                      <span>{t.label}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="institution">Institution</Label>
            <Input
              id="institution"
              placeholder="e.g., BRAC Bank"
              value={institution}
              onChange={(e) => setInstitution(e.target.value)}
              required
              className="bg-secondary/50 border-border/50"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="balance">Initial Balance</Label>
              <Input
                id="balance"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={balance}
                onChange={(e) => setBalance(e.target.value)}
                className="bg-secondary/50 border-border/50"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Currency</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger className="bg-secondary/50 border-border/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {currencies.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="premium" disabled={createAccount.isPending}>
              {createAccount.isPending ? 'Adding...' : 'Add Account'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
