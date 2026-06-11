import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { pool } from '../config/database';
import type { ScadaEvent } from '../models/event.model';
import type { Aset } from '../models/aset.model';
import type { NotifLog, CreateNotifLogDto } from '../models/notif-log.model';

export async function getPollerLastId(): Promise<number> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    'SELECT last_event_id FROM poller_state WHERE id = 1',
  );
  const lastId = Number((rows[0] as RowDataPacket)['last_event_id']) ?? 0;
  console.log(`[DB] getPollerLastId → ${lastId}`);
  return lastId;
}

export async function advancePollerLastId(lastId: number): Promise<void> {
  await pool.execute(
    'UPDATE poller_state SET last_event_id = ? WHERE id = 1',
    [lastId],
  );
  console.log(`[DB] advancePollerLastId → ${lastId}`);
}

export async function getEventsSinceId(lastId: number): Promise<ScadaEvent[]> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT id, description, event AS message, processtime AS timestamp
     FROM scada_alarm
     WHERE id > ?
     ORDER BY id ASC
     LIMIT 500`,
    [lastId],
  );
  console.log(`[DB] getEventsSinceId(lastId=${lastId}) → ${rows.length} row(s)`);
  return rows as ScadaEvent[];
}

export async function getAsetByCode(apktcode: string): Promise<Aset | null> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    'SELECT * FROM aset WHERE apktcode = ? LIMIT 1',
    [apktcode],
  );
  const found = rows.length > 0;
  console.log(`[DB] getAsetByCode(${apktcode}) → ${found ? 'found' : 'NOT FOUND'}`);
  return found ? (rows[0] as Aset) : null;
}

export async function getMonthlyFaultCount(description: string, refDate: Date): Promise<number> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT COUNT(*) AS cnt FROM notif_log
     WHERE description = ?
       AND type = 'gangguan'
       AND YEAR(time_off) = YEAR(?)
       AND MONTH(time_off) = MONTH(?)`,
    [description, refDate, refDate],
  );
  const cnt = Number((rows[0] as RowDataPacket)['cnt']) ?? 0;
  console.log(`[DB] getMonthlyFaultCount(${description}) → ${cnt}`);
  return cnt;
}

export async function getYearlyFaultCount(description: string, refDate: Date): Promise<number> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT COUNT(*) AS cnt FROM notif_log
     WHERE description = ?
       AND type = 'gangguan'
       AND YEAR(time_off) = YEAR(?)`,
    [description, refDate],
  );
  const cnt = Number((rows[0] as RowDataPacket)['cnt']) ?? 0;
  console.log(`[DB] getYearlyFaultCount(${description}) → ${cnt}`);
  return cnt;
}

export async function createNotifLog(dto: CreateNotifLogDto): Promise<number> {
  const [result] = await pool.execute<ResultSetHeader>(
    `INSERT INTO notif_log
       (description, type, event_id_open, indikasi, amfr, amfs, amft, amfn, time_off, wa_sent_open, wa_sent_close)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 0)`,
    [
      dto.description,
      dto.type,
      dto.event_id_open,
      dto.indikasi ?? null,
      dto.amfr ?? null,
      dto.amfs ?? null,
      dto.amft ?? null,
      dto.amfn ?? null,
      dto.time_off,
    ],
  );
  console.log(`[DB] createNotifLog → id=${result.insertId} desc=${dto.description} type=${dto.type}`);
  return result.insertId;
}

export async function getOpenNotifLog(description: string): Promise<NotifLog | null> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT * FROM notif_log
     WHERE description = ?
       AND event_id_close IS NULL
     ORDER BY time_off DESC
     LIMIT 1`,
    [description],
  );
  const found = rows.length > 0;
  console.log(`[DB] getOpenNotifLog(${description}) → ${found ? `found id=${(rows[0] as RowDataPacket)['id']}` : 'NOT FOUND'}`);
  return found ? (rows[0] as NotifLog) : null;
}

export async function closeNotifLog(
  notifLogId: number,
  eventIdClose: number,
  timeOn: Date,
): Promise<void> {
  await pool.execute(
    `UPDATE notif_log
     SET event_id_close = ?, time_on = ?, wa_sent_close = 1
     WHERE id = ?`,
    [eventIdClose, timeOn, notifLogId],
  );
  console.log(`[DB] closeNotifLog → notif_log_id=${notifLogId} closed by event_id=${eventIdClose}`);
}

export async function getGangguanByDateAndUp3(
  up3: string,
  startDate: Date,
  endDate: Date,
): Promise<NotifLog[]> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT nl.*, a.up3, a.ulp, a.nama AS name, a.aset AS aset_type, a.zona, a.section,
            a.beban AS load, a.pelanggan
     FROM notif_log nl
     JOIN aset a ON a.apktcode = nl.description
     WHERE a.up3 = ?
       AND nl.type = 'gangguan'
       AND nl.time_off BETWEEN ? AND ?
     ORDER BY nl.time_off ASC`,
    [up3, startDate, endDate],
  );
  console.log(`[DB] getGangguanByDateAndUp3(up3=${up3}) → ${rows.length} row(s)`);
  return rows as NotifLog[];
}

export async function getAllUp3(): Promise<string[]> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    'SELECT DISTINCT up3 FROM aset ORDER BY up3',
  );
  const list = rows.map((r) => (r as RowDataPacket)['up3'] as string);
  console.log(`[DB] getAllUp3 → [${list.join(', ')}]`);
  return list;
}
