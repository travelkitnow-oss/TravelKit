import type { IncomingMessage, ServerResponse } from 'node:http';
import { handleDb, handleFile, handleUpload, type HandlerResult } from './handlers.js';

type Req = IncomingMessage & { body?: unknown };

/** Lee el cuerpo JSON (Vercel ya lo trae parseado en req.body; Vite no). */
async function readJson(req: Req): Promise<unknown> {
  if (req.body !== undefined) {
    return typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  }
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  const text = Buffer.concat(chunks).toString('utf8');
  return text ? JSON.parse(text) : {};
}

function send(res: ServerResponse, result: HandlerResult) {
  res.statusCode = result.status;
  for (const [k, v] of Object.entries(result.headers || {})) res.setHeader(k, v);
  if (result.raw) {
    res.end(Buffer.from(result.raw));
    return;
  }
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(result.body ?? null));
}

/** Atiende /api/db, /api/upload y /api/file. Devuelve false si la ruta no es de la API. */
export async function routeApi(req: Req, res: ServerResponse): Promise<boolean> {
  const url = new URL(req.url || '/', 'http://localhost');
  const route = url.pathname.replace(/\/+$/, '');
  try {
    if (route === '/api/db' && req.method === 'POST') {
      send(res, await handleDb(await readJson(req)));
      return true;
    }
    if (route === '/api/upload' && req.method === 'POST') {
      send(res, await handleUpload(await readJson(req)));
      return true;
    }
    if (route === '/api/file' && req.method === 'GET') {
      send(res, await handleFile(url.searchParams.get('key')));
      return true;
    }
  } catch (err) {
    send(res, { status: 500, body: { error: { message: (err as Error).message } } });
    return true;
  }
  if (route.startsWith('/api/')) {
    send(res, { status: 404, body: { error: { message: 'Ruta de API inexistente.' } } });
    return true;
  }
  return false;
}
