import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface PriceDisplayProps {
  price: number;
  previousPrice?: number;
  label?: string;
  size?: "sm" | "md" | "lg";
  showChange?: boolean;
}

export const PriceDisplay = ({ 
  price, 
  previousPrice, 
  label,
  size = "md",
  showChange = true 
}: PriceDisplayProps) => {
  const change = previousPrice ? price - previousPrice : 0;
  const changePercent = previousPrice ? ((price - previousPrice) / previousPrice) * 100 : 0;
  const isUp = change > 0;
  const isDown = change < 0;
  const isNeutral = change === 0;

  const sizeClasses = {
    sm: "text-xl",
    md: "text-3xl",
    lg: "text-4xl"
  };

  const iconSizes = {
    sm: "h-4 w-4",
    md: "h-5 w-5",
    lg: "h-6 w-6"
  };

  return (
    <div className="flex flex-col gap-1">
      {label && (
        <span className="text-xs text-muted-foreground uppercase tracking-wider">
          {label}
        </span>
      )}
      <div className="flex items-center gap-3">
        <span className={cn(
          "font-mono font-bold tracking-tight",
          sizeClasses[size],
          isUp && "text-success",
          isDown && "text-destructive",
          isNeutral && "text-foreground"
        )}>
          ৳{price.toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
        
        {showChange && (
          <div className={cn(
            "flex items-center gap-1 px-2 py-1 rounded-full text-sm font-medium",
            isUp && "bg-success/10 text-success",
            isDown && "bg-destructive/10 text-destructive",
            isNeutral && "bg-muted text-muted-foreground"
          )}>
            {isUp && <TrendingUp className={cn(iconSizes[size], "animate-bounce")} />}
            {isDown && <TrendingDown className={cn(iconSizes[size], "animate-bounce")} />}
            {isNeutral && <Minus className={iconSizes[size]} />}
            <span>
              {isUp && "+"}
              {changePercent.toFixed(2)}%
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
