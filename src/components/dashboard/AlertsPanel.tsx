import { motion } from 'framer-motion';
import { ArrowUpRight, AlertTriangle, Info, CheckCircle, X, AlertCircle } from 'lucide-react';
import { useAlerts, useMarkAlertAsRead, useDeleteAlert } from '@/hooks/useAlerts';
import { getTimeAgo } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

const alertIcons = {
  warning: AlertTriangle,
  info: Info,
  success: CheckCircle,
  error: AlertCircle,
};

const alertColors = {
  warning: 'text-warning bg-warning/10 border-warning/20',
  info: 'text-chart-3 bg-chart-3/10 border-chart-3/20',
  success: 'text-success bg-success/10 border-success/20',
  error: 'text-destructive bg-destructive/10 border-destructive/20',
};

export const AlertsPanel = () => {
  const { data: alerts, isLoading } = useAlerts();
  const markAsRead = useMarkAlertAsRead();
  const deleteAlert = useDeleteAlert();

  if (isLoading) {
    return (
      <div className="glass-card p-6">
        <Skeleton className="h-6 w-40 mb-6" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full" />)}
        </div>
      </div>
    );
  }

  const unreadCount = alerts?.filter(a => !a.is_read).length || 0;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
      className="glass-card p-6"
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <h3 className="font-display text-lg font-semibold">Alerts & Insights</h3>
          {unreadCount > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-semibold">
              {unreadCount} new
            </span>
          )}
        </div>
        <button className="flex items-center gap-1 text-primary text-sm font-medium hover:underline">
          View All <ArrowUpRight className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-3">
        {alerts?.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-4">No alerts at this time. You're all caught up!</p>
        ) : (
          alerts?.slice(0, 4).map((alert, index) => {
            const Icon = alertIcons[alert.type];
            
            return (
              <motion.div
                key={alert.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.55 + index * 0.05 }}
                onClick={() => !alert.is_read && markAsRead.mutate(alert.id)}
                className={cn(
                  "p-4 rounded-xl border transition-all cursor-pointer group",
                  alertColors[alert.type],
                  alert.is_read && 'opacity-60'
                )}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium text-sm">{alert.title}</p>
                      <button 
                        onClick={(e) => { e.stopPropagation(); deleteAlert.mutate(alert.id); }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-lg hover:bg-background/20"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <p className="text-sm text-foreground/80 mt-1">{alert.message}</p>
                    <p className="text-xs text-foreground/60 mt-2">{getTimeAgo(alert.created_at)}</p>
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </motion.div>
  );
};
