export interface Account {
  id: string;
  name: string;
  type: 'bank' | 'mobile_wallet' | 'credit_card' | 'investment' | 'loan' | 'savings';
  institution: string;
  balance: number;
  currency: string;
  lastUpdated: string;
  icon: string;
}

export interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  category: string;
  subcategory: string;
  accountId: string;
  type: 'income' | 'expense' | 'transfer';
  reviewed: boolean;
  merchant?: string;
}

export interface Budget {
  id: string;
  category: string;
  allocated: number;
  spent: number;
  period: 'monthly';
  color: string;
}

export interface Goal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline: string;
  icon: string;
  linkedAccountId?: string;
}

export interface CashFlowItem {
  date: string;
  income: number;
  expenses: number;
  balance: number;
}

export interface Alert {
  id: string;
  type: 'warning' | 'info' | 'success';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
}

// Mock Data
export const accounts: Account[] = [
  { id: '1', name: 'Primary Checking', type: 'bank', institution: 'BRAC Bank', balance: 245780.50, currency: 'BDT', lastUpdated: '2024-01-15T10:30:00', icon: '🏦' },
  { id: '2', name: 'Savings Account', type: 'savings', institution: 'Dutch Bangla Bank', balance: 1850000, currency: 'BDT', lastUpdated: '2024-01-15T10:30:00', icon: '💰' },
  { id: '3', name: 'bKash Wallet', type: 'mobile_wallet', institution: 'bKash', balance: 15420, currency: 'BDT', lastUpdated: '2024-01-15T09:15:00', icon: '📱' },
  { id: '4', name: 'Credit Card', type: 'credit_card', institution: 'City Bank', balance: -45000, currency: 'BDT', lastUpdated: '2024-01-15T08:00:00', icon: '💳' },
  { id: '5', name: 'Investment Portfolio', type: 'investment', institution: 'DSE', balance: 520000, currency: 'BDT', lastUpdated: '2024-01-14T16:00:00', icon: '📈' },
  { id: '6', name: 'Home Loan', type: 'loan', institution: 'Prime Bank', balance: -3200000, currency: 'BDT', lastUpdated: '2024-01-15T00:00:00', icon: '🏠' },
];

export const transactions: Transaction[] = [
  { id: '1', date: '2024-01-15', description: 'Salary Credit', amount: 150000, category: 'Income', subcategory: 'Salary', accountId: '1', type: 'income', reviewed: true },
  { id: '2', date: '2024-01-14', description: 'Shwapno Supermarket', amount: -4520, category: 'Groceries', subcategory: 'Supermarket', accountId: '1', type: 'expense', reviewed: true, merchant: 'Shwapno' },
  { id: '3', date: '2024-01-14', description: 'Netflix Subscription', amount: -990, category: 'Entertainment', subcategory: 'Streaming', accountId: '4', type: 'expense', reviewed: false, merchant: 'Netflix' },
  { id: '4', date: '2024-01-13', description: 'Uber Ride', amount: -350, category: 'Transport', subcategory: 'Ride Share', accountId: '3', type: 'expense', reviewed: false, merchant: 'Uber' },
  { id: '5', date: '2024-01-13', description: 'Restaurant - Nandos', amount: -2800, category: 'Dining', subcategory: 'Restaurant', accountId: '4', type: 'expense', reviewed: true, merchant: 'Nandos' },
  { id: '6', date: '2024-01-12', description: 'Electricity Bill', amount: -3500, category: 'Utilities', subcategory: 'Electricity', accountId: '1', type: 'expense', reviewed: true },
  { id: '7', date: '2024-01-12', description: 'Freelance Project', amount: 25000, category: 'Income', subcategory: 'Freelance', accountId: '1', type: 'income', reviewed: true },
  { id: '8', date: '2024-01-11', description: 'Gas Station', amount: -2200, category: 'Transport', subcategory: 'Fuel', accountId: '1', type: 'expense', reviewed: false },
];

export const budgets: Budget[] = [
  { id: '1', category: 'Groceries', allocated: 15000, spent: 12450, period: 'monthly', color: 'hsl(var(--chart-2))' },
  { id: '2', category: 'Transport', allocated: 8000, spent: 5800, period: 'monthly', color: 'hsl(var(--chart-3))' },
  { id: '3', category: 'Dining', allocated: 10000, spent: 9200, period: 'monthly', color: 'hsl(var(--chart-4))' },
  { id: '4', category: 'Entertainment', allocated: 5000, spent: 3990, period: 'monthly', color: 'hsl(var(--chart-1))' },
  { id: '5', category: 'Utilities', allocated: 12000, spent: 8500, period: 'monthly', color: 'hsl(var(--chart-5))' },
];

export const goals: Goal[] = [
  { id: '1', name: 'Emergency Fund', targetAmount: 500000, currentAmount: 325000, deadline: '2024-06-30', icon: '🛡️' },
  { id: '2', name: 'Vacation to Maldives', targetAmount: 200000, currentAmount: 85000, deadline: '2024-12-15', icon: '🏝️' },
  { id: '3', name: 'New Car Down Payment', targetAmount: 800000, currentAmount: 420000, deadline: '2025-03-01', icon: '🚗' },
  { id: '4', name: "Child's Education Fund", targetAmount: 2000000, currentAmount: 650000, deadline: '2028-09-01', icon: '🎓' },
];

export const cashFlowData: CashFlowItem[] = [
  { date: 'Jan 1', income: 150000, expenses: 45000, balance: 245780 },
  { date: 'Jan 5', income: 0, expenses: 12000, balance: 233780 },
  { date: 'Jan 10', income: 25000, expenses: 18000, balance: 240780 },
  { date: 'Jan 15', income: 150000, expenses: 35000, balance: 355780 },
  { date: 'Jan 20', income: 0, expenses: 22000, balance: 333780 },
  { date: 'Jan 25', income: 15000, expenses: 28000, balance: 320780 },
  { date: 'Jan 30', income: 0, expenses: 55000, balance: 265780 },
];

export const alerts: Alert[] = [
  { id: '1', type: 'warning', title: 'Budget Alert', message: 'Dining budget is at 92% with 16 days remaining', timestamp: '2024-01-15T10:30:00', read: false },
  { id: '2', type: 'info', title: 'Bill Reminder', message: 'Internet bill of ৳2,500 due in 3 days', timestamp: '2024-01-15T09:00:00', read: false },
  { id: '3', type: 'success', title: 'Goal Progress', message: 'Emergency Fund is now 65% complete!', timestamp: '2024-01-14T16:00:00', read: true },
  { id: '4', type: 'info', title: 'Large Transaction', message: 'Unusual expense of ৳25,000 detected', timestamp: '2024-01-13T14:30:00', read: true },
];

export const netWorthHistory = [
  { month: 'Aug', assets: 2400000, liabilities: 3400000 },
  { month: 'Sep', assets: 2550000, liabilities: 3350000 },
  { month: 'Oct', assets: 2700000, liabilities: 3300000 },
  { month: 'Nov', assets: 2850000, liabilities: 3250000 },
  { month: 'Dec', assets: 2950000, liabilities: 3200000 },
  { month: 'Jan', assets: 3086200, liabilities: 3245000 },
];

export const spendingByCategory = [
  { name: 'Groceries', value: 12450, color: 'hsl(var(--chart-2))' },
  { name: 'Transport', value: 5800, color: 'hsl(var(--chart-3))' },
  { name: 'Dining', value: 9200, color: 'hsl(var(--chart-4))' },
  { name: 'Entertainment', value: 3990, color: 'hsl(var(--chart-1))' },
  { name: 'Utilities', value: 8500, color: 'hsl(var(--chart-5))' },
];
