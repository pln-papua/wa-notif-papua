export interface ScadaEvent {
  id: number;
  description: string;  // raw: "REC_SANOBA, 42.KOTA1.F01.Z02:GFR:0.0:0.0:0.0:0.0"
  message: string;      // from scada_alarm.event: CB_TRIP, CB_CLOSE, CB_OPEN, etc.
  timestamp: Date;
}

export const EVENT_MESSAGES = {
  CB_OPEN:    'CB_OPEN',
  CB_TRIP:    'CB_TRIP',
  CB_CLOSE:   'CB_CLOSE',
  PMCB_OPEN:  'PMCB_OPEN',
  PMCB_TRIP:  'PMCB_TRIP',
  PMCB_CLOSE: 'PMCB_CLOSE',
  LBS_OPEN:   'LBS_OPEN',
  LBS_TRIP:   'LBS_TRIP',
  LBS_CLOSE:  'LBS_CLOSE',
  REC_OPEN:   'REC_OPEN',
  REC_TRIP:   'REC_TRIP',
  REC_CLOSE:  'REC_CLOSE',
} as const;

// Use startsWith to handle suffixes like "CB_CLOSE Manually Inputted"
const PEMELIHARAAN_PREFIXES = ['CB_OPEN', 'PMCB_OPEN', 'LBS_OPEN', 'REC_OPEN'] as const;
const GANGGUAN_PREFIXES     = ['CB_TRIP', 'PMCB_TRIP', 'LBS_TRIP', 'REC_TRIP'] as const;
const CLOSE_PREFIXES        = ['CB_CLOSE', 'PMCB_CLOSE', 'LBS_CLOSE', 'REC_CLOSE'] as const;

export function isPemeliharaanEvent(message: string): boolean {
  return PEMELIHARAAN_PREFIXES.some((p) => message.startsWith(p));
}

export function isGangguanEvent(message: string): boolean {
  return GANGGUAN_PREFIXES.some((p) => message.startsWith(p));
}

export function isCloseEvent(message: string): boolean {
  return CLOSE_PREFIXES.some((p) => message.startsWith(p));
}

export interface ParsedAlarm {
  apktcode: string;
  faultType?: string;
  amfr: number;
  amfs: number;
  amft: number;
  amfn: number;
}

/**
 * Parses scada_alarm.description to extract the asset code and embedded fault data.
 * Formats:
 *   "DEVICE_NAME, 42.KOTA1.F01.Z02"
 *   "DEVICE_NAME, 42.KOTA1.F01.Z02:GFR:0.0:0.0:0.0:0.0"
 */
export function parseAlarmDescription(raw: string): ParsedAlarm {
  const commaIdx = raw.indexOf(',');
  const codeAndFault = (commaIdx >= 0 ? raw.slice(commaIdx + 1) : raw).trim();

  const parts = codeAndFault.split(':').map((p) => p.trim());
  const apktcode = parts[0]!;

  if (parts.length >= 6) {
    return {
      apktcode,
      faultType: parts[1],
      amfr: parseFloat(parts[2] ?? '0'),
      amfs: parseFloat(parts[3] ?? '0'),
      amft: parseFloat(parts[4] ?? '0'),
      amfn: parseFloat(parts[5] ?? '0'),
    };
  }

  return { apktcode, amfr: 0, amfs: 0, amft: 0, amfn: 0 };
}
