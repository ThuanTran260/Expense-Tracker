import { useState, Fragment } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Trash2, X, AlertTriangle, Check, ChevronDown } from 'lucide-react';
import { Listbox, Transition } from '@headlessui/react';
import { budgetApi, categoryApi } from '../services/api.service';
import { useAuth } from '../contexts/AuthContext';
import { useExchangeRate } from '../hooks/useExchangeRate';
import { useTranslation } from '../contexts/LanguageContext';

const budgetSchema = z.object({
  categoryId: z.string().min(1, 'Vui lòng chọn danh mục'),
  monthlyLimit: z.number().positive('Hạn mức phải lớn hơn 0'),
  month: z.number().int().min(1).max(12),
  year: z.number().int(),
});
type BudgetForm = z.infer<typeof budgetSchema>;

export default function BudgetPage() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const { formatWithCurrency } = useExchangeRate();
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [newBudgetId, setNewBudgetId] = useState<string | null>(null);
  const currency = (user?.settings?.currency ?? 'VND') as 'USD' | 'VND';
  const alertThreshold = user?.settings?.alertThreshold ?? 0.8;
  const fmt = (n: number) => formatWithCurrency(n, currency);

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

  const { register, handleSubmit, reset, control, formState: { errors, isSubmitting } } =
    useForm<BudgetForm>({
      resolver: zodResolver(budgetSchema),
      defaultValues: { month: selectedMonth, year: selectedYear },
    });

  const closeModal = () => {
    setIsClosing(true);
    setTimeout(() => {
      setShowModal(false);
      setIsClosing(false);
      reset();
    }, 240);
  };

  const createMutation = useMutation({
    mutationFn: budgetApi.create,
    onSuccess: (res: any) => { 
      qc.invalidateQueries({ queryKey: ['budgets'] }); 
      setNewBudgetId(res.budget?.id ?? null);
      closeModal(); 
      setTimeout(() => setNewBudgetId(null), 2500);
    },
    onError: (error: any) => {
      setSubmitError(error.response?.data?.message || 'Có lỗi xảy ra, vui lòng thử lại.');
    }
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
          <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800 }}>{t('budget.title')}</h1>
          <p style={{ margin: '0.25rem 0 0', color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>
            {t('budget.subtitle')}
          </p>
        </div>
        <div className="flex gap-3 items-center">
          {/* Month/Year selector */}
          <select className="form-input" style={{ width: 100 }} value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))} id="budget-month">
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i + 1} value={i + 1}>{t('dashboard.month')} {i + 1}</option>
            ))}
          </select>
          <select className="form-input" style={{ width: 90 }} value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))} id="budget-year">
            {[2024, 2025, 2026, 2027].map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          <button className="btn btn-primary btn-sm" onClick={() => { setSubmitError(null); setShowModal(true); }} id="add-budget-btn">
            <Plus size={16} /> {t('budget.addBudget')}
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
          <p>{t('budget.noBudgets')}</p>
          <button className="btn btn-primary mt-4" onClick={() => setShowModal(true)}>
            <Plus size={16} /> {t('budget.addBudget')}
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {budgets.map((budget: any) => {
            const progressClass = getProgressClass(budget.percent);
            const isOver = budget.percent >= 100;
            const isWarning = budget.percent >= alertThreshold * 100 && !isOver;

            return (
              <div key={budget.id} className={`card ${budget.id === newBudgetId ? 'highlight-new' : ''}`}>
                <div className="card-body">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span style={{ fontSize: '1.5rem' }}>{budget.category?.icon ?? '📌'}</span>
                      <div>
                        <p style={{ margin: 0, fontWeight: 700 }}>{budget.category?.name}</p>
                        <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                          {t('budget.spent')}: {fmt(budget.spent)} / {fmt(budget.monthlyLimit)}
                        </p>
                      </div>
                      {(isOver || isWarning) && (
                        <div style={{
                          display: 'flex', alignItems: 'center', gap: '0.25rem',
                          color: isOver ? 'var(--color-danger)' : 'var(--color-warning)',
                          fontSize: '0.8rem', fontWeight: 600,
                        }}>
                          <AlertTriangle size={14} />
                          {isOver ? t('budget.overLimit') : `${t('budget.nearThreshold')} (${budget.percent}%)`}
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
                        if (confirm(t('budget.confirmDelete'))) deleteMutation.mutate(budget.id);
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
                    <span>{t('budget.remaining')}: {budget.remaining > 0 ? fmt(budget.remaining) : '0'}</span>
                    <span>{t('budget.monthlyLimit')}: {fmt(budget.monthlyLimit)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {showModal && createPortal(
        <div className={`modal-overlay${isClosing ? ' closing' : ''}`} onClick={(e) => e.target === e.currentTarget && closeModal()}>
          <div className={`modal${isClosing ? ' closing' : ''}`}>
            <div className="modal-header">
              <h2>{t('budget.addBudget')}</h2>
              <button className="btn btn-ghost btn-sm" onClick={closeModal}><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit((data) => createMutation.mutate(data))}>
              <div className="modal-body">
                {submitError && (
                  <div style={{ padding: '0.75rem', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--color-danger)', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem', marginBottom: '1rem' }}>
                    {submitError}
                  </div>
                )}
                <div className="form-group">
                  <label className="form-label">{t('budget.selectCategory')}</label>
                  <Controller
                    control={control}
                    name="categoryId"
                    render={({ field: { value, onChange } }) => (
                      <Listbox value={value} onChange={onChange}>
                        <div style={{ position: 'relative' }}>
                          <Listbox.Button className={`form-input flex justify-between items-center${errors.categoryId ? ' error' : ''}`} id="budget-category">
                            <span style={{ color: value ? 'inherit' : 'var(--color-text-muted)' }}>
                              {value 
                                ? categories.find((c: any) => c.id === value)?.icon + ' ' + categories.find((c: any) => c.id === value)?.name
                                : t('tx.selectCategory')}
                            </span>
                            <ChevronDown size={16} style={{ color: 'var(--color-text-muted)' }} />
                          </Listbox.Button>
                          <Transition as={Fragment} leave="transition ease-in duration-100" leaveFrom="opacity-100" leaveTo="opacity-0" enter="listbox-enter">
                            <Listbox.Options className="listbox-options">
                              {categories.map((c: any) => (
                                <Listbox.Option key={c.id} value={c.id} className={({ active, selected }) => `listbox-option ${active ? 'active' : ''} ${selected ? 'selected' : ''}`}>
                                  {({ selected }) => (
                                    <>
                                      <span style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <span>{c.icon}</span> <span>{c.name}</span>
                                      </span>
                                      {selected && <Check size={16} />}
                                    </>
                                  )}
                                </Listbox.Option>
                              ))}
                            </Listbox.Options>
                          </Transition>
                        </div>
                      </Listbox>
                    )}
                  />
                  {errors.categoryId && <span className="form-error">{errors.categoryId.message}</span>}
                </div>

                <div className="form-group">
                  <label className="form-label">{t('budget.monthlyLimit')} ({currency})</label>
                  <Controller
                    name="monthlyLimit"
                    control={control}
                    render={({ field: { value, onChange } }) => (
                      <input
                        type="text"
                        inputMode="numeric"
                        className={`form-input${errors.monthlyLimit ? ' error' : ''}`}
                        placeholder="0"
                        id="budget-limit"
                        value={value ? Number(value).toLocaleString('en-US') : ''}
                        onChange={(e) => {
                          const raw = e.target.value.replace(/\D/g, '');
                          onChange(raw ? Number(raw) : 0);
                        }}
                      />
                    )}
                  />
                  {errors.monthlyLimit && <span className="form-error">{errors.monthlyLimit.message}</span>}
                </div>

                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">{t('dashboard.month')}</label>
                    <select {...register('month', { valueAsNumber: true })} className="form-input">
                      {Array.from({ length: 12 }, (_, i) => <option key={i + 1} value={i + 1}>{t('dashboard.month')} {i + 1}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">{t('budget.monthYear')}</label>
                    <select {...register('year', { valueAsNumber: true })} className="form-input">
                      {[2024, 2025, 2026, 2027].map((y) => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={closeModal}>{t('tx.cancel')}</button>
                <button type="submit" className="btn btn-primary" disabled={isSubmitting} id="budget-submit">
                  {isSubmitting ? (
                    <>
                      <span className="spinner" style={{ width: 14, height: 14, borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)', borderTopColor: 'white' }} />
                      {t('tx.saving')}
                    </>
                  ) : t('budget.addBudget')}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
