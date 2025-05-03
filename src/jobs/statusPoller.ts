import * as orderService from '../services/ordersService';
import * as tos from '../services/translationOsService';
import { pool } from '../services/db';

const POLLING_INTERVAL = Number(process.env.POLLING_INTERVAL_SEC || 60) * 1000;
const FIRST_DELAY = 5000; // wait 5s so MySQL container is up

async function dbReady(): Promise<boolean> {
  try {
    await pool.query('SELECT 1');
    return true;
  } catch {
    return false;
  }
}

export async function pollOnce() {
  const ready = await dbReady();
  if (!ready) return; // skip if DB still booting

  const texts = await orderService.getSubmittedOrInProgressTexts();
  if (!texts.length) return;

  const idsByRequest = texts
    .map((t) => t.tosRequestId)
    .filter((n): n is number => typeof n === 'number');

  if (!idsByRequest.length) return;

  const body: any = {};
  if (idsByRequest.length) body.id_request = idsByRequest;

  const statuses = await tos.getStatus(body);
  for (const st of statuses) {
    const text = texts.find((t) => t.tosRequestId === st.id);
    if (!text) continue;

    const stStatus = (st.status as string).toLowerCase();
    if (stStatus.includes('in progress') && text.status !== 'in_progress') {
      await orderService.updateTextStatus(text.id, 'in_progress');
    } else if (stStatus.includes('delivered') || stStatus.includes('completed') || stStatus.includes('succeeded')) {
      await orderService.updateTextStatus(text.id, 'delivered', st.translated_content);
    } else if (stStatus.includes('failed')) {
      await orderService.updateTextStatus(text.id, 'failed');
    } else if (stStatus.includes('pending')) {
      await orderService.updateTextStatus(text.id, 'pending');
    }
  }
}

export function startStatusPoller() {
  console.log(`Status poller started (every ${POLLING_INTERVAL / 1000}s, first run in ${FIRST_DELAY / 1000}s)`);

  const runPoll = async () => {
    try {
      await pollOnce();
    } catch (e) {
      console.error('Status poller error', e);
    }
  };

  setTimeout(() => {
    runPoll();
    setInterval(runPoll, POLLING_INTERVAL);
  }, FIRST_DELAY);
}