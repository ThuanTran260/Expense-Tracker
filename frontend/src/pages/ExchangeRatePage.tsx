import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Coins,
  RefreshCw,
  ArrowLeftRight,
  TrendingUp,
  TrendingDown,
  Wallet,
  Globe2,
  Sparkles,
  Zap,
} from 'lucide-react';
import { useExchangeRate } from '../hooks/useExchangeRate';
import { statsApi } from '../services/api.service';
import { useTranslation } from '../contexts/LanguageContext';

const now = new Date();
const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
const to = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();

export default function ExchangeRatePage() {
  const { usdToVnd, rates, lastUpdated, isLoading, refetch } = useExchangeRate();
  const { t } = useTranslation();

  // Converter State
  const [calcAmount, setCalcAmount] = useState<string>('100');
  const [calcFrom, setCalcFrom] = useState<'USD' | 'VND'>('USD');

  // Stats Query for Financial Impact
  const { data: summary } = useQuery({
    queryKey: ['stats', 'summary', from, to],
    queryFn: () => statsApi.getSummary({ from, to }),
  });

  const numAmount = parseFloat(calcAmount.replace(/,/g, '')) || 0;
  const convertedResult = calcFrom === 'USD' ? numAmount * usdToVnd : numAmount / usdToVnd;

  const handleSwap = () => {
    setCalcFrom(prev => (prev === 'USD' ? 'VND' : 'USD'));
    setCalcAmount(convertedResult.toFixed(calcFrom === 'USD' ? 0 : 2));
  };

  const majorCurrencies = [
    { code: 'USD', name: 'Đô la Mỹ', flag: '🇺🇸', rate: rates.USD ? usdToVnd : 25450 },
    { code: 'EUR', name: 'Euro', flag: '🇪🇺', rate: rates.EUR ? (1 / rates.EUR) * usdToVnd : 27500 },
    { code: 'JPY', name: 'Yên Nhật', flag: '🇯🇵', rate: rates.JPY ? (1 / rates.JPY) * usdToVnd : 168 },
    { code: 'GBP', name: 'Bảng Anh', flag: '🇬🇧', rate: rates.GBP ? (1 / rates.GBP) * usdToVnd : 32200 },
    { code: 'AUD', name: 'Đô la Úc', flag: '🇦🇺', rate: rates.AUD ? (1 / rates.AUD) * usdToVnd : 16600 },
    { code: 'SGD', name: 'Đô la Singapore', flag: '🇸🇬', rate: rates.SGD ? (1 / rates.SGD) * usdToVnd : 18900 },
  ];

  const totalIncome = summary?.totalIncome ?? 0;
  const totalExpense = summary?.totalExpense ?? 0;
  const balance = summary?.balance ?? 0;

  const fmtVND = (n: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n);
  const fmtUSD = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n / usdToVnd);

  return (
    <div className="dashboard-enter">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Coins color="#6366f1" size={26} /> {t('exchange.title')}
          </h1>
          <p style={{ margin: '0.25rem 0 0', color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>
            {t('exchange.subtitle')}
          </p>
        </div>
        <motion.button
          whileTap={{ scale: 0.95 }}
          className="btn btn-ghost btn-sm"
          onClick={() => refetch()}
          disabled={isLoading}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
          {t('exchange.refreshRate')}
        </motion.button>
      </div>

      {/* Hero Live Rate Banner */}
      <div className="card mb-6" style={{
        background: 'linear-gradient(135deg, rgba(99,102,241,0.15) 0%, rgba(139,92,246,0.08) 100%)',
        border: '1px solid rgba(99,102,241,0.3)',
      }}>
        <div className="card-body" style={{ padding: '1.5rem 2rem' }}>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem' }}>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
                  padding: '0.25rem 0.6rem', borderRadius: 99, background: 'rgba(16,185,129,0.15)',
                  color: '#10b981', fontSize: '0.75rem', fontWeight: 700,
                }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', display: 'inline-block' }} className="animate-pulse" />
                  {t('exchange.liveRate')}
                </span>
                <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                  {t('exchange.lastUpdated')} {lastUpdated}
                </span>
              </div>
              <h2 style={{ margin: 0, fontSize: '2.2rem', fontWeight: 900, letterSpacing: '-0.02em', color: 'var(--color-text-primary)' }}>
                1 USD = <span style={{ color: 'var(--color-primary)' }}>{usdToVnd.toLocaleString('vi-VN')}</span> VND
              </h2>
              <p style={{ margin: '0.35rem 0 0', fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
                1 VND = {(1 / usdToVnd).toFixed(6)} USD
              </p>
            </div>

            <div style={{
              display: 'flex', alignItems: 'center', gap: '1rem',
              padding: '1rem 1.25rem', borderRadius: 'var(--radius-md)',
              background: 'rgba(15, 23, 42, 0.4)', border: '1px solid var(--color-border)',
            }}>
              <div style={{ textAlign: 'center' }}>
                <span style={{ fontSize: '1.5rem' }}>🇺🇸</span>
                <p style={{ margin: '0.2rem 0 0', fontSize: '0.8rem', fontWeight: 700 }}>USD</p>
              </div>
              <ArrowLeftRight size={20} style={{ color: 'var(--color-primary)' }} />
              <div style={{ textAlign: 'center' }}>
                <span style={{ fontSize: '1.5rem' }}>🇻🇳</span>
                <p style={{ margin: '0.2rem 0 0', fontSize: '0.8rem', fontWeight: 700 }}>VND</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Calculator & Insights Row */}
      <div className="grid-2 mb-6">
        {/* Converter Calculator */}
        <div className="card">
          <div className="card-body">
            <h3 style={{ margin: '0 0 1.25rem', fontSize: '1.05rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Zap size={18} style={{ color: '#f59e0b' }} /> {t('exchange.calculatorTitle')}
            </h3>

            {/* Input From */}
            <div className="form-group mb-3">
              <label className="form-label" style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
                {t('exchange.amountLabel')} ({calcFrom})
              </label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="number"
                  className="form-input"
                  style={{ fontSize: '1.1rem', fontWeight: 700, flex: 1 }}
                  value={calcAmount}
                  onChange={(e) => setCalcAmount(e.target.value)}
                  placeholder="100"
                />
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={handleSwap}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', border: '1px solid var(--color-border)' }}
                  title={t('exchange.swapDirection')}
                >
                  <ArrowLeftRight size={16} />
                  <span>{calcFrom}</span>
                </button>
              </div>
            </div>

            {/* Converted Output */}
            <div style={{
              padding: '1rem', borderRadius: 'var(--radius-md)',
              background: 'var(--color-bg)', border: '1px dashed var(--color-border)',
              marginBottom: '1rem',
            }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                {t('exchange.equivalentResult')} ({calcFrom === 'USD' ? 'VND' : 'USD'}):
              </span>
              <p style={{ margin: '0.35rem 0 0', fontSize: '1.4rem', fontWeight: 800, color: 'var(--color-success)' }}>
                {calcFrom === 'USD'
                  ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(convertedResult)
                  : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(convertedResult)}
              </p>
            </div>

            {/* Quick Presets */}
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
              {(calcFrom === 'USD' ? [10, 50, 100, 500, 1000] : [500000, 1000000, 5000000, 10000000]).map((val) => (
                <button
                  key={val}
                  className="btn btn-ghost btn-sm"
                  style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem' }}
                  onClick={() => setCalcAmount(val.toString())}
                >
                  {calcFrom === 'USD' ? `$${val}` : `${(val / 1e6).toFixed(1)}M VND`}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Financial Impact Side-by-Side */}
        <div className="card">
          <div className="card-body">
            <h3 style={{ margin: '0 0 1.25rem', fontSize: '1.05rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Sparkles size={18} style={{ color: '#6366f1' }} /> {t('exchange.financialImpactTitle')}
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Income */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '0.85rem 1rem', borderRadius: 'var(--radius-md)', background: 'rgba(16, 185, 129, 0.06)',
                border: '1px solid rgba(16, 185, 129, 0.2)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <TrendingUp size={20} style={{ color: 'var(--color-success)' }} />
                  <div>
                    <p style={{ margin: 0, fontWeight: 700, fontSize: '0.9rem' }}>{t('exchange.totalIncome')}</p>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>VND & USD</p>
                  </div>
                </div>
                <div style={{ textAlign: 'right', marginLeft: 'auto' }}>
                  <p style={{ margin: 0, fontWeight: 800, color: 'var(--color-success)', fontSize: '0.95rem' }}>{fmtVND(totalIncome)}</p>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>≈ {fmtUSD(totalIncome)}</p>
                </div>
              </div>

              {/* Expense */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '0.85rem 1rem', borderRadius: 'var(--radius-md)', background: 'rgba(239, 68, 68, 0.06)',
                border: '1px solid rgba(239, 68, 68, 0.2)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <TrendingDown size={20} style={{ color: 'var(--color-danger)' }} />
                  <div>
                    <p style={{ margin: 0, fontWeight: 700, fontSize: '0.9rem' }}>{t('exchange.totalExpense')}</p>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>VND & USD</p>
                  </div>
                </div>
                <div style={{ textAlign: 'right', marginLeft: 'auto' }}>
                  <p style={{ margin: 0, fontWeight: 800, color: 'var(--color-danger)', fontSize: '0.95rem' }}>{fmtVND(totalExpense)}</p>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>≈ {fmtUSD(totalExpense)}</p>
                </div>
              </div>

              {/* Balance */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '0.85rem 1rem', borderRadius: 'var(--radius-md)', background: 'rgba(99, 102, 241, 0.06)',
                border: '1px solid rgba(99, 102, 241, 0.2)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <Wallet size={20} style={{ color: 'var(--color-primary)' }} />
                  <div>
                    <p style={{ margin: 0, fontWeight: 700, fontSize: '0.9rem' }}>{t('exchange.actualBalance')}</p>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>VND & USD</p>
                  </div>
                </div>
                <div style={{ textAlign: 'right', marginLeft: 'auto' }}>
                  <p style={{ margin: 0, fontWeight: 800, color: balance >= 0 ? 'var(--color-success)' : 'var(--color-danger)', fontSize: '0.95rem' }}>
                    {fmtVND(balance)}
                  </p>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>≈ {fmtUSD(balance)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Major Currencies Table */}
      <div className="card">
        <div className="card-body">
          <h3 style={{ margin: '0 0 1rem', fontSize: '1.05rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Globe2 size={18} style={{ color: 'var(--color-primary)' }} /> {t('exchange.majorCurrenciesTitle')}
          </h3>

          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t('exchange.currency')}</th>
                  <th>{t('exchange.isoCode')}</th>
                  <th style={{ textAlign: 'right' }}>{t('exchange.buyRate')}</th>
                  <th style={{ textAlign: 'right' }}>{t('exchange.rateVsUsd')}</th>
                </tr>
              </thead>
              <tbody>
                {majorCurrencies.map((c) => (
                  <tr key={c.code}>
                    <td style={{ fontWeight: 600 }}>
                      <span style={{ marginRight: '0.5rem', fontSize: '1.1rem' }}>{c.flag}</span> {c.name}
                    </td>
                    <td><span className="badge btn-ghost" style={{ fontWeight: 700 }}>{c.code}</span></td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--color-primary)' }}>
                      {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(c.rate)}
                    </td>
                    <td style={{ textAlign: 'right', color: 'var(--color-text-secondary)', fontSize: '0.85rem' }}>
                      {rates[c.code] ? `1 USD = ${rates[c.code]} ${c.code}` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
