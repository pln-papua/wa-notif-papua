import axios from 'axios';
import { config } from '../config/env';

interface WablasResponse {
  status: boolean;
  message: string;
}

function buildAuth(): string {
  return `${config.wablas.token}.${config.wablas.secretKey}`;
}

async function send(phone: string, message: string, isGroup: boolean): Promise<void> {
  const params = new URLSearchParams({ phone, message });
  if (isGroup) params.set('isGroup', 'true');

  const label = isGroup ? 'group' : 'number';
  console.log(`[WABLAS] Sending to ${label} ${phone} ...`);

  const response = await axios.post<WablasResponse>(
    `${config.wablas.baseUrl}/api/send-message`,
    params.toString(),
    {
      headers: {
        Authorization: buildAuth(),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      timeout: 10_000,
    },
  );

  if (!response.data.status) {
    throw new Error(`Wablas rejected [${phone}]: ${response.data.message}`);
  }

  console.log(`[WABLAS] OK → ${label} ${phone}: ${response.data.message}`);
}

export async function sendMessage(message: string): Promise<void> {
  const { groupTargets, numberTargets } = config.wablas;

  if (groupTargets.length === 0 && numberTargets.length === 0) {
    console.warn('[WABLAS] No targets configured, skipping send');
    return;
  }

  console.log(`[WABLAS] Dispatching to ${groupTargets.length} group(s) + ${numberTargets.length} number(s)`);

  const tasks = [
    ...groupTargets.map((phone) => send(phone, message, true)),
    ...numberTargets.map((phone) => send(phone, message, false)),
  ];

  const results = await Promise.allSettled(tasks);
  const allTargets = [...groupTargets, ...numberTargets];

  results.forEach((result, i) => {
    if (result.status === 'rejected') {
      console.error(`[WABLAS] Failed to send to ${allTargets[i]}:`, result.reason);
    }
  });
}
