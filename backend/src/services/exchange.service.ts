import { logger } from '../lib/logger';

const ER_API_URL = 'https://open.er-api.com/v6/latest/USD';
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 giờ
const FETCH_TIMEOUT_MS = 5000;

interface ExchangeRatesPayload {
  result: string;
  provider: string;
  time_last_update_utc: string;
  rates: Record<string, number>;
}

// Fallback offline (GEMINI.md: tỷ giá bắt buộc có fallback khi mất mạng)
function fallbackPayload(): ExchangeRatesPayload {
  return {
    result: 'fallback-offline',
    provider: 'local-fallback',
    time_last_update_utc: new Date().toUTCString(),
    rates: {
      USD: 1,
      VND: 25450,
      EUR: 0.92,
      JPY: 157,
      GBP: 0.79,
      AUD: 1.52,
      SGD: 1.35,
    },
  };
}

// In-memory cache — hợp serverless (mỗi instance tự cache, giảm call ra er-api)
let cache: { payload: ExchangeRatesPayload; fetchedAt: number } | null = null;

export const exchangeService = {
  async getLatestUsdRates(): Promise<ExchangeRatesPayload> {
    if (cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) {
      return cache.payload;
    }

    try {
      const res = await fetch(ER_API_URL, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
      if (!res.ok) throw new Error(`er-api HTTP ${res.status}`);

      const json = (await res.json()) as {
        result?: string;
        provider?: string;
        time_last_update_utc?: string;
        rates?: Record<string, number>;
      };
      if (!json?.rates?.VND) throw new Error('er-api payload thiếu rates.VND');

      const payload: ExchangeRatesPayload = {
        result: json.result ?? 'success',
        provider: json.provider ?? 'open.er-api.com',
        time_last_update_utc: json.time_last_update_utc ?? new Date().toUTCString(),
        rates: json.rates,
      };

      cache = { payload, fetchedAt: Date.now() };
      return payload;
    } catch (err) {
      logger.warn('er-api fetch thất bại — dùng tỷ giá fallback offline', {
        error: err instanceof Error ? err.message : String(err),
      });
      return fallbackPayload();
    }
  },
};
