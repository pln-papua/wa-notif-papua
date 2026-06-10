import type { ScadaEvent } from '../models/event.model';
import type { Aset } from '../models/aset.model';
import type { NotifLog } from '../models/notif-log.model';
import { formatTanggal, formatDateTime, formatDuration } from '../utils/date.util';

const SEP = '==============================';
const LINE = '--------------------------------------------------';

function header(date: Date): string {
  return `NOTIFIKASI SISTEM SCADA\n${SEP}\n${formatTanggal(date)} ${
    date.toTimeString().slice(0, 8)
  }\n${SEP}`;
}

function asetBlock(eventId: number, event: ScadaEvent, aset: Aset): string {
  return [
    `Event Id    : ${eventId}`,
    `UP3         : ${aset.up3}`,
    `ULP         : ${aset.ulp}`,
    `Name        : ${aset.name}`,
    `Type        : ${aset.type}`,
    `Zona        : ${aset.zona}`,
    `Section     : ${aset.section || '-'}`,
    `Event       : ${event.message}`,
    `Time        : ${formatDateTime(event.timestamp)}`,
  ].join('\n');
}

export function buildPadamGangguan(
  event: ScadaEvent,
  aset: Aset,
  indikasi: string,
  amfr: number,
  amfs: number,
  amft: number,
  amfn: number,
  monthlyCount: number,
  yearlyCount: number,
): string {
  console.log(`[MSG] Build padam gangguan — event_id=${event.id} desc=${event.description} up3=${aset.up3} indikasi=${indikasi} amf=${amfr}/${amfs}/${amft}/${amfn}`);
  return [
    header(event.timestamp),
    'Info padam gangguan',
    LINE,
    asetBlock(event.id, event, aset),
    LINE,
    `Indikasi    : ${indikasi}`,
    `AMFR        : ${amfr}`,
    `AMFS        : ${amfs}`,
    `AMFT        : ${amft}`,
    `AMFN        : ${amfn}`,
    LINE,
    `Frekuensi gangguan bulanan  : ${monthlyCount}`,
    `Frekuensi gangguan tahunan  : ${yearlyCount}`,
    `Load (kW)   : ${aset.load}`,
    `Pelanggan   : ${aset.pelanggan}`,
  ].join('\n');
}

export function buildPadamPemeliharaan(event: ScadaEvent, aset: Aset): string {
  console.log(`[MSG] Build padam pemeliharaan — event_id=${event.id} desc=${event.description} up3=${aset.up3}`);
  return [
    header(event.timestamp),
    'Info padam manuver/ pemeliharaan',
    LINE,
    asetBlock(event.id, event, aset),
    LINE,
    `Load (kW)   : ${aset.load}`,
    `Pelanggan   : ${aset.pelanggan}`,
  ].join('\n');
}

export function buildPenormalanGangguan(
  closeEvent: ScadaEvent,
  log: NotifLog,
  aset: Aset,
  monthlyCount: number,
  yearlyCount: number,
): string {
  const duration = log.time_on
    ? formatDuration(log.time_on.getTime() - log.time_off.getTime())
    : '-';

  console.log(`[MSG] Build penormalan gangguan — event_id=${closeEvent.id} desc=${closeEvent.description} up3=${aset.up3} durasi=${duration}`);
  return [
    header(closeEvent.timestamp),
    'Info penormalan gangguan',
    LINE,
    `Event Id    : ${log.event_id_open}`,
    `UP3         : ${aset.up3}`,
    `ULP         : ${aset.ulp}`,
    `Name        : ${aset.name}`,
    `Type        : ${aset.type}`,
    `Zona        : ${aset.zona}`,
    `Section     : ${aset.section || '-'}`,
    `Event       : ${closeEvent.message}`,
    `Time Off    : ${formatDateTime(log.time_off)}`,
    `Time On     : ${formatDateTime(closeEvent.timestamp)}`,
    `Duration    : ${duration}`,
    LINE,
    `Indikasi    : ${log.indikasi ?? '-'}`,
    `AMFR        : ${log.amfr ?? '-'}`,
    `AMFS        : ${log.amfs ?? '-'}`,
    `AMFT        : ${log.amft ?? '-'}`,
    `AMFN        : ${log.amfn ?? '-'}`,
    LINE,
    `Frekuensi gangguan bulanan  : ${monthlyCount}`,
    `Frekuensi gangguan tahunan  : ${yearlyCount}`,
    `Load (kW)   : ${aset.load}`,
    `Pelanggan   : ${aset.pelanggan}`,
  ].join('\n');
}

export function buildPenormalanPemeliharaan(
  closeEvent: ScadaEvent,
  log: NotifLog,
  aset: Aset,
): string {
  const duration = log.time_on
    ? formatDuration(log.time_on.getTime() - log.time_off.getTime())
    : '-';

  console.log(`[MSG] Build penormalan pemeliharaan — event_id=${closeEvent.id} desc=${closeEvent.description} up3=${aset.up3} durasi=${duration}`);
  return [
    header(closeEvent.timestamp),
    'Info penormalan manuver/ pemeliharaan',
    LINE,
    `Event Id    : ${log.event_id_open}`,
    `UP3         : ${aset.up3}`,
    `ULP         : ${aset.ulp}`,
    `Name        : ${aset.name}`,
    `Type        : ${aset.type}`,
    `Zona        : ${aset.zona}`,
    `Section     : ${aset.section || '-'}`,
    `Event       : ${closeEvent.message}`,
    `Time Off    : ${formatDateTime(log.time_off)}`,
    `Time On     : ${formatDateTime(closeEvent.timestamp)}`,
    `Duration    : ${duration}`,
    LINE,
    `Load (kW)   : ${aset.load}`,
    `Pelanggan   : ${aset.pelanggan}`,
  ].join('\n');
}

export function buildRekapGangguan(
  up3: string,
  refDate: Date,
  sendDate: Date,
  items: Array<{
    log: NotifLog & { ulp: string; name: string; aset_type: string; zona: string; section: string; load: number; pelanggan: number };
    monthlyCount: number;
    yearlyCount: number;
  }>,
): string {
  console.log(`[MSG] Build rekap gangguan H-1 — up3=${up3} tanggal=${refDate.toLocaleDateString('id-ID')} total=${items.length} event`);
  const lines: string[] = [
    header(sendDate),
    `Info rekap gangguan H-1`,
    `${formatTanggal(refDate).replace(',', '').split(' ').slice(0, 1)[0]}, ${
      refDate.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '/')
    }`,
    `UP3 ${up3}`,
  ];

  for (const item of items) {
    const { log } = item;
    const gangguan = log.indikasi
      ? `${log.indikasi};${log.amfr ?? 0};${log.amfs ?? 0};${log.amft ?? 0};${log.amfn ?? 0}`
      : '-';
    const duration = log.time_on
      ? formatDuration(new Date(log.time_on).getTime() - new Date(log.time_off).getTime())
      : '-';

    lines.push(
      LINE,
      `Event Id    : ${log.event_id_open}`,
      `Info        : ULP ${log.ulp}; ${log.aset_type} ${log.name}; ZONA ${log.zona}; SECTION ${log.section || '-'}`,
      `Time Off    : ${formatDateTime(new Date(log.time_off))}`,
      `Time On     : ${log.time_on ? formatDateTime(new Date(log.time_on)) : '-'}`,
      `Durasi padam : ${duration}`,
      `Gangguan    : ${gangguan}`,
      `Frekuensi gangguan bulanan  : ${item.monthlyCount}`,
      `Frekuensi gangguan tahunan  : ${item.yearlyCount}`,
      `Load (kW)   : ${log.load}`,
      `Pelanggan   : ${log.pelanggan}`,
    );
  }

  return lines.join('\n');
}
