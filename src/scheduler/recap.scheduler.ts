import cron from 'node-cron';
import * as db from '../services/db.service';
import * as wa from '../services/whacenter.service';
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

    let up3Totals: { monthlyCount: number; yearlyCount: number; totalLoad: number; totalPelanggan: number } | undefined;

    if (logs.length === 0) {
      console.log(`[RECAP] No gangguan for ${up3} on H-1, sending empty recap with UP3 totals`);
      const [monthlyCount, yearlyCount, { totalLoad, totalPelanggan }] = await Promise.all([
        db.getMonthlyFaultCountByUp3(up3, start),
        db.getYearlyFaultCountByUp3(up3, start),
        db.getUp3Totals(up3),
      ]);
      up3Totals = { monthlyCount, yearlyCount, totalLoad, totalPelanggan };
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

    const message = buildRekapGangguan(up3, start, sendDate, items, up3Totals);

    try {
      await wa.sendMessage(message, up3);
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
