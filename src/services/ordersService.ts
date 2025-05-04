import { pool } from './db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { v4 as uuidv4 } from 'uuid';

export interface Order {
  id: number;
  uuid: string;
  name: string;
  sourceLang: string;
  targetLang: string;
  createdAt: Date;
  submittedAt: Date | null;
}

export interface Text {
  id: number;
  orderId: number;
  content: string;
  translatedContent: string | null;
  tosRequestId: number | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

function mapDbOrder(row: any): Order {
  return {
    id: row.id,
    uuid: row.uuid,
    name: row.name,
    sourceLang: row.source_lang,
    targetLang: row.target_lang,
    createdAt: row.created_at,
    submittedAt: row.submitted_at,
  };
}

export async function createOrder(name: string, sourceLang: string, targetLang: string): Promise<Order> {
  const uuid = uuidv4();
  const [result] = await pool.query<ResultSetHeader>(
    'INSERT INTO orders (uuid, name, source_lang, target_lang) VALUES (?,?,?,?)',
    [uuid, name, sourceLang, targetLang],
  );
  const id = result.insertId;

  console.log(`Order created: ${id} (${sourceLang} -> ${targetLang})`);

  return { id, uuid, name, sourceLang, targetLang, createdAt: new Date(), submittedAt: null };
}

export async function addText(orderId: number, content: string): Promise<Text> {
  const [result] = await pool.query<ResultSetHeader>(
    'INSERT INTO texts (order_id, content) VALUES (?,?)',
    [orderId, content],
  );
  const id = result.insertId;

  console.log(`Text added to order ${orderId}: ${id} (${content})`);

  return {
    id,
    orderId,
    content,
    translatedContent: null,
    tosRequestId: null,
    status: 'pending',
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

export async function getOrderWithTexts(orderId: number): Promise<{ order: Order; texts: Text[] }> {
  const [orders] = await pool.query<RowDataPacket[]>('SELECT * FROM orders WHERE id = ?', [orderId]);
  if (!orders.length) throw new Error('Order not found');
  const order = mapDbOrder(orders[0]);

  const [texts] = await pool.query<RowDataPacket[]>('SELECT * FROM texts WHERE order_id = ?', [orderId]);
  
  const mappedTexts: Text[] = (texts as any[]).map((t) => ({
    id: t.id,
    orderId: t.order_id,
    content: t.content,
    translatedContent: t.translated_content,
    tosRequestId: t.tos_request_id,
    status: t.status,
    createdAt: t.created_at,
    updatedAt: t.updated_at,
  }));

  console.log(`Order ${orderId} fetched with ${mappedTexts.length} texts`);

  return { order, texts: mappedTexts };
}

export async function markTextSubmitted(id: number, tosRequestId: number) {
  console.log(`Marking text ${id} as submitted with TOS request ID: ${tosRequestId}`);
  await pool.query(
    'UPDATE texts SET tos_request_id = ?, status = "submitted", updated_at = NOW() WHERE id = ?',
    [tosRequestId, id],
  );
}

export async function updateTextStatus(id: number, status: string, translatedContent?: string) {
  console.log(`Updating text ${id} status to ${status}`);
  await pool.query(
    'UPDATE texts SET status = ?, translated_content = IFNULL(?, translated_content), updated_at = NOW() WHERE id = ?',
    [status, translatedContent ?? null, id],
  );
}

export async function setOrderSubmitted(orderId: number) {
  console.log(`Setting order ${orderId} as submitted`);
  await pool.query('UPDATE orders SET submitted_at = NOW() WHERE id = ?', [orderId]);
}

export async function getUndeliveredTexts(
  pageSize: number = 100
): Promise<Text[]> {
  let offset = 0;
  let rows: RowDataPacket[] = [];
  do {
    console.log(
      `Fetching texts with status != "delivered", offset ${offset}, limit ${pageSize}`
    );
    const [fetched] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM texts WHERE status <> ? ORDER BY id LIMIT ? OFFSET ?',
      ['delivered', pageSize, offset]
    );
    rows = fetched;
    if ((rows as any[]).length > 0) {
      return (rows as any[]).map((t) => ({
        id: t.id,
        orderId: t.order_id,
        content: t.content,
        translatedContent: t.translated_content,
        tosRequestId: t.tos_request_id,
        status: t.status,
        createdAt: t.created_at,
        updatedAt: t.updated_at,
      }));
    }
    offset += pageSize;
  } while ((rows as any[]).length === pageSize);
  return [];
}