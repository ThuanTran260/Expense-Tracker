// Import từ compiled JavaScript trong backend/dist
declare const require: any;

const appModule = require('../backend/dist/app');
const app = appModule.default || appModule;

export default app;

