import app from '../backend/src/app';

// Vercel Serverless handler — Express app bản chất là một (req, res) handler.
// CHÚ Ý: không import backend/src/server.ts (tránh app.listen + retry loop —
// Vercel tự quản lý vòng đời instance; PrismaClient được giữ ở module scope
// để tái sử dụng giữa các invocation Warm).
export default app;
