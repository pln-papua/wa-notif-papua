import cron from 'node-cron';
import * as db from '../services/db.service';
import * as wa from '../services/wablas.service';
import { buildRekapGangguan } from '../services/message.service';
import { getYesterdayRange } from '../utils/date.util';
import type { NotifLog } from '../models/notif-log.model';

// Runs daily at 00:01:00
const CRON_SCHEDULE = '1 0 * * *';

async function sendDailyRecap(): Promise<void> {
  console.log('[RECAP] Running daily H-1 recap...');

  const { start, end } = getYesterdayRange();
  const up3List = await db.getAllUp3();
  const sendDate = new Date();

  for (const up3 of up3List) {
    const logs = await db.getGangguanByDateAndUp3(up3, start, end);

    if (logs.length === 0) {
      console.log(`[RECAP] No gangguan for ${up3} on H-1, skipping`);
      continue;
    }

    const items = await Promise.all(
      logs.map(async (log) => {
        const monthly = await db.getMonthlyFaultCount(log.description, new Date(log.time_off));
        const yearly = await db.getYearlyFaultCount(log.description, new Date(log.time_off));
        return {
          log: log as NotifLog & {
            ulp: string; name: string; aset_type: string;
            zona: string; section: string; load: number; pelanggan: number;
          },
          monthlyCount: monthly,
          yearlyCount: yearly,
        };
      }),
    );

    const message = buildRekapGangguan(up3, start, sendDate, items);

    try {
      await wa.sendMessage(message);
      console.log(`[RECAP] Sent H-1 recap for UP3 ${up3}: ${logs.length} event(s)`);
    } catch (err) {
      console.error(`[RECAP] Failed to send recap for ${up3}:`, err);
    }
  }
}

export function startRecapScheduler(): void {
  cron.schedule(CRON_SCHEDULE, () => {
    sendDailyRecap().catch((err) => console.error('[RECAP] Error:', err));
  }, { timezone: 'Asia/Jayapura' });

  console.log(`[RECAP] Scheduler started (${CRON_SCHEDULE} Asia/Jayapura)`);
}
