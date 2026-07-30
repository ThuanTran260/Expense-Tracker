import { z } from 'zod';

// ─────────────────────────────────────────────
// AUTH VALIDATORS
// ─────────────────────────────────────────────
export const registerSchema = z.object({
  name: z.string().min(2, 'Tên phải có ít nhất 2 ký tự').max(100),
  email: z.string().email('Email không hợp lệ'),
  password: z
    .string()
    .min(8, 'Mật khẩu phải có ít nhất 8 ký tự')
    .regex(/[A-Z]/, 'Mật khẩu phải có ít nhất 1 chữ hoa')
    .regex(/[0-9]/, 'Mật khẩu phải có ít nhất 1 chữ số'),
});

export const loginSchema = z.object({
  email: z.string().email('Email không hợp lệ'),
  password: z.string().min(1, 'Mật khẩu không được trống'),
});

// ─────────────────────────────────────────────
// TRANSACTION VALIDATORS
// ─────────────────────────────────────────────
export const createTransactionSchema = z.object({
  amount: z.number().positive('Số tiền phải lớn hơn 0'),
  type: z.enum(['INCOME', 'EXPENSE']),
  categoryId: z.string().min(1, 'Danh mục không được trống'),
  note: z.string().max(500).optional(),
  date: z.string().datetime('Ngày không hợp lệ (ISO 8601)'),
});

export const updateTransactionSchema = createTransactionSchema.partial();

export const transactionQuerySchema = z.object({
  type: z.enum(['INCOME', 'EXPENSE']).optional(),
  categoryId: z.string().optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  search: z.string().max(100).optional(),
  page: z.string().transform(Number).pipe(z.number().int().positive()).optional(),
  limit: z.string().transform(Number).pipe(z.number().int().min(1).max(100)).optional(),
  format: z.enum(['csv']).optional(),
});

// ─────────────────────────────────────────────
// CATEGORY VALIDATORS
// ─────────────────────────────────────────────
export const createCategorySchema = z.object({
  name: z.string().min(1, 'Tên danh mục không được trống').max(100),
  type: z.enum(['INCOME', 'EXPENSE']),
  icon: z.string().max(10).optional(),
});

// ─────────────────────────────────────────────
// STATS VALIDATORS
// ─────────────────────────────────────────────
export const statsQuerySchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  type: z.enum(['INCOME', 'EXPENSE']).optional(),
  interval: z.enum(['day', 'week', 'month']).optional().default('month'),
});

// ─────────────────────────────────────────────
// BUDGET VALIDATORS
// ─────────────────────────────────────────────
export const createBudgetSchema = z.object({
  categoryId: z.string().min(1),
  monthlyLimit: z.number().positive('Hạn mức phải lớn hơn 0'),
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2000).max(2100),
});

export const updateBudgetSchema = z.object({
  monthlyLimit: z.number().positive('Hạn mức phải lớn hơn 0'),
});

// ─────────────────────────────────────────────
// USER SETTINGS VALIDATORS
// ─────────────────────────────────────────────
export const updateSettingsSchema = z.object({
  theme: z.enum(['LIGHT', 'DARK']).optional(),
  currency: z.enum(['VND', 'USD']).optional(),
  language: z.enum(['vi', 'en']).optional(),
  alertThreshold: z.number().min(0).max(1).optional(),
});
