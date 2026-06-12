import { config } from '../config/env';
import * as db from './db.service';
import * as wa from './wablas.service';
import * as msg from './message.service';
import {
  isPemeliharaanEvent,
  isGangguanEvent,
  isCloseEvent,
  parseAlarmDescription,
  type ScadaEvent,
} from '../models/event.model';

let isRunning = false;

async function processPemeliharaanEvents(events: ScadaEvent[]): Promise<void> {
  const pemEvents = events.filter((e) => isPemeliharaanEvent(e.message));
  console.log(`[POLLER][DEBUG] processPemeliharaanEvents: total=${pemEvents.length}`);
  pemEvents.forEach((e) => console.log(`[POLLER][DEBUG]  PEM id=${e.id} msg=${e.message} desc=${e.description} ts=${e.timestamp}`));

  for (const event of pemEvents) {
    const { apktcode } = parseAlarmDescription(event.description);
    const aset = await db.getAsetByCode(apktcode);
    if (!aset) {
      console.warn(`[POLLER] No aset for pemeliharaan event id=${event.id}: ${apktcode}`);
      continue;
    }

    try {
      const message = msg.buildPadamPemeliharaan(event, aset);
      console.log(`[POLLER][DEBUG] PEM message:\n${message}`);
      await db.createNotifLog({
        description: apktcode,
        type: 'pemeliharaan',
        event_id_open: event.id,
        time_off: event.timestamp,
      });
      await wa.sendMessage(message);
      console.log(`[POLLER] Sent PEMELIHARAAN notif: ${apktcode}`);
    } catch (err) {
      console.error(`[POLLER] Error processing pemeliharaan event id=${event.id}:`, err);
    }
  }
}

async function processGangguanEvents(events: ScadaEvent[]): Promise<void> {
  const tripEvents = events.filter((e) => isGangguanEvent(e.message));
  console.log(`[POLLER][DEBUG] processGangguanEvents: total=${tripEvents.length}`);
  tripEvents.forEach((e) => console.log(`[POLLER][DEBUG]  TRIP id=${e.id} msg=${e.message} desc=${e.description} ts=${e.timestamp}`));

  for (const tripEvent of tripEvents) {
    const { apktcode, faultType, amfr, amfs, amft, amfn } = parseAlarmDescription(tripEvent.description);
    const indikasi = faultType ?? 'TRIP';

    const aset = await db.getAsetByCode(apktcode);
    if (!aset) {
      console.warn(`[POLLER] No aset for gangguan event id=${tripEvent.id}: ${apktcode}`);
      continue;
    }

    try {
      const monthly = await db.getMonthlyFaultCount(apktcode, tripEvent.timestamp);
      const yearly = await db.getYearlyFaultCount(apktcode, tripEvent.timestamp);
      const message = msg.buildPadamGangguan(
        tripEvent, aset, indikasi,
        amfr, amfs, amft, amfn,
        monthly, yearly,
      );
      console.log(`[POLLER][DEBUG] GANGGUAN message:\n${message}`);
      await db.createNotifLog({
        description: apktcode,
        type: 'gangguan',
        event_id_open: tripEvent.id,
        indikasi,
        amfr,
        amfs,
        amft,
        amfn,
        time_off: tripEvent.timestamp,
      });
      await wa.sendMessage(message);
      console.log(`[POLLER] Sent GANGGUAN notif: ${apktcode}`);
    } catch (err) {
      console.error(`[POLLER] Error processing gangguan event id=${tripEvent.id}:`, err);
    }
  }
}

async function processCloseEvents(events: ScadaEvent[]): Promise<void> {
  const closeEvents = events.filter((e) => isCloseEvent(e.message));

  for (const closeEvent of closeEvents) {
    const { apktcode } = parseAlarmDescription(closeEvent.description);
    const log = await db.getOpenNotifLog(apktcode);
    if (!log) {
      console.warn(`[POLLER] No open notif_log for close event id=${closeEvent.id} (${apktcode})`);
      continue;
    }

    const aset = await db.getAsetByCode(apktcode);
    if (!aset) {
      console.warn(`[POLLER] No aset for close event: ${apktcode}`);
      continue;
    }

    log.time_on = closeEvent.timestamp;

    try {
      let message: string;
      if (log.type === 'gangguan') {
        const monthly = await db.getMonthlyFaultCount(apktcode, log.time_off);
        const yearly = await db.getYearlyFaultCount(apktcode, log.time_off);
        message = msg.buildPenormalanGangguan(closeEvent, log, aset, monthly, yearly);
      } else {
        message = msg.buildPenormalanPemeliharaan(closeEvent, log, aset);
      }

      console.log(`[POLLER][DEBUG] PENORMALAN message:\n${message}`);
      await db.closeNotifLog(log.id, closeEvent.id, closeEvent.timestamp);
      await wa.sendMessage(message);
      console.log(`[POLLER] Sent PENORMALAN notif: ${apktcode}`);
    } catch (err) {
      console.error(`[POLLER] Error processing close event id=${closeEvent.id}:`, err);
    }
  }
}

async function pollOnce(): Promise<void> {
  if (isRunning) return;
  isRunning = true;

  try {
    const lastId = await db.getPollerLastId();
    const raw = await db.getEventsSinceId(lastId);
    if (raw.length === 0) return;

    const settleThreshold = new Date(Date.now() - config.polling.settlingSeconds * 1000);
    const events = raw.filter((e) => e.timestamp <= settleThreshold);
    if (events.length === 0) return;

    console.log(`[POLLER] Processing ${events.length} event(s) since id=${lastId}...`);
    await processPemeliharaanEvents(events);
    await processGangguanEvents(events);
    await processCloseEvents(events);

    const maxId = events[events.length - 1]!.id;
    await db.advancePollerLastId(maxId);
    console.log(`[POLLER] Counter advanced to id=${maxId}`);
  } catch (err) {
    console.error('[POLLER] Unexpected error:', err);
  } finally {
    isRunning = false;
  }
}

let intervalHandle: ReturnType<typeof setInterval> | null = null;

export function startPoller(): void {
  if (intervalHandle) return;
  console.log(`[POLLER] Starting with interval=${config.polling.intervalMs}ms, settling=${config.polling.settlingSeconds}s`);
  intervalHandle = setInterval(() => {
    pollOnce().catch((err) => console.error('[POLLER] pollOnce error:', err));
  }, config.polling.intervalMs);
}

export function stopPoller(): void {
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
    console.log('[POLLER] Stopped');
  }
}
