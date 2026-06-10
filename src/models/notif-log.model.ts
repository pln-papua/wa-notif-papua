export type NotifType = 'gangguan' | 'pemeliharaan';

export interface NotifLog {
  id: number;
  description: string;
  type: NotifType;
  event_id_open: number;
  event_id_close: number | null;
  indikasi: string | null;   // OCR / GFR / TRIP
  amfr: number | null;
  amfs: number | null;
  amft: number | null;
  amfn: number | null;
  time_off: Date;
  time_on: Date | null;
  wa_sent_open: number;
  wa_sent_close: number;
  created_at: Date;
}

export interface CreateNotifLogDto {
  description: string;
  type: NotifType;
  event_id_open: number;
  indikasi?: string;
  amfr?: number;
  amfs?: number;
  amft?: number;
  amfn?: number;
  time_off: Date;
}
