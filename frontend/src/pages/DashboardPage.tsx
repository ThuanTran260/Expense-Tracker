import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { TrendingUp, TrendingDown, Wallet, AlertTriangle, AlertCircle } from 'lucide-react';
import { statsApi, transactionApi, budgetApi } from '../services/api.service';
import { useAuth } from '../contexts/AuthContext';
import { useExchangeRate } from '../hooks/useExchangeRate';

const CHART_COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#ef4444'];

// Current month/year
const now = new Date();
const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
const to = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();

export default function DashboardPage() {
  const { user } = useAuth();
  const { formatWithCurrency } = useExchangeRate();
  const currency = (user?.settings?.currency ?? 'VND') as 'USD' | 'VND';
  const fmt = (n: number) => formatWithCurrency(n, currency);

  const { data: summary, isLoading: loadingSummary } = useQuery({
    queryKey: ['stats', 'summary', from, to],
    queryFn: () => statsApi.getSummary({ from, to }),
  });

  const { data: byCategory } = useQuery({
    queryKey: ['stats', 'by-category', from, to],
    queryFn: () => statsApi.getByCategory({ from, to, type: 'EXPENSE' }),
  });

  const { data: timeline } = useQuery({
    queryKey: ['stats', 'timeline', from, to],
    queryFn: () => statsApi.getTimeline({ from, to, interval: 'month' }),
  });

  const { data: recentTx } = useQuery({
    queryKey: ['transactions', 'recent'],
    queryFn: () => transactionApi.getAll({ limit: 5, page: 1 }),
  });

  const { data: budgetData } = useQuery({
    queryKey: ['budgets', now.getMonth() + 1, now.getFullYear()],
    queryFn: () => budgetApi.getAll({ month: now.getMonth() + 1, year: now.getFullYear() }),
  });

  const alertThreshold = user?.settings?.alertThreshold ?? 0.8;

  const budgetAlerts = useMemo(() => {
    const all = budgetData?.data ?? [];
    const over = all.filter((b: any) => b.percent >= 100);
    const near = all.filter((b: any) => b.percent >= alertThreshold * 100 && b.percent < 100);
    return [...over, ...near];
  }, [budgetData, alertThreshold]);

  const pieData = useMemo(() =>
    (byCategory?.data ?? []).slice(0, 7).map((item: any) => ({
      name: item.category?.name ?? 'Khác',
      value: item.total,
      percentage: item.percentage,
    })),
    [byCategory]
  );

  return (
    <div className="dashboard-enter">
      {/* Budget Alerts */}
      {budgetAlerts.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.5rem' }}>
          {budgetAlerts.map((b: any) => {
            const isOver = b.percent >= 100;
            return (
              <div
                key={b.id}
                className="budget-alert"
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.75rem',
                  padding: '0.75rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  border: `1px solid ${isOver ? 'rgba(239,68,68,0.3)' : 'rgba(245,158,11,0.3)'}`,
                  backgroundColor: isOver ? 'rgba(239,68,68,0.08)' : 'rgba(245,158,11,0.08)',
                }}
              >
                <span style={{ fontSize: '1.1rem' }}>{b.category?.icon ?? '📌'}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                    {isOver
                      ? <AlertCircle size={14} style={{ color: 'var(--color-danger)', flexShrink: 0 }} />
                      : <AlertTriangle size={14} style={{ color: 'var(--color-warning)', flexShrink: 0 }} />
                    }
                    <span style={{
                      fontSize: '0.85rem', fontWeight: 700,
                      color: isOver ? 'var(--color-danger)' : 'var(--color-warning)',
                    }}>
                      {isOver ? 'Vượt hạn mức!' : 'Gần đạt ngưỡng!'}
                    </span>
                    <span style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
                      {b.category?.name} — {b.percent}%
                    </span>
                  </div>
                  <div style={{ height: 4, backgroundColor: 'var(--color-border)', borderRadius: 99 }}>
                    <div style={{
                      height: '100%',
                      width: `${Math.min(b.percent, 100)}%`,
                      borderRadius: 99,
                      backgroundColor: isOver ? 'var(--color-danger)' : 'var(--color-warning)',
                      transition: 'width 0.6s ease',
                    }} />
                  </div>
                </div>
                <span style={{
                  fontSize: '0.8rem', fontWeight: 700, whiteSpace: 'nowrap',
                  color: isOver ? 'var(--color-danger)' : 'var(--color-warning)',
                }}>
                  {fmt(b.spent)} / {fmt(b.monthlyLimit)}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800 }}>Dashboard</h1>
          <p style={{ margin: '0.25rem 0 0', color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>
            Tháng {now.getMonth() + 1}/{now.getFullYear()}
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid-3 mb-6">
        <div className="stat-card">
          <span className="label">💰 Tổng thu</span>
          <span className="amount income">
            {loadingSummary ? '—' : fmt(summary?.totalIncome ?? 0)}
          </span>
          <div className="flex items-center gap-2" style={{ fontSize: '0.8rem', color: 'var(--color-success)' }}>
            <TrendingUp size={14} /> Thu nhập tháng này
          </div>
        </div>

        <div className="stat-card">
          <span className="label">💸 Tổng chi</span>
          <span className="amount expense">
            {loadingSummary ? '—' : fmt(summary?.totalExpense ?? 0)}
          </span>
          <div className="flex items-center gap-2" style={{ fontSize: '0.8rem', color: 'var(--color-danger)' }}>
            <TrendingDown size={14} /> Chi tiêu tháng này
          </div>
        </div>

        <div className="stat-card">
          <span className="label">🏦 Số dư</span>
          <span className="amount" style={{
            color: (summary?.balance ?? 0) >= 0 ? 'var(--color-success)' : 'var(--color-danger)'
          }}>
            {loadingSummary ? '—' : fmt(summary?.balance ?? 0)}
          </span>
          <div className="flex items-center gap-2" style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
            <Wallet size={14} /> Thu - Chi
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid-2 mb-6">
        {/* Pie Chart */}
        <div className="card">
          <div className="card-body">
            <h3 style={{ margin: '0 0 1rem', fontSize: '1rem', fontWeight: 700 }}>
              Chi tiêu theo danh mục
            </h3>
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={100}
                    dataKey="value" paddingAngle={2}>
                    {pieData.map((_: any, i: number) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: any) => fmt(Number(value ?? 0))} />
                  <Legend formatter={(value) => <span style={{ fontSize: '0.8rem' }}>{value}</span>} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="empty-state" style={{ padding: '3rem 1rem' }}>
                <p style={{ margin: 0 }}>Chưa có dữ liệu chi tiêu tháng này</p>
              </div>
            )}
          </div>
        </div>

        {/* Bar Chart */}
        <div className="card">
          <div className="card-body">
            <h3 style={{ margin: '0 0 1rem', fontSize: '1rem', fontWeight: 700 }}>
              Xu hướng Thu / Chi
            </h3>
            {(timeline?.data?.length ?? 0) > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={timeline?.data ?? []} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="period" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => v >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : `${v}`} />
                  <Tooltip formatter={(value: any) => fmt(Number(value ?? 0))} />
                  <Legend />
                  <Bar dataKey="income" name="Thu" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expense" name="Chi" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="empty-state" style={{ padding: '3rem 1rem' }}>
                <p style={{ margin: 0 }}>Chưa có dữ liệu</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="card">
        <div className="card-body">
          <div className="flex items-center justify-between mb-4">
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>Giao dịch gần đây</h3>
            <a href="/transactions" style={{ color: 'var(--color-primary)', fontSize: '0.875rem', textDecoration: 'none', fontWeight: 600 }}>
              Xem tất cả →
            </a>
          </div>

          {(recentTx?.data?.length ?? 0) === 0 ? (
            <div className="empty-state" style={{ padding: '2rem' }}>
              <p style={{ margin: 0 }}>Chưa có giao dịch nào</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {recentTx?.data?.map((tx: any) => (
                <div key={tx.id} className="transaction-row" style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '0.75rem 0.5rem', borderBottom: '1px solid var(--color-border)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: 10, display: 'flex',
                      alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem',
                      background: tx.type === 'INCOME' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                    }}>
                      {tx.category?.icon ?? '📌'}
                    </div>
                    <div>
                      <p style={{ margin: 0, fontWeight: 600, fontSize: '0.9rem' }}>{tx.category?.name}</p>
                      <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                        {new Date(tx.date).toLocaleDateString('vi-VN')}
                        {tx.note ? ` · ${tx.note}` : ''}
                      </p>
                    </div>
                  </div>
                  <span style={{
                    fontWeight: 700, fontSize: '0.95rem',
                    color: tx.type === 'INCOME' ? 'var(--color-success)' : 'var(--color-danger)',
                  }}>
                    {tx.type === 'INCOME' ? '+' : '-'}{fmt(tx.amount)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
