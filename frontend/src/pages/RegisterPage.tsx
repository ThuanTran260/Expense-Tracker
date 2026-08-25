import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { Wallet, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const registerSchema = z.object({
  name: z.string().min(2, 'Tên phải có ít nhất 2 ký tự'),
  email: z.string().email('Email không hợp lệ'),
  password: z
    .string()
    .min(8, 'Mật khẩu phải có ít nhất 8 ký tự')
    .regex(/[A-Z]/, 'Phải có ít nhất 1 chữ hoa')
    .regex(/[0-9]/, 'Phải có ít nhất 1 chữ số'),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: 'Mật khẩu xác nhận không khớp',
  path: ['confirmPassword'],
});

type RegisterForm = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const { register: authRegister } = useAuth();
  const navigate = useNavigate();

  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } =
    useForm<RegisterForm>({ resolver: zodResolver(registerSchema) });

  const onSubmit = async (data: RegisterForm) => {
    try {
      await authRegister(data.name, data.email, data.password);
      navigate('/dashboard');
    } catch (err: any) {
      const message = err.response?.data?.error?.message || 'Đăng ký thất bại';
      setError('root', { message });
    }
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: 'var(--color-bg)', padding: '1rem',
    }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
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
          <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 800 }}>Tạo tài khoản</h1>
          <p style={{ margin: '0.5rem 0 0', color: 'var(--color-text-secondary)' }}>
            Bắt đầu quản lý tài chính thông minh
          </p>
        </div>

        <div className="card">
          <div className="card-body">
            <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {errors.root && (
                <div style={{
                  background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
                  borderRadius: 8, padding: '0.75rem 1rem', color: 'var(--color-danger)', fontSize: '0.875rem',
                }}>
                  {errors.root.message}
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Họ và tên</label>
                <input {...register('name')} className={`form-input${errors.name ? ' error' : ''}`}
                  placeholder="Nguyễn Văn A" id="register-name" />
                {errors.name && <span className="form-error">{errors.name.message}</span>}
              </div>

              <div className="form-group">
                <label className="form-label">Email</label>
                <input {...register('email')} type="email" className={`form-input${errors.email ? ' error' : ''}`}
                  placeholder="you@example.com" id="register-email" />
                {errors.email && <span className="form-error">{errors.email.message}</span>}
              </div>

              <div className="form-group">
                <label className="form-label">Mật khẩu</label>
                <input {...register('password')} type="password" className={`form-input${errors.password ? ' error' : ''}`}
                  placeholder="Ít nhất 8 ký tự, 1 chữ hoa, 1 số" id="register-password" />
                {errors.password && <span className="form-error">{errors.password.message}</span>}
              </div>

              <div className="form-group">
                <label className="form-label">Xác nhận mật khẩu</label>
                <input {...register('confirmPassword')} type="password"
                  className={`form-input${errors.confirmPassword ? ' error' : ''}`}
                  placeholder="Nhập lại mật khẩu" id="register-confirm-password" />
                {errors.confirmPassword && <span className="form-error">{errors.confirmPassword.message}</span>}
              </div>

              <button type="submit" className="btn btn-primary btn-lg w-full"
                disabled={isSubmitting} id="register-submit" style={{ marginTop: '0.5rem' }}>
                {isSubmitting ? <><Loader2 size={18} /> Đang tạo tài khoản...</> : 'Đăng ký'}
              </button>
            </form>

            <p style={{ textAlign: 'center', marginTop: '1.25rem', fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
              Đã có tài khoản?{' '}
              <Link to="/login" style={{ color: 'var(--color-primary)', fontWeight: 600, textDecoration: 'none' }}>
                Đăng nhập
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
