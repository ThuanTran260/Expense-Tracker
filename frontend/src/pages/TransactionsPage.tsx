import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Edit2, Trash2, X, Download, Search } from 'lucide-react';
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
  const [editTx, setEditTx] = useState<any>(null);
  const [filters, setFilters] = useState({ type: '', categoryId: '', search: '', page: 1 });
  const currency = user?.settings?.currency ?? 'VND';
  const fmt = (n: number) => formatCurrency(n, currency);

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

  const { register, handleSubmit, reset, setValue, formState: { errors, isSubmitting } } =
    useForm<TxForm>({ resolver: zodResolver(txSchema), defaultValues: { type: 'EXPENSE', date: new Date().toISOString().split('T')[0] } });

  const createMutation = useMutation({
    mutationFn: (data: TxForm) => transactionApi.create({ ...data, date: new Date(data.date).toISOString() }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['transactions'] }); qc.invalidateQueries({ queryKey: ['stats'] }); closeModal(); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<TxForm> }) =>
      transactionApi.update(id, { ...data, ...(data.date && { date: new Date(data.date).toISOString() }) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['transactions'] }); qc.invalidateQueries({ queryKey: ['stats'] }); closeModal(); },
  });

  const deleteMutation = useMutation({
    mutationFn: transactionApi.delete,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['transactions'] }); qc.invalidateQueries({ queryKey: ['stats'] }); },
  });

  const openCreate = () => { setEditTx(null); reset({ type: 'EXPENSE', date: new Date().toISOString().split('T')[0] }); setShowModal(true); };

  const openEdit = (tx: any) => {
    setEditTx(tx);
    reset({
      amount: tx.amount, type: tx.type, categoryId: tx.categoryId,
      note: tx.note ?? '', date: tx.date.split('T')[0],
    });
    setShowModal(true);
  };

  const closeModal = () => { setShowModal(false); setEditTx(null); reset(); };

  const onSubmit = (data: TxForm) => {
    if (editTx) updateMutation.mutate({ id: editTx.id, data });
    else createMutation.mutate(data);
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
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800 }}>Giao dịch</h1>
          <p style={{ margin: '0.25rem 0 0', color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>
            {meta?.total ?? 0} giao dịch
          </p>
        </div>
        <div className="flex gap-3">
          <button className="btn btn-ghost btn-sm" onClick={handleExport} id="export-csv-btn">
            <Download size={16} /> Xuất CSV
          </button>
          <button className="btn btn-primary btn-sm" onClick={openCreate} id="add-transaction-btn">
            <Plus size={16} /> Thêm giao dịch
          </button>
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
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: '3rem' }}>
                  <div className="spinner" style={{ margin: '0 auto' }} />
                </td></tr>
              ) : transactions.length === 0 ? (
                <tr><td colSpan={6}>
                  <div className="empty-state"><p>Không tìm thấy giao dịch nào</p></div>
                </td></tr>
              ) : (
                transactions.map((tx: any) => (
                  <tr key={tx.id}>
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
      {showModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && closeModal()}>
          <div className="modal">
            <div className="modal-header">
              <h2>{editTx ? 'Sửa giao dịch' : 'Thêm giao dịch mới'}</h2>
              <button className="btn btn-ghost btn-sm" onClick={closeModal}><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit(onSubmit)}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Loại giao dịch</label>
                  <div className="flex gap-2">
                    {(['EXPENSE', 'INCOME'] as const).map((t) => (
                      <button key={t} type="button"
                        className={`btn ${t === 'EXPENSE' ? 'btn-danger' : 'btn-primary'} ${errors.type ? 'error' : ''}`}
                        style={{ flex: 1, opacity: undefined }}
                        onClick={() => setValue('type', t)}>
                        {t === 'INCOME' ? '💰 Thu' : '💸 Chi'}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Số tiền</label>
                  <input {...register('amount', { valueAsNumber: true })} type="number" min="1"
                    className={`form-input${errors.amount ? ' error' : ''}`} placeholder="0" id="tx-amount" />
                  {errors.amount && <span className="form-error">{errors.amount.message}</span>}
                </div>

                <div className="form-group">
                  <label className="form-label">Danh mục</label>
                  <select {...register('categoryId')} className={`form-input${errors.categoryId ? ' error' : ''}`} id="tx-category">
                    <option value="">— Chọn danh mục —</option>
                    {categories.map((c: any) => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
                  </select>
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
                <button type="submit" className="btn btn-primary" disabled={isSubmitting} id="tx-submit">
                  {isSubmitting ? 'Đang lưu...' : editTx ? 'Cập nhật' : 'Thêm giao dịch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
