const HARI_INDO = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

function pad(n: number): string {
  return n.toString().padStart(2, '0');
}

function padMs(n: number): string {
  return n.toString().padStart(3, '0');
}

export function formatTanggal(date: Date): string {
  const hari = HARI_INDO[date.getDay()];
  const d = pad(date.getDate());
  const m = pad(date.getMonth() + 1);
  const y = date.getFullYear();
  return `${hari}, ${d}/${m}/${y}`;
}

export function formatDateShort(date: Date): string {
  const d = pad(date.getDate());
  const m = pad(date.getMonth() + 1);
  const y = date.getFullYear();
  return `${d}/${m}/${y}`;
}

export function formatDateTime(date: Date): string {
  const d = pad(date.getDate());
  const m = pad(date.getMonth() + 1);
  const y = date.getFullYear();
  const hh = pad(date.getHours());
  const mm = pad(date.getMinutes());
  const ss = pad(date.getSeconds());
  const ms = padMs(date.getMilliseconds());
  return `${d}/${m}/${y} ${hh}:${mm}:${ss}.${ms}`;
}

export function formatTime(date: Date): string {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

export function formatDuration(msec: number): string {
  const totalSeconds = Math.floor(Math.abs(msec) / 1000);
  const seconds = totalSeconds % 60;
  const totalMinutes = Math.floor(totalSeconds / 60);
  const minutes = totalMinutes % 60;
  const totalHours = Math.floor(totalMinutes / 60);
  const hours = totalHours % 24;
  const days = Math.floor(totalHours / 24);
  return `${days} hari:${hours} jam:${minutes} menit:${seconds} detik`;
}

export function getYesterdayRange(): { start: Date; end: Date } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0, 0);
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59, 999);
  return { start, end };
}
