import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    seed: `node -r dotenv/config -r ts-node/register prisma/seed.ts`,
  },
});
