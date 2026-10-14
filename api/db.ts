import type { IncomingMessage, ServerResponse } from 'node:http';
import { routeApi } from '../server/http.js';

// Función de Vercel: delega en el enrutador común de la API (server/http.ts)
export default async function handler(req: IncomingMessage, res: ServerResponse) {
  await routeApi(req, res);
}
