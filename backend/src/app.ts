import express from 'express';
import cors, { CorsOptionsDelegate } from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';

import authRoutes from './routes/auth.routes';
import settingsRoutes from './routes/settings.routes';
import categoryRoutes from './routes/category.routes';
import transactionRoutes from './routes/transaction.routes';
import statsRoutes from './routes/stats.routes';
import budgetRoutes from './routes/budget.routes';
import exchangeRoutes from './routes/exchange.routes';
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

// CORS: same-origin LUÔN được phép (production + preview Vercel đều cùng domain qua
// rewrite) + allowlist tùy chọn qua CORS_ORIGINS. Cấm mở theo platform/env blanket
// (vd: mọi *.vercel.app hay mọi origin khi chạy trên Vercel) — đã từng là lỗ hổng.
const corsDelegate: CorsOptionsDelegate = (req, callback) => {
  const origin = req.headers.origin;

  // Không có Origin header: curl/Postman/same-origin GET → cho phép
  if (!origin) {
    return callback(null, { origin: true, credentials: true });
  }

  const normalized = origin.replace(/\/$/, '');
  let originHost = '';
  try {
    originHost = new URL(normalized).host;
  } catch {
    /* origin malformed */
  }
  const requestHost =
    (req.headers['x-forwarded-host'] as string | undefined) ||
    (req.headers.host as string | undefined) ||
    '';

  const allowed =
    allowedOrigins.includes(normalized) ||
    (originHost !== '' && originHost === requestHost) ||
    normalized.startsWith('http://localhost:') ||
    normalized.startsWith('http://127.0.0.1:');

  if (allowed) {
    return callback(null, { origin: true, credentials: true });
  }
  // Từ chối: không trả Access-Control-Allow-Origin → trình duyệt tự chặn
  return callback(null, { origin: false });
};

app.use(cors(corsDelegate));

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
app.use(`${API_PREFIX}/exchange-rates`, exchangeRoutes);

// ─────────────────────────────────────────────
// ERROR HANDLERS — PHẢI ĐẶT CUỐI CÙNG
// ─────────────────────────────────────────────
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
