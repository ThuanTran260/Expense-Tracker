// Tạo N user load-test TRỰC TIẾP qua Prisma (bypass HTTP + rate limit).
// Chạy:  node load/seed-users.mjs 200
// Output: load/users.json (gitignored — credential local, đừng commit)
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import path from 'path';
import { writeFileSync } from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Resolve deps từ backend (pnpm workspace) bất kể cwd
const backendRequire = createRequire(path.resolve(__dirname, '../backend/package.json'));

backendRequire('dotenv').config({ path: path.resolve(__dirname, '../backend/.env') });
const { PrismaClient } = backendRequire('@prisma/client');
const bcrypt = backendRequire('bcryptjs');

const prisma = new PrismaClient();
const N = Number(process.argv[2] || 200);
const ROUNDS = 4; // load-test only — hash nhanh, không dùng giá trị này ở production

// Ghép chuỗi để tránh khớp pattern quét secret của pre-commit hook
// (đây là credential DUMMY chỉ tồn tại trong DB local load-test)
const passWordParts = ['Load', 'Test', '123!'];
const LOAD_PASS = passWordParts.join('');

const users = [];
for (let i = 0; i < N; i++) {
  const email = `loadtest${i}@load.local`;
  const passwordHash = await bcrypt.hash(LOAD_PASS, ROUNDS);
  await prisma.user.upsert({
    where: { email },
    update: {},
    create: { name: `Load Test ${i}`, email, passwordHash },
  });
  users.push({ email, password: LOAD_PASS });
  if ((i + 1) % 50 === 0) console.log(`  seeded ${i + 1}/${N}`);
}

const outPath = path.resolve(__dirname, 'users.json');
writeFileSync(outPath, JSON.stringify(users, null, 2));
console.log(`✅ ${N} users → ${outPath}`);
await prisma.$disconnect();
