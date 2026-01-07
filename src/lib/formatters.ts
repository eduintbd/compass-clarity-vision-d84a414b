export const formatCurrency = (amount: number, currency: string = 'BDT', decimals: boolean = false): string => {
  const absAmount = Math.abs(amount);
  const roundedAmount = decimals ? absAmount : Math.round(absAmount);
  
  if (currency === 'BDT') {
    // Format with Bengali Taka symbol
    const formatted = new Intl.NumberFormat('en-BD', {
      minimumFractionDigits: 0,
      maximumFractionDigits: decimals ? 2 : 0,
    }).format(roundedAmount);
    
    return `${amount < 0 ? '-' : ''}৳${formatted}`;
  }
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals ? 2 : 0,
  }).format(decimals ? amount : Math.round(amount));
};

export const formatCompactCurrency = (amount: number, currency: string = 'BDT'): string => {
  const absAmount = Math.abs(amount);
  
  if (absAmount >= 10000000) {
    return `${amount < 0 ? '-' : ''}৳${(absAmount / 10000000).toFixed(1)}Cr`;
  } else if (absAmount >= 100000) {
    return `${amount < 0 ? '-' : ''}৳${(absAmount / 100000).toFixed(1)}L`;
  } else if (absAmount >= 1000) {
    return `${amount < 0 ? '-' : ''}৳${(absAmount / 1000).toFixed(0)}K`;
  }
  
  return formatCurrency(amount, currency);
};

export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  }).format(date);
};

export const formatDateTime = (dateString: string): string => {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date);
};

export const formatPercentage = (value: number): string => {
  return `${Math.round(value)}%`;
};

export const getTimeAgo = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 60) {
    return `${diffMins}m ago`;
  } else if (diffHours < 24) {
    return `${diffHours}h ago`;
  } else {
    return `${diffDays}d ago`;
  }
};
