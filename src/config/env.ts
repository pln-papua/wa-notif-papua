import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT ?? '3000'),
  db: {
    host: process.env.DB_HOST ?? 'localhost',
    port: parseInt(process.env.DB_PORT ?? '3306'),
    user: process.env.DB_USER ?? 'root',
    password: process.env.DB_PASSWORD ?? '',
    database: process.env.DB_NAME ?? 'scada_history',
  },
  wablas: {
    token: process.env.WABLAS_TOKEN ?? '',
    secretKey: process.env.WABLAS_SECRET_KEY ?? '',
    baseUrl: process.env.WABLAS_BASE_URL ?? 'https://my.wablas.com',
    groupTargets: (process.env.WA_GROUP_TARGETS ?? '').split(',').map((t) => t.trim()).filter(Boolean),
    numberTargets: (process.env.WA_NUMBER_TARGETS ?? '').split(',').map((t) => t.trim()).filter(Boolean),
  },
  polling: {
    intervalMs: parseInt(process.env.POLLING_INTERVAL_MS ?? '5000'),
    settlingSeconds: parseInt(process.env.SETTLING_SECONDS ?? '15'),
  },
};
