// prisma.config.ts
import 'dotenv/config'; // <--- Agrega esto en la línea 1
import { defineConfig } from 'prisma/config';

export default defineConfig({
  migrations: {
    seed: 'ts-node --compiler-options {"module":"CommonJS"} prisma/seed.ts',
  },
});
