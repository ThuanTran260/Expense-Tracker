// Import từ compiled JavaScript trong backend/dist để Vercel không cần re-typecheck TypeScript
const appModule = require('../backend/dist/app');
const app = appModule.default || appModule;

export default app;

