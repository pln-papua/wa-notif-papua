import dotenv from 'dotenv';
dotenv.config();

// Satu device_id WHA Center melayani beberapa UP3 sekaligus (nomor WA per region)
const deviceIdTimikaBiak = process.env.WHACENTER_DEVICE_ID_TIMIKA_BIAK ?? '';
const deviceIdManokwariNabire = process.env.WHACENTER_DEVICE_ID_MANOKWARI_NABIRE ?? '';
const deviceIdSorongFakfak = process.env.WHACENTER_DEVICE_ID_SORONG_FAKFAK ?? '';
const deviceIdJayapuraWamena = process.env.WHACENTER_DEVICE_ID_JAYAPURA_WAMENA ?? '';

const deviceIdByUp3: Record<string, string> = {
  TIMIKA: deviceIdTimikaBiak,
  BIAK: deviceIdTimikaBiak,
  MANOKWARI: deviceIdManokwariNabire,
  NABIRE: deviceIdManokwariNabire,
  SORONG: deviceIdSorongFakfak,
  FAKFAK: deviceIdSorongFakfak,
  JAYAPURA: deviceIdJayapuraWamena,
  WAMENA: deviceIdJayapuraWamena,
};

export const config = {
  port: parseInt(process.env.PORT ?? '3000'),
  db: {
    host: process.env.DB_HOST ?? 'localhost',
    port: parseInt(process.env.DB_PORT ?? '3306'),
    user: process.env.DB_USER ?? 'root',
    password: process.env.DB_PASSWORD ?? '',
    database: process.env.DB_NAME ?? 'scada_history',
  },
  whaCenter: {
    deviceIdByUp3,
    baseUrl: process.env.WHACENTER_BASE_URL ?? 'https://api.whacenter.com',
    groupTargets: (process.env.WA_GROUP_TARGETS ?? '').split(',').map((t) => t.trim()).filter(Boolean),
    numberTargets: (process.env.WA_NUMBER_TARGETS ?? '').split(',').map((t) => t.trim()).filter(Boolean),
  },
  polling: {
    intervalMs: parseInt(process.env.POLLING_INTERVAL_MS ?? '30000'),
  },
};
