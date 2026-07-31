import { useQuery } from '@tanstack/react-query';

interface ExchangeRateResponse {
  result: string;
  provider: string;
  time_last_update_utc: string;
  time_next_update_utc: string;
  rates: Record<string, number>;
}

export function useExchangeRate() {
  const { data, isLoading, isError, refetch, dataUpdatedAt } = useQuery<ExchangeRateResponse>({
    queryKey: ['exchange-rates', 'USD'],
    queryFn: async () => {
      const res = await fetch('https://open.er-api.com/v6/latest/USD');
      if (!res.ok) {
        throw new Error('Failed to fetch exchange rates');
      }
      return res.json();
    },
    staleTime: 1000 * 60 * 60, // 1 hour cache
    refetchOnWindowFocus: false,
  });

  const usdToVnd = data?.rates?.VND ?? 25450;
  const rates = data?.rates ?? {};

  const convert = (amount: number, from: 'USD' | 'VND', to: 'USD' | 'VND') => {
    if (from === to) return amount;
    if (from === 'VND' && to === 'USD') {
      return amount / usdToVnd;
    }
    if (from === 'USD' && to === 'VND') {
      return amount * usdToVnd;
    }
    return amount;
  };

  const formatWithCurrency = (amountInVnd: number, currency: 'USD' | 'VND') => {
    if (currency === 'USD') {
      const converted = amountInVnd / usdToVnd;
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(converted);
    }
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amountInVnd);
  };

  const lastUpdatedFormatted = data?.time_last_update_utc
    ? new Date(data.time_last_update_utc).toLocaleString('vi-VN')
    : new Date(dataUpdatedAt || Date.now()).toLocaleString('vi-VN');

  return {
    usdToVnd,
    rates,
    lastUpdated: lastUpdatedFormatted,
    isLoading,
    isError,
    refetch,
    convert,
    formatWithCurrency,
  };
}
