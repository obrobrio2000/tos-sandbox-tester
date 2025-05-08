import * as orderService from '../services/ordersService';
import * as tos from '../services/translationOsService';
import { pool } from '../services/db';
import axios from 'axios';

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

export async function fetchTranslatedContentFromUrl(url: string): Promise<string> {
  try {
    const response = await axios.get(url);
    return response.data;
  } catch (error) {
    console.error(`Error fetching translated content from ${url}:`, error);
    throw error; // Re-throw to be caught by the caller
  }
}

export async function pollOnce() {
  const ready = await dbReady();
  if (!ready) return; // skip if DB still booting

  const texts = await orderService.getActiveTexts();
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

    const rawStatus = (st.status as string).toLowerCase();
    const normalizedStatus = rawStatus.replace(/ /g, '_');
    
    let contentToStore: string | null = null;

    if (st.translated_content) {
      contentToStore = st.translated_content; // Direct content from API status, if any
      await orderService.updateTextStatus(text.tosRequestId, 'delivered', contentToStore);
      continue;
    }
    
    if (st.translated_content_url) {
      try {
        console.log(`Fetching translated content for text ${text.id} from URL: ${st.translated_content_url}`);
        contentToStore = await fetchTranslatedContentFromUrl(st.translated_content_url);
        console.log(`Successfully fetched translated content for text ${text.id}. Length: ${contentToStore?.length}`);
        await orderService.updateTextStatus(text.tosRequestId, 'delivered', contentToStore);
        continue;
      } catch (fetchError) {
        // Error is already logged by fetchTranslatedContentFromUrl
        console.error(`Failed to fetch translated content for text ${text.id} from URL ${st.translated_content_url}. Status will be updated to ${normalizedStatus}, but content might be missing or based on direct API field.`);
        // contentToStore remains st.translated_content (if any) or undefined
      }
    }
    
    await orderService.updateTextStatus(text.tosRequestId, normalizedStatus, contentToStore);
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