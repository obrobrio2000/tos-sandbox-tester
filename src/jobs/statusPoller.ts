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

  const texts = await orderService.getUndeliveredTexts();
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
    // Use the api status verbatim (lowercased, spaces → underscores)
    const rawStatus = (st.status as string).toLowerCase();
    const normalizedStatus = rawStatus.replace(/ /g, '_');
    // Pass translated_content if present (will be undefined otherwise)
    await orderService.updateTextStatus(text.id, normalizedStatus, st.translated_content);
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