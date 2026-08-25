import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { Wallet, Loader2, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const loginSchema = z.object({
  email: z.string().email('Email không hợp lệ'),
  password: z.string().min(1, 'Vui lòng nhập mật khẩu'),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [isSuccess, setIsSuccess] = useState(false);

  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } =
    useForm<LoginForm>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (data: LoginForm) => {
    try {
      await login(data.email, data.password);
      setIsSuccess(true);
      setTimeout(() => {
        navigate('/dashboard');
      }, 600);
    } catch (err: any) {
      const message = err.response?.data?.error?.message || 'Đăng nhập thất bại';
      setError('root', { message });
    }
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: 'var(--color-bg)', padding: '1rem',
    }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16,
            background: 'var(--color-primary)',
            color: 'var(--color-primary-contrast)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 1rem',
          }}>
            <Wallet size={28} color="currentColor" />
          </div>
          <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 800, color: 'var(--color-text-primary)' }}>
            Chào mừng trở lại
          </h1>
          <p style={{ margin: '0.5rem 0 0', color: 'var(--color-text-secondary)' }}>
            Đăng nhập để quản lý chi tiêu của bạn
          </p>
        </div>

        {/* Form */}
        <div className="card">
          <div className="card-body">
            <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {isSuccess && (
                <div style={{
                  background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)',
                  borderRadius: 8, padding: '0.75rem 1rem', color: 'var(--color-success)',
                  fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem',
                  fontWeight: 600, animation: 'fadeIn 0.2s ease',
                }}>
                  <CheckCircle2 size={18} /> Đăng nhập thành công! Đang chuyển hướng...
                </div>
              )}

              {errors.root && !isSuccess && (
                <div style={{
                  background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
                  borderRadius: 8, padding: '0.75rem 1rem', color: 'var(--color-danger)',
                  fontSize: '0.875rem',
                }}>
                  {errors.root.message}
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Email</label>
                <input
                  {...register('email')}
                  type="email"
                  className={`form-input${errors.email ? ' error' : ''}`}
                  placeholder="you@example.com"
                  id="login-email"
                />
                {errors.email && <span className="form-error">{errors.email.message}</span>}
              </div>

              <div className="form-group">
                <label className="form-label">Mật khẩu</label>
                <input
                  {...register('password')}
                  type="password"
                  className={`form-input${errors.password ? ' error' : ''}`}
                  placeholder="••••••••"
                  id="login-password"
                />
                {errors.password && <span className="form-error">{errors.password.message}</span>}
              </div>

              <button
                type="submit"
                className={`btn ${isSuccess ? 'btn-success' : 'btn-primary'} btn-lg w-full`}
                disabled={isSubmitting || isSuccess}
                id="login-submit"
                style={{
                  marginTop: '0.5rem',
                  ...(isSuccess && { background: 'var(--color-success)', color: 'white' })
                }}
              >
                {isSuccess ? (
                  <><CheckCircle2 size={18} /> Thành công!</>
                ) : isSubmitting ? (
                  <><Loader2 size={18} className="animate-spin" /> Đang đăng nhập...</>
                ) : (
                  'Đăng nhập'
                )}
              </button>
            </form>

            <p style={{ textAlign: 'center', marginTop: '1.25rem', fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
              Chưa có tài khoản?{' '}
              <Link to="/register" style={{ color: 'var(--color-primary)', fontWeight: 600, textDecoration: 'none' }}>
                Đăng ký ngay
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
