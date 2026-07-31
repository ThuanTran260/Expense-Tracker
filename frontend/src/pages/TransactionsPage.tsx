import { useState, Fragment, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Edit2, Trash2, X, Download, Search, Check, ChevronDown, Loader2, CheckCircle2, Sparkles } from 'lucide-react';
import { Listbox, Transition } from '@headlessui/react';
import { motion, AnimatePresence } from 'framer-motion';
import { transactionApi, categoryApi } from '../services/api.service';
import { useAuth } from '../contexts/AuthContext';

const txSchema = z.object({
  amount: z.number().positive('Số tiền phải lớn hơn 0'),
  type: z.enum(['INCOME', 'EXPENSE']),
  categoryId: z.string().min(1, 'Vui lòng chọn danh mục'),
  note: z.string().max(500).optional(),
  date: z.string().min(1, 'Vui lòng chọn ngày'),
});

type TxForm = z.infer<typeof txSchema>;

function formatCurrency(amount: number, currency = 'VND') {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency }).format(amount);
}

export default function TransactionsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [editTx, setEditTx] = useState<any>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'loading' | 'success'>('idle');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [newTxId, setNewTxId] = useState<string | null>(null);
  const [filters, setFilters] = useState({ type: '', categoryId: '', search: '', page: 1 });
  const currency = user?.settings?.currency ?? 'VND';
  const fmt = (n: number) => formatCurrency(n, currency);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const { data, isLoading } = useQuery({
    queryKey: ['transactions', filters],
    queryFn: () => transactionApi.getAll({
      ...filters,
      type: filters.type || undefined,
      categoryId: filters.categoryId || undefined,
      search: filters.search || undefined,
      limit: 15,
    }),
  });

  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: categoryApi.getAll,
  });
  const categories = categoriesData?.data ?? [];

  const { register, handleSubmit, reset, setValue, watch, control, formState: { errors } } =
    useForm<TxForm>({ resolver: zodResolver(txSchema), defaultValues: { type: 'EXPENSE', date: new Date().toISOString().split('T')[0] } });

  const currentType = watch('type');
  const currentCategory = watch('categoryId');

  // Filter categories based on Income / Expense type
  const filteredCategories = categories.filter((c: any) => c.type === currentType);

  // Auto update selected category when type changes if current category is invalid
  useEffect(() => {
    if (filteredCategories.length > 0) {
      const exists = filteredCategories.some((c: any) => c.id === currentCategory);
      if (!exists) {
        setValue('categoryId', filteredCategories[0].id);
      }
    }
  }, [currentType, filteredCategories, currentCategory, setValue]);

  const createMutation = useMutation({
    mutationFn: (data: TxForm) => transactionApi.create({ ...data, date: new Date(data.date).toISOString() }),
    onSuccess: (res: any) => { 
      qc.invalidateQueries({ queryKey: ['transactions'] }); 
      qc.invalidateQueries({ queryKey: ['stats'] }); 
      qc.invalidateQueries({ queryKey: ['budgets'] }); 
      setNewTxId(res.transaction?.id ?? null);
      setSubmitStatus('success');
      triggerToast('✨ Đã thêm giao dịch thành công!');
      setTimeout(() => {
        closeModal(); 
        setSubmitStatus('idle');
      }, 550);
      setTimeout(() => setNewTxId(null), 2500);
    },
    onError: (error: any) => {
      setSubmitStatus('idle');
      setSubmitError(error.response?.data?.message || 'Có lỗi xảy ra, vui lòng thử lại.');
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<TxForm> }) =>
      transactionApi.update(id, { ...data, ...(data.date && { date: new Date(data.date).toISOString() }) }),
    onSuccess: () => { 
      qc.invalidateQueries({ queryKey: ['transactions'] }); 
      qc.invalidateQueries({ queryKey: ['stats'] }); 
      qc.invalidateQueries({ queryKey: ['budgets'] }); 
      setSubmitStatus('success');
      triggerToast('✨ Đã cập nhật giao dịch!');
      setTimeout(() => {
        closeModal(); 
        setSubmitStatus('idle');
      }, 550);
    },
    onError: (error: any) => {
      setSubmitStatus('idle');
      setSubmitError(error.response?.data?.message || 'Có lỗi xảy ra, vui lòng thử lại.');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: transactionApi.delete,
    onSuccess: () => { 
      qc.invalidateQueries({ queryKey: ['transactions'] }); 
      qc.invalidateQueries({ queryKey: ['stats'] }); 
      qc.invalidateQueries({ queryKey: ['budgets'] }); 
      triggerToast('🗑️ Đã xóa giao dịch');
    },
  });

  const openCreate = () => { setSubmitError(null); setSubmitStatus('idle'); setEditTx(null); reset({ type: 'EXPENSE', date: new Date().toISOString().split('T')[0] }); setShowModal(true); };

  const openEdit = (tx: any) => {
    setSubmitError(null);
    setSubmitStatus('idle');
    setEditTx(tx);
    reset({
      amount: tx.amount, type: tx.type, categoryId: tx.categoryId,
      note: tx.note ?? '', date: tx.date.split('T')[0],
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setIsClosing(true);
    setTimeout(() => {
      setShowModal(false);
      setIsClosing(false);
      setEditTx(null);
      setSubmitStatus('idle');
      reset();
    }, 240);
  };

  const onSubmit = (data: TxForm) => {
    setSubmitStatus('loading');
    setSubmitError(null);

    // Safety 8-second network timeout handler
    const timeoutTimer = setTimeout(() => {
      if (submitStatus === 'loading') {
        setSubmitStatus('idle');
        setSubmitError('Có vẻ mạng chậm, thử lại nhé!');
      }
    }, 8000);

    if (editTx) {
      updateMutation.mutate({ id: editTx.id, data }, { onSettled: () => clearTimeout(timeoutTimer) });
    } else {
      createMutation.mutate(data, { onSettled: () => clearTimeout(timeoutTimer) });
    }
  };

  const handleExport = async () => {
    const blob = await transactionApi.exportCSV({
      type: filters.type || undefined,
      categoryId: filters.categoryId || undefined,
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transactions-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const transactions = data?.data ?? [];
  const meta = data?.meta;

  return (
    <div>
      {/* Glass Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="glass-toast"
          >
            <Sparkles size={18} style={{ color: '#6366f1' }} />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800 }}>Giao dịch</h1>
          <p style={{ margin: '0.25rem 0 0', color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>
            {meta?.total ?? 0} giao dịch
          </p>
        </div>
        <div className="flex gap-3">
          <motion.button whileTap={{ scale: 0.96 }} className="btn btn-ghost btn-sm" onClick={handleExport} id="export-csv-btn">
            <Download size={16} /> Xuất CSV
          </motion.button>
          <motion.button whileTap={{ scale: 0.96 }} className="btn btn-primary btn-sm" onClick={openCreate} id="add-transaction-btn">
            <Plus size={16} /> Thêm giao dịch
          </motion.button>
        </div>
      </div>

      {/* Filters */}
      <div className="card mb-4">
        <div className="card-body" style={{ padding: '1rem 1.5rem' }}>
          <div className="flex gap-3 items-center">
            <div style={{ position: 'relative', flex: 1 }}>
              <Search size={16} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
              <input
                className="form-input"
                style={{ paddingLeft: '2.25rem' }}
                placeholder="Tìm kiếm ghi chú..."
                value={filters.search}
                onChange={(e) => setFilters(p => ({ ...p, search: e.target.value, page: 1 }))}
                id="transaction-search"
              />
            </div>
            <select className="form-input" style={{ width: 140 }} value={filters.type}
              onChange={(e) => setFilters(p => ({ ...p, type: e.target.value, page: 1 }))} id="filter-type">
              <option value="">Tất cả</option>
              <option value="INCOME">Thu</option>
              <option value="EXPENSE">Chi</option>
            </select>
            <select className="form-input" style={{ width: 160 }} value={filters.categoryId}
              onChange={(e) => setFilters(p => ({ ...p, categoryId: e.target.value, page: 1 }))} id="filter-category">
              <option value="">Tất cả danh mục</option>
              {categories.map((c: any) => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card">
        <div className="table-container">
          <table className="data-table" id="transactions-table">
            <thead>
              <tr>
                <th>Ngày</th>
                <th>Danh mục</th>
                <th>Loại</th>
                <th>Ghi chú</th>
                <th style={{ textAlign: 'right' }}>Số tiền</th>
                <th style={{ textAlign: 'center' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={6} style={{ padding: '0.85rem 1rem' }}>
                      <div className="skeleton-row" style={{ width: i % 2 === 0 ? '90%' : '75%' }} />
                    </td>
                  </tr>
                ))
              ) : transactions.length === 0 ? (
                <tr><td colSpan={6}>
                  <div className="empty-state"><p>Không tìm thấy giao dịch nào</p></div>
                </td></tr>
              ) : (
                transactions.map((tx: any) => (
                  <tr key={tx.id} className={tx.id === newTxId ? 'highlight-new' : ''}>
                    <td style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
                      {new Date(tx.date).toLocaleDateString('vi-VN')}
                    </td>
                    <td>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {tx.category?.icon} {tx.category?.name}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${tx.type === 'INCOME' ? 'badge-income' : 'badge-expense'}`}>
                        {tx.type === 'INCOME' ? 'Thu' : 'Chi'}
                      </span>
                    </td>
                    <td style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>
                      {tx.note || '—'}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 700,
                      color: tx.type === 'INCOME' ? 'var(--color-success)' : 'var(--color-danger)' }}>
                      {tx.type === 'INCOME' ? '+' : '-'}{fmt(tx.amount)}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div className="flex gap-2 items-center" style={{ justifyContent: 'center' }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => openEdit(tx)}>
                          <Edit2 size={14} />
                        </button>
                        <button className="btn btn-danger btn-sm" onClick={() => {
                          if (confirm('Xóa giao dịch này?')) deleteMutation.mutate(tx.id);
                        }}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {meta && meta.totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', padding: '1rem', borderTop: '1px solid var(--color-border)' }}>
            {Array.from({ length: meta.totalPages }, (_, i) => i + 1).map((p) => (
              <button key={p} className={`btn btn-sm ${p === filters.page ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setFilters(prev => ({ ...prev, page: p }))}>
                {p}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && createPortal(
        <div className={`modal-overlay${isClosing ? ' closing' : ''}`} onClick={(e) => e.target === e.currentTarget && closeModal()}>
          <div className={`modal${isClosing ? ' closing' : ''}`}>
            <div className="modal-header">
              <h2>{editTx ? 'Sửa giao dịch' : 'Thêm giao dịch mới'}</h2>
              <button className="btn btn-ghost btn-sm" onClick={closeModal}><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit(onSubmit)}>
              <div className="modal-body">
                {submitError && (
                  <div style={{ padding: '0.75rem', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--color-danger)', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem' }}>
                    {submitError}
                  </div>
                )}

                {/* Mobbin Segmented Control Pill Slider */}
                <div className="form-group">
                  <label className="form-label">Loại giao dịch</label>
                  <div style={{ position: 'relative', display: 'flex', padding: 4, background: 'var(--color-bg)', borderRadius: 'var(--radius-md)', border: '1.5px solid var(--color-border)' }}>
                    <button
                      type="button"
                      onClick={() => setValue('type', 'EXPENSE')}
                      style={{
                        flex: 1, position: 'relative', zIndex: 2, padding: '0.65rem 1rem',
                        border: 'none', background: 'transparent', cursor: 'pointer',
                        fontWeight: 700, fontSize: '0.9rem',
                        color: currentType === 'EXPENSE' ? '#ffffff' : 'var(--color-text-secondary)',
                        transition: 'color 0.2s ease',
                      }}
                      id="tx-type-expense"
                    >
                      {currentType === 'EXPENSE' && (
                        <motion.div
                          layoutId="typePill"
                          style={{
                            position: 'absolute', inset: 0, borderRadius: 'var(--radius-sm)',
                            backgroundColor: 'var(--color-danger)',
                            boxShadow: '0 4px 14px rgba(239, 68, 68, 0.35)',
                            zIndex: -1,
                          }}
                          transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                        />
                      )}
                      💸 Chi
                    </button>

                    <button
                      type="button"
                      onClick={() => setValue('type', 'INCOME')}
                      style={{
                        flex: 1, position: 'relative', zIndex: 2, padding: '0.65rem 1rem',
                        border: 'none', background: 'transparent', cursor: 'pointer',
                        fontWeight: 700, fontSize: '0.9rem',
                        color: currentType === 'INCOME' ? '#ffffff' : 'var(--color-text-secondary)',
                        transition: 'color 0.2s ease',
                      }}
                      id="tx-type-income"
                    >
                      {currentType === 'INCOME' && (
                        <motion.div
                          layoutId="typePill"
                          style={{
                            position: 'absolute', inset: 0, borderRadius: 'var(--radius-sm)',
                            backgroundColor: 'var(--color-success)',
                            boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)',
                            zIndex: -1,
                          }}
                          transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                        />
                      )}
                      💰 Thu
                    </button>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Số tiền ({currency})</label>
                  <Controller
                    name="amount"
                    control={control}
                    render={({ field: { value, onChange } }) => (
                      <input
                        type="text"
                        inputMode="numeric"
                        className={`form-input${errors.amount ? ' error' : ''}`}
                        placeholder="0"
                        id="tx-amount"
                        value={value ? Number(value).toLocaleString('en-US') : ''}
                        onChange={(e) => {
                          const raw = e.target.value.replace(/\D/g, '');
                          onChange(raw ? Number(raw) : 0);
                        }}
                      />
                    )}
                  />
                  {errors.amount && <span className="form-error">{errors.amount.message}</span>}
                </div>

                <div className="form-group">
                  <label className="form-label">Danh mục ({currentType === 'EXPENSE' ? 'Chi' : 'Thu'})</label>
                  <Controller
                    control={control}
                    name="categoryId"
                    render={({ field: { value, onChange } }) => (
                      <Listbox value={value} onChange={onChange}>
                        <div style={{ position: 'relative' }}>
                          <Listbox.Button className={`form-input flex justify-between items-center${errors.categoryId ? ' error' : ''}`} id="tx-category">
                            <span style={{ color: value ? 'inherit' : 'var(--color-text-muted)' }}>
                              {value 
                                ? categories.find((c: any) => c.id === value)?.icon + ' ' + categories.find((c: any) => c.id === value)?.name
                                : '— Chọn danh mục —'}
                            </span>
                            <ChevronDown size={16} style={{ color: 'var(--color-text-muted)' }} />
                          </Listbox.Button>
                          <Transition as={Fragment} leave="transition ease-in duration-100" leaveFrom="opacity-100" leaveTo="opacity-0" enter="listbox-enter">
                            <Listbox.Options className="listbox-options">
                              {filteredCategories.map((c: any) => (
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
                  <label className="form-label">Ngày</label>
                  <input {...register('date')} type="date" className={`form-input${errors.date ? ' error' : ''}`} id="tx-date" />
                  {errors.date && <span className="form-error">{errors.date.message}</span>}
                </div>

                <div className="form-group">
                  <label className="form-label">Ghi chú (tùy chọn)</label>
                  <input {...register('note')} className="form-input" placeholder="Ghi chú..." id="tx-note" />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={closeModal}>Hủy</button>
                
                {/* 3-State Icon-Swap Framer Motion Button */}
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  type="submit"
                  className="btn btn-primary"
                  disabled={submitStatus !== 'idle'}
                  id="tx-submit"
                  style={{ minWidth: 120 }}
                >
                  <AnimatePresence mode="wait">
                    {submitStatus === 'idle' && (
                      <motion.span
                        key="idle"
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.15 }}
                      >
                        {editTx ? 'Cập nhật' : 'Thêm giao dịch'}
                      </motion.span>
                    )}
                    {submitStatus === 'loading' && (
                      <motion.span
                        key="loading"
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.15 }}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                      >
                        <Loader2 className="animate-spin" size={16} /> Đang lưu...
                      </motion.span>
                    )}
                    {submitStatus === 'success' && (
                      <motion.span
                        key="success"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.18 }}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#ffffff' }}
                      >
                        <CheckCircle2 size={16} /> Đã lưu!
                      </motion.span>
                    )}
                  </AnimatePresence>
                </motion.button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

