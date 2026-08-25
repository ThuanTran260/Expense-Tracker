import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';

import authRoutes from './routes/auth.routes';
import settingsRoutes from './routes/settings.routes';
import categoryRoutes from './routes/category.routes';
import transactionRoutes from './routes/transaction.routes';
import statsRoutes from './routes/stats.routes';
import budgetRoutes from './routes/budget.routes';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler';

const app = express();

// Đứng sau reverse proxy (Vercel / Render / Nginx) → tin hop đầu tiên
// để express-rate-limit nhìn thấy IP thật của client thay vì IP của proxy.
app.set('trust proxy', 1);

// ─────────────────────────────────────────────
// SECURITY MIDDLEWARES
// ─────────────────────────────────────────────
app.use(helmet());

const defaultOrigins = [
  'http://localhost',
  'http://localhost:80',
  'http://localhost:5173',
  'http://127.0.0.1',
  'http://127.0.0.1:80',
  'http://127.0.0.1:5173',
];

const envOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((o) => o.trim().replace(/\/$/, ''))
  .filter(Boolean);

const allowedOrigins = Array.from(new Set([...defaultOrigins, ...envOrigins]));

app.use(
  cors({
    origin: (origin, callback) => {
      // Cho phép requests không có origin (Postman, cURL, v.v.)
      if (!origin) {
        return callback(null, true);
      }
      const normalized = origin.replace(/\/$/, '');
      if (
        allowedOrigins.includes(normalized) ||
        normalized.startsWith('http://localhost:') ||
        normalized.startsWith('http://127.0.0.1:')
      ) {
        return callback(null, true);
      }
      return callback(new Error(`CORS blocked: ${origin}`));
    },
    credentials: true, // Cho phép cookies (refreshToken HttpOnly)
  })
);

// ─────────────────────────────────────────────
// BODY PARSERS
// ─────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ─────────────────────────────────────────────
// HEALTH CHECK
// ─────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─────────────────────────────────────────────
// ROUTES
// ─────────────────────────────────────────────
const API_PREFIX = '/api/v1';

app.use(`${API_PREFIX}/auth`, authRoutes);
app.use(`${API_PREFIX}/settings`, settingsRoutes);
app.use(`${API_PREFIX}/categories`, categoryRoutes);
app.use(`${API_PREFIX}/transactions`, transactionRoutes);
app.use(`${API_PREFIX}/stats`, statsRoutes);
app.use(`${API_PREFIX}/budgets`, budgetRoutes);

// ─────────────────────────────────────────────
// ERROR HANDLERS — PHẢI ĐẶT CUỐI CÙNG
// ─────────────────────────────────────────────
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
