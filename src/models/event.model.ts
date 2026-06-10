export interface ScadaEvent {
  id: number;
  description: string;  // e.g. 42.GISKY.F01.Z01
  message: string;      // e.g. CB OPEN, CB TRIP, CB CLOSE, AMF;300;23;24;250
  timestamp: Date;
}

export const EVENT_MESSAGES = {
  CB_OPEN:    'CB OPEN',
  CB_TRIP:    'CB TRIP',
  CB_CLOSE:   'CB CLOSE',
  PMCB_OPEN:  'PMCB OPEN',
  PMCB_TRIP:  'PMCB TRIP',
  PMCB_CLOSE: 'PMCB CLOSE',
  LBS_OPEN:   'LBS OPEN',
  LBS_TRIP:   'LBS TRIP',
  LBS_CLOSE:  'LBS CLOSE',
  REC_OPEN:   'REC OPEN',
  REC_TRIP:   'REC TRIP',
  REC_CLOSE:  'REC CLOSE',
  OCR: 'OCR',
  GFR: 'GFR',
  TRIP_ON: 'TRIP_ON',
  AMF: 'AMF',
} as const;

// CB OPEN / PMCB OPEN / dll → padam pemeliharaan
const PEMELIHARAAN_MESSAGES = [
  EVENT_MESSAGES.CB_OPEN,
  EVENT_MESSAGES.PMCB_OPEN,
  EVENT_MESSAGES.LBS_OPEN,
  EVENT_MESSAGES.REC_OPEN,
] as const;

// CB TRIP / PMCB TRIP / dll → padam gangguan
const GANGGUAN_MESSAGES = [
  EVENT_MESSAGES.CB_TRIP,
  EVENT_MESSAGES.PMCB_TRIP,
  EVENT_MESSAGES.LBS_TRIP,
  EVENT_MESSAGES.REC_TRIP,
  EVENT_MESSAGES.OCR,
  EVENT_MESSAGES.GFR,
  EVENT_MESSAGES.TRIP_ON,
  EVENT_MESSAGES.AMF,

] as const;

const CLOSE_MESSAGES = [
  EVENT_MESSAGES.CB_CLOSE,
  EVENT_MESSAGES.PMCB_CLOSE,
  EVENT_MESSAGES.LBS_CLOSE,
  EVENT_MESSAGES.REC_CLOSE,
] as const;

export function isPemeliharaanEvent(message: string): boolean {
  return PEMELIHARAAN_MESSAGES.includes(message as (typeof PEMELIHARAAN_MESSAGES)[number]);
}

export function isGangguanEvent(message: string): boolean {
  return GANGGUAN_MESSAGES.includes(message as (typeof GANGGUAN_MESSAGES)[number]);
}

export function isCloseEvent(message: string): boolean {
  return CLOSE_MESSAGES.includes(message as (typeof CLOSE_MESSAGES)[number]);
}

export function isAmfEvent(message: string): boolean {
  return message.startsWith('AMF;');
}

export interface AmfData {
  amfr: number;
  amfs: number;
  amft: number;
  amfn: number;
}

export function parseAmfMessage(message: string): AmfData {
  const parts = message.split(';');
  return {
    amfr: parseFloat(parts[1] ?? '0'),
    amfs: parseFloat(parts[2] ?? '0'),
    amft: parseFloat(parts[3] ?? '0'),
    amfn: parseFloat(parts[4] ?? '0'),
  };
}
