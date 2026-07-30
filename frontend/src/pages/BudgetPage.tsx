import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Trash2, X, AlertTriangle } from 'lucide-react';
import { budgetApi, categoryApi } from '../services/api.service';
import { useAuth } from '../contexts/AuthContext';

const budgetSchema = z.object({
  categoryId: z.string().min(1, 'Vui lòng chọn danh mục'),
  monthlyLimit: z.number().positive('Hạn mức phải lớn hơn 0'),
  month: z.number().int().min(1).max(12),
  year: z.number().int(),
});
type BudgetForm = z.infer<typeof budgetSchema>;

function formatCurrency(amount: number, currency = 'VND') {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency }).format(amount);
}

export default function BudgetPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const currency = user?.settings?.currency ?? 'VND';
  const alertThreshold = user?.settings?.alertThreshold ?? 0.8;
  const fmt = (n: number) => formatCurrency(n, currency);

  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());

  const { data, isLoading } = useQuery({
    queryKey: ['budgets', selectedMonth, selectedYear],
    queryFn: () => budgetApi.getAll({ month: selectedMonth, year: selectedYear }),
  });

  const { data: catData } = useQuery({
    queryKey: ['categories'],
    queryFn: categoryApi.getAll,
  });
  const categories = (catData?.data ?? []).filter((c: any) => c.type === 'EXPENSE');

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } =
    useForm<BudgetForm>({
      resolver: zodResolver(budgetSchema),
      defaultValues: { month: selectedMonth, year: selectedYear },
    });

  const createMutation = useMutation({
    mutationFn: budgetApi.create,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['budgets'] }); setShowModal(false); reset(); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => budgetApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['budgets'] }),
  });

  const budgets = data?.data ?? [];

  const getProgressClass = (percent: number) => {
    if (percent >= 100) return 'danger';
    if (percent >= alertThreshold * 100) return 'warning';
    return 'safe';
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800 }}>Ngân sách</h1>
          <p style={{ margin: '0.25rem 0 0', color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>
            Theo dõi hạn mức chi tiêu
          </p>
        </div>
        <div className="flex gap-3 items-center">
          {/* Month/Year selector */}
          <select className="form-input" style={{ width: 100 }} value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))} id="budget-month">
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i + 1} value={i + 1}>Tháng {i + 1}</option>
            ))}
          </select>
          <select className="form-input" style={{ width: 90 }} value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))} id="budget-year">
            {[2024, 2025, 2026, 2027].map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          <button className="btn btn-primary btn-sm" onClick={() => setShowModal(true)} id="add-budget-btn">
            <Plus size={16} /> Thêm ngân sách
          </button>
        </div>
      </div>

      {/* Budget Cards */}
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}>
          <div className="spinner" style={{ margin: '0 auto' }} />
        </div>
      ) : budgets.length === 0 ? (
        <div className="empty-state">
          <p>Chưa có ngân sách nào cho tháng {selectedMonth}/{selectedYear}</p>
          <button className="btn btn-primary mt-4" onClick={() => setShowModal(true)}>
            <Plus size={16} /> Tạo ngân sách đầu tiên
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {budgets.map((budget: any) => {
            const progressClass = getProgressClass(budget.percent);
            const isOver = budget.percent >= 100;
            const isWarning = budget.percent >= alertThreshold * 100 && !isOver;

            return (
              <div key={budget.id} className="card">
                <div className="card-body">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span style={{ fontSize: '1.5rem' }}>{budget.category?.icon ?? '📌'}</span>
                      <div>
                        <p style={{ margin: 0, fontWeight: 700 }}>{budget.category?.name}</p>
                        <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                          Đã chi: {fmt(budget.spent)} / {fmt(budget.monthlyLimit)}
                        </p>
                      </div>
                      {(isOver || isWarning) && (
                        <div style={{
                          display: 'flex', alignItems: 'center', gap: '0.25rem',
                          color: isOver ? 'var(--color-danger)' : 'var(--color-warning)',
                          fontSize: '0.8rem', fontWeight: 600,
                        }}>
                          <AlertTriangle size={14} />
                          {isOver ? 'Vượt hạn mức!' : `Cảnh báo ${budget.percent}%`}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span style={{
                        fontSize: '1.1rem', fontWeight: 800,
                        color: progressClass === 'danger' ? 'var(--color-danger)' :
                          progressClass === 'warning' ? 'var(--color-warning)' : 'var(--color-success)',
                      }}>
                        {budget.percent}%
                      </span>
                      <button className="btn btn-danger btn-sm" onClick={() => {
                        if (confirm('Xóa ngân sách này?')) deleteMutation.mutate(budget.id);
                      }}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  <div className="progress-bar">
                    <div
                      className={`progress-fill ${progressClass}`}
                      style={{ width: `${Math.min(budget.percent, 100)}%` }}
                    />
                  </div>

                  <div className="flex justify-between mt-2" style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                    <span>Còn lại: {budget.remaining > 0 ? fmt(budget.remaining) : '0'}</span>
                    <span>Hạn mức: {fmt(budget.monthlyLimit)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <h2>Thêm ngân sách</h2>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowModal(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit((data) => createMutation.mutate(data))}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Danh mục chi tiêu</label>
                  <select {...register('categoryId')} className={`form-input${errors.categoryId ? ' error' : ''}`} id="budget-category">
                    <option value="">— Chọn danh mục —</option>
                    {categories.map((c: any) => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
                  </select>
                  {errors.categoryId && <span className="form-error">{errors.categoryId.message}</span>}
                </div>

                <div className="form-group">
                  <label className="form-label">Hạn mức tháng ({currency})</label>
                  <input {...register('monthlyLimit', { valueAsNumber: true })} type="number" min="1"
                    className={`form-input${errors.monthlyLimit ? ' error' : ''}`}
                    placeholder="0" id="budget-limit" />
                  {errors.monthlyLimit && <span className="form-error">{errors.monthlyLimit.message}</span>}
                </div>

                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">Tháng</label>
                    <select {...register('month', { valueAsNumber: true })} className="form-input">
                      {Array.from({ length: 12 }, (_, i) => <option key={i + 1} value={i + 1}>Tháng {i + 1}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Năm</label>
                    <select {...register('year', { valueAsNumber: true })} className="form-input">
                      {[2024, 2025, 2026, 2027].map((y) => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Hủy</button>
                <button type="submit" className="btn btn-primary" disabled={isSubmitting} id="budget-submit">
                  {isSubmitting ? 'Đang lưu...' : 'Tạo ngân sách'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
