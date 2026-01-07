import { useQuery } from "@tanstack/react-query";

const fetchAmarStockData = async (endpoint: string, code: string, count?: number) => {
  const params = new URLSearchParams({
    endpoint,
    code,
  });
  if (count) params.append("count", count.toString());

  // Use fetch directly since supabase.functions.invoke doesn't support GET params well
  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/amarstock-proxy?${params.toString()}`;
  
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
    },
  });

  if (!response.ok) {
    throw new Error("Failed to fetch data");
  }

  return response.json();
};

export const useDividendData = (symbol: string, count = 4) => {
  return useQuery({
    queryKey: ["amarstock", "dividend", symbol, count],
    queryFn: () => fetchAmarStockData("dividend", symbol, count),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });
};

export const useFinancialData = (code: string, count = 4) => {
  return useQuery({
    queryKey: ["amarstock", "financial", code, count],
    queryFn: () => fetchAmarStockData("financial", code, count),
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });
};

export const useMarketDepth = (code: string) => {
  return useQuery({
    queryKey: ["amarstock", "market-depth", code],
    queryFn: () => fetchAmarStockData("market-depth", code),
    staleTime: 30 * 1000, // 30 seconds for real-time data
    retry: 2,
  });
};

export const useShareDistribution = (code: string) => {
  return useQuery({
    queryKey: ["amarstock", "share-distribution", code],
    queryFn: () => fetchAmarStockData("share-distribution", code),
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });
};

export const useNewsData = (code: string) => {
  return useQuery({
    queryKey: ["amarstock", "news", code],
    queryFn: () => fetchAmarStockData("news", code),
    staleTime: 2 * 60 * 1000, // 2 minutes
    retry: 2,
  });
};
