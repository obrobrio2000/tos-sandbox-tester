import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const apiKey = process.env.TOS_API_KEY;
const baseURL = process.env.TOS_BASE_URL;
const IS_SANDBOX = /sandbox/.test(baseURL ?? '');

const client = axios.create({
  baseURL,
  headers: {
    'x-api-key': apiKey,
    'Content-Type': 'application/json',
  },
});

// --- Language cache --------------------------------------------------------
let languageCache: Set<string> | null = null;
let lastFetch = 0;
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

async function fetchSupportedLanguages(): Promise<Set<string>> {
  if (languageCache && Date.now() - lastFetch < CACHE_TTL_MS) {
    return languageCache;
  }
  const res = await client.get('/symbol/languages');
  languageCache = new Set(res.data.map((l: { key: string }) => l.key));
  lastFetch = Date.now();

  // console.log('Supported languages fetched:', languageCache);

  return languageCache;
}

export async function isLanguageSupported(code: string): Promise<boolean> {
  const langs = await fetchSupportedLanguages();

  // console.log('Supported languages:', langs);

  return langs.has(code);
}

// --- Business functions ----------------------------------------------------
export async function submitTextForTranslation(
  idContent: string | number,
  content: string,
  sourceLang: string,
  targetLang: string,
): Promise<number> {
  const payload = [
    {
      id_content: idContent,
      content,
      content_type: 'text/plain',
      source_language: sourceLang,
      target_languages: [targetLang],
      service_type: 'premium',
    },
  ];

  const response = await client.post('/translate', payload);
  
  console.log('Translation request response:', response.data);

  return response.data[0].id_content; // id_request returned by TOS
}

export async function triggerSandboxDelivery(ids: number[], retries = 3, delayMs = 30000) {
  if (!IS_SANDBOX) return; // noop on production
  let attempt = 0;
  while (attempt < retries) {
    try {
      await client.post('/sandbox/delivery', { ids_requests: ids });
      console.log(`Sandbox delivery triggered (attempt ${attempt + 1}) for`, ids);
      return;
    } catch (e: any) {
      const status = e?.response?.status;
      // 500 often means IDs are not yet ingestible – wait & retry a few times
      if (status === 500 && attempt < retries - 1) {
        console.warn(`Sandbox delivery 500 (attempt ${attempt + 1}). Retrying in ${delayMs / 1000}s…`);
        await new Promise((r) => setTimeout(r, delayMs));
        attempt += 1;
        continue;
      }
      console.error('Sandbox delivery trigger failed', status, e?.message);
      return;
    }
  }
}

interface StatusRequestBody {
  id_request?: number | number[];
  id_order?: string | string[];
  id_content?: string | number | (string | number)[];
}

export async function getStatus(body: StatusRequestBody) {
  const response = await client.post('/status', body);

  console.log('Translation status response:', response.data);

  return response.data;
}