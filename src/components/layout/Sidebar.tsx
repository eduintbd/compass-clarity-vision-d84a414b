import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Receipt, 
  PiggyBank, 
  Target, 
  TrendingUp, 
  Wallet, 
  Bell, 
  Settings,
  CreditCard,
  Calendar,
  LogOut,
  Briefcase,
  BarChart3
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { useAlerts } from '@/hooks/useAlerts';

interface NavItem {
  icon: React.ElementType;
  label: string;
  href: string;
  badge?: number;
}

const navItems: NavItem[] = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/' },
  { icon: Wallet, label: 'Accounts', href: '/accounts' },
  { icon: Receipt, label: 'Transactions', href: '/transactions' },
  { icon: PiggyBank, label: 'Budgets', href: '/budgets' },
  { icon: Target, label: 'Goals', href: '/goals' },
  { icon: Calendar, label: 'Cash Flow', href: '/cashflow' },
  { icon: CreditCard, label: 'Bills & EMIs', href: '/bills' },
  { icon: TrendingUp, label: 'Investments', href: '/investments' },
  { icon: Briefcase, label: 'Portal', href: '/portfolio-portal' },
  { icon: BarChart3, label: 'Market Info', href: '/market-info' },
];

interface SidebarProps {
  activeItem?: string;
}

export const Sidebar = ({ activeItem = '/' }: SidebarProps) => {
  const { signOut, user } = useAuth();
  const { data: profile } = useProfile();
  const { data: alerts } = useAlerts();
  const navigate = useNavigate();

  const unreadAlerts = alerts?.filter(a => !a.is_read).length || 0;

  const bottomNavItems: NavItem[] = [
    { icon: Bell, label: 'Alerts', href: '/alerts', badge: unreadAlerts },
    { icon: Settings, label: 'Settings', href: '/settings' },
  ];

  const handleLogout = async () => {
    await signOut();
    navigate('/auth');
  };

  const initials = profile?.full_name
    ? profile.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : user?.email?.slice(0, 2).toUpperCase() || 'U';

  return (
    <motion.aside 
      initial={{ x: -280 }}
      animate={{ x: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="fixed left-0 top-0 h-screen w-64 bg-card/40 backdrop-blur-xl border-r border-border/50 flex flex-col z-50"
    >
      {/* Logo */}
      <div className="p-6 border-b border-border/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-warning flex items-center justify-center">
            <span className="text-xl font-bold text-primary-foreground">W</span>
          </div>
          <div>
            <h1 className="font-display text-lg font-semibold gold-text">WealthFlow</h1>
            <p className="text-xs text-muted-foreground">Personal Finance</p>
          </div>
        </div>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto scrollbar-thin">
        {navItems.map((item, index) => (
          <motion.a
            key={item.href}
            href={item.href}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className={cn(
              'nav-item',
              activeItem === item.href && 'active'
            )}
          >
            <item.icon className="w-5 h-5" />
            <span className="font-medium">{item.label}</span>
          </motion.a>
        ))}
      </nav>

      {/* Bottom Navigation */}
      <div className="p-4 border-t border-border/50 space-y-1">
        {bottomNavItems.map((item) => (
          <a
            key={item.href}
            href={item.href}
            className={cn(
              'nav-item relative',
              activeItem === item.href && 'active'
            )}
          >
            <item.icon className="w-5 h-5" />
            <span className="font-medium">{item.label}</span>
            {item.badge && item.badge > 0 && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-semibold">
                {item.badge}
              </span>
            )}
          </a>
        ))}
        
        <button
          onClick={handleLogout}
          className="nav-item w-full text-destructive hover:bg-destructive/10"
        >
          <LogOut className="w-5 h-5" />
          <span className="font-medium">Sign Out</span>
        </button>
      </div>

      {/* User Profile */}
      <div className="p-4 border-t border-border/50">
        <div className="flex items-center gap-3 p-3 rounded-xl bg-secondary/50">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center">
            <span className="text-sm font-semibold text-primary">{initials}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{profile?.full_name || 'User'}</p>
            <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
          </div>
        </div>
      </div>
    </motion.aside>
  );
};
