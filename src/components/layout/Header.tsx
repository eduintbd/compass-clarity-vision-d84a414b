import { motion } from 'framer-motion';
import { Bell, Search, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAlerts } from '@/hooks/useAlerts';

interface HeaderProps {
  title?: string;
  subtitle?: string;
  onAddTransaction?: () => void;
}

export const Header = ({ title, subtitle, onAddTransaction }: HeaderProps) => {
  const { data: alerts } = useAlerts();
  const unreadCount = alerts?.filter(a => !a.is_read).length || 0;

  return (
    <motion.header 
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex items-center justify-between mb-8"
    >
      <div>
        {title && <h1 className="text-3xl font-display font-bold text-foreground">{title}</h1>}
        {subtitle && (
          <p className="text-muted-foreground mt-1">{subtitle}</p>
        )}
      </div>

      <div className="flex items-center gap-3">
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search transactions..."
            className="w-64 h-10 pl-10 pr-4 rounded-xl bg-secondary/50 border border-border/50 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-colors"
          />
        </div>

        <Button variant="glass" size="icon" className="relative">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-destructive text-destructive-foreground text-[10px] flex items-center justify-center font-semibold">
              {unreadCount}
            </span>
          )}
        </Button>

        <Button variant="premium" className="gap-2" onClick={onAddTransaction}>
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Add Transaction</span>
        </Button>
      </div>
    </motion.header>
  );
};
