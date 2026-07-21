import axios from 'axios';
import { config } from '../config/env';

interface WhaCenterResponse {
  Status: boolean;
  Message: string;
}

function resolveDeviceId(up3: string): string {
  const key = up3.trim().toUpperCase();
  const deviceId = config.whaCenter.deviceIdByUp3[key];
  if (!deviceId) {
    console.error(`[WHACENTER] No device_id configured for UP3 "${up3}"`);
    throw new Error(`No WHA Center device_id configured for UP3 "${up3}"`);
  }
  console.log(`[WHACENTER] Resolved UP3 "${up3}" → device ${deviceId}`);
  return deviceId;
}

async function send(deviceId: string, target: string, message: string, isGroup: boolean): Promise<void> {
  const label = isGroup ? 'group' : 'number';
  console.log(`[WHACENTER] Sending to ${label} ${target} via device ${deviceId} ...`);

  const payload: Record<string, string | null> = {
    device_id: deviceId,
    number: target,
    message,
    file: null,
    schedule: null,
  };

  const endpoint = isGroup ? '/api/sendGroup' : '/api/send';
  const response = await axios.post<WhaCenterResponse>(`${config.whaCenter.baseUrl}${endpoint}`, payload, {
    timeout: 10_000,
  });

  if (!response.data.Status) {
    throw new Error(`WHA Center rejected [${target}]: ${response.data.Message}`);
  }

  console.log(`[WHACENTER] OK → ${label} ${target}: ${response.data.Message}`);
}

export async function sendMessage(message: string, up3: string): Promise<void> {
  const deviceId = resolveDeviceId(up3);
  const key = up3.trim().toUpperCase();
  const groupTargets = config.whaCenter.groupTargetsByUp3[key] ?? [];
  const numberTargets = config.whaCenter.numberTargetsByUp3[key] ?? [];

  if (groupTargets.length === 0 && numberTargets.length === 0) {
    console.warn(`[WHACENTER] No targets configured for UP3 "${up3}", skipping send`);
    return;
  }

  console.log(`[WHACENTER] Dispatching (UP3=${up3}) to ${groupTargets.length} group(s) + ${numberTargets.length} number(s)`);

  const tasks = [
    ...groupTargets.map((target) => send(deviceId, target, message, true)),
    ...numberTargets.map((target) => send(deviceId, target, message, false)),
  ];

  const results = await Promise.allSettled(tasks);
  const allTargets = [...groupTargets, ...numberTargets];

  results.forEach((result, i) => {
    if (result.status === 'rejected') {
      console.error(`[WHACENTER] Failed to send to ${allTargets[i]}:`, result.reason);
    }
  });
}
