import { loadEnvFile } from 'node:process';
import { defineConfig } from 'prisma/config';

const environment = process.env.NODE_ENV || 'development';
loadEnvFile(`.env.${environment}`);

export default defineConfig({
  schema: 'database/schema.prisma',
  migrations: {
    path: 'database/migrations',
    seed: 'tsx database/seed.ts',
  },
  datasource: {
    url: process.env.DATABASE_URL!,
  },
});
