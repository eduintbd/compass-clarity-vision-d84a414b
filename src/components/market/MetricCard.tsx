import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  trend?: "up" | "down" | "neutral";
  className?: string;
  isLoading?: boolean;
}

export const MetricCard = ({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  className,
  isLoading = false
}: MetricCardProps) => {
  if (isLoading) {
    return (
      <div className={cn(
        "bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4 animate-pulse",
        className
      )}>
        <div className="h-4 w-20 bg-white/10 rounded mb-2" />
        <div className="h-8 w-24 bg-white/10 rounded mb-1" />
        <div className="h-3 w-16 bg-white/10 rounded" />
      </div>
    );
  }

  return (
    <div className={cn(
      "bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4 transition-all duration-300 hover:bg-white/10 hover:border-white/20 hover:scale-[1.02]",
      className
    )}>
      <div className="flex items-start justify-between">
        <span className="text-xs text-white/60 uppercase tracking-wider font-medium">
          {title}
        </span>
        {Icon && (
          <Icon className={cn(
            "h-4 w-4",
            trend === "up" && "text-success",
            trend === "down" && "text-destructive",
            !trend && "text-primary"
          )} />
        )}
      </div>
      <div className={cn(
        "text-2xl font-bold mt-1 font-mono",
        trend === "up" && "text-success",
        trend === "down" && "text-destructive",
        !trend && "text-white"
      )}>
        {value}
      </div>
      {subtitle && (
        <span className="text-xs text-white/50 mt-1 block">
          {subtitle}
        </span>
      )}
    </div>
  );
};
