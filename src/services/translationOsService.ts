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

  return response.data[0].id; // id_request returned by TOS
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

// Language cache
let languageCache: Set<string> | null = null;
let lastFetch = 0;
const CACHE_TTL_MS = 60 * 60 * 1000 * 24; // 24 hours

async function fetchSupportedLanguages(): Promise<Set<string>> {
  if (languageCache && Date.now() - lastFetch < CACHE_TTL_MS) {
    return languageCache;
  }
  const res = await client.get('/symbol/languages');
  languageCache = new Set(res.data.map((l: { key: string }) => l.key));
  lastFetch = Date.now();

  return languageCache;
}

export async function isLanguageSupported(code: string): Promise<boolean> {
  const langs = await fetchSupportedLanguages();

  return langs.has(code);
}