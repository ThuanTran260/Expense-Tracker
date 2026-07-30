import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { TrendingUp, TrendingDown, Wallet } from 'lucide-react';
import { statsApi, transactionApi } from '../services/api.service';
import { useAuth } from '../contexts/AuthContext';

const CHART_COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#ef4444'];

function formatCurrency(amount: number, currency = 'VND') {
  if (currency === 'VND') {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  }
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

// Current month/year
const now = new Date();
const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
const to = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();

export default function DashboardPage() {
  const { user } = useAuth();
  const currency = user?.settings?.currency ?? 'VND';
  const fmt = (n: number) => formatCurrency(n, currency);

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
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {recentTx?.data?.map((tx: any) => (
                <div key={tx.id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '0.75rem 0', borderBottom: '1px solid var(--color-border)',
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
