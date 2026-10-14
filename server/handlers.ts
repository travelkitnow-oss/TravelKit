/**
 * API de datos de Travel Kit sobre Neon (PostgreSQL).
 *
 * Reemplaza a la API REST de Supabase. El cliente (src/lib/db.ts) arma una
 * descripción de la consulta y la manda a POST /api/db; acá se valida contra
 * el esquema real (tablas y columnas), se arma SQL parametrizado y se ejecuta.
 * También sirve la subida y descarga de archivos (antes Supabase Storage).
 *
 * Estas funciones no dependen de ningún framework: las usan tanto las
 * funciones de Vercel (carpeta /api) como el servidor de desarrollo de Vite.
 */
import { neon, types } from '@neondatabase/serverless';

// ─── Tipos de Postgres → JSON igual que devolvía Supabase ───────────────
// numeric/int8 como número; fechas como string ISO (no como objeto Date).
types.setTypeParser(1700, (v: string) => (v === null ? null : parseFloat(v)));
types.setTypeParser(20, (v: string) => (v === null ? null : Number(v)));
const toIso = (v: string) => (v === null ? null : v.replace(' ', 'T').replace(/([+-]\d\d)$/, '$1:00'));
types.setTypeParser(1184, toIso); // timestamptz
types.setTypeParser(1114, toIso); // timestamp
types.setTypeParser(1082, (v: string) => v); // date

function getSql() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('Falta la variable DATABASE_URL (cadena de conexión de Neon).');
  return neon(url);
}

export interface HandlerResult {
  status: number;
  body?: unknown;
  headers?: Record<string, string>;
  raw?: Uint8Array;
}

// ─── Esquema: tablas y columnas permitidas (se lee de la base y se cachea) ─
type ColumnInfo = { type: string };
type TableInfo = { columns: Map<string, ColumnInfo>; primaryKey: string[] };
let schemaCache: Promise<Map<string, TableInfo>> | null = null;

/** Tablas internas que la API genérica nunca expone. */
const PRIVATE_TABLES = new Set(['stored_files']);

function loadSchema(): Promise<Map<string, TableInfo>> {
  if (!schemaCache) {
    schemaCache = (async () => {
      const sql = getSql();
      const cols = await sql.query(
        `SELECT table_name, column_name, data_type
           FROM information_schema.columns
          WHERE table_schema = 'public'`
      ) as { table_name: string; column_name: string; data_type: string }[];
      const pks = await sql.query(
        `SELECT tc.table_name, kcu.column_name
           FROM information_schema.table_constraints tc
           JOIN information_schema.key_column_usage kcu
             ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
          WHERE tc.table_schema = 'public' AND tc.constraint_type = 'PRIMARY KEY'`
      ) as { table_name: string; column_name: string }[];

      const schema = new Map<string, TableInfo>();
      for (const c of cols) {
        if (PRIVATE_TABLES.has(c.table_name)) continue;
        if (!schema.has(c.table_name)) schema.set(c.table_name, { columns: new Map(), primaryKey: [] });
        schema.get(c.table_name)!.columns.set(c.column_name, { type: c.data_type });
      }
      for (const pk of pks) schema.get(pk.table_name)?.primaryKey.push(pk.column_name);
      return schema;
    })().catch((err) => {
      schemaCache = null; // reintentar en la próxima llamada
      throw err;
    });
  }
  return schemaCache;
}

const ident = (name: string) => `"${name.replace(/"/g, '""')}"`;

class QueryError extends Error {
  code: string;
  constructor(message: string, code = 'BAD_REQUEST') {
    super(message);
    this.code = code;
  }
}

function getTable(schema: Map<string, TableInfo>, table: string): TableInfo {
  const info = schema.get(table);
  if (!info) throw new QueryError(`La tabla "${table}" no existe.`, '42P01');
  return info;
}

function checkColumn(info: TableInfo, table: string, column: string) {
  if (!info.columns.has(column)) throw new QueryError(`La columna "${column}" no existe en "${table}".`, '42703');
}

/** Las columnas json/jsonb necesitan el valor serializado; el resto va tal cual. */
function toParam(info: TableInfo, column: string, value: unknown) {
  const type = info.columns.get(column)?.type;
  if ((type === 'jsonb' || type === 'json') && value !== null && value !== undefined) {
    return JSON.stringify(value);
  }
  if (value !== null && typeof value === 'object' && !(value instanceof Date)) {
    return JSON.stringify(value);
  }
  return value;
}

// ─── Relaciones embebidas: select('*, clients(name)') ──────────────────
/** Columna local que apunta a la tabla relacionada. Por defecto `<tabla>_id` → client_id. */
const RELATION_KEYS: Record<string, Record<string, string>> = {
  client_profiles: { clients: 'id' },
};

function relationKey(table: string, related: string) {
  return RELATION_KEYS[table]?.[related] ?? `${related.replace(/s$/, '')}_id`;
}

/** Divide la lista de columnas de PostgREST respetando paréntesis. */
function splitColumns(columns: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = '';
  for (const ch of columns) {
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if (ch === ',' && depth === 0) {
      parts.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  if (current.trim()) parts.push(current.trim());
  return parts;
}

function buildSelectList(schema: Map<string, TableInfo>, table: string, info: TableInfo, columns = '*') {
  const out: string[] = [];
  for (const part of splitColumns(columns.replace(/\s+/g, ' '))) {
    const embed = part.match(/^([a-z_][a-z0-9_]*)\s*\(([^)]*)\)$/i);
    if (embed) {
      const [, related, relCols] = embed;
      const relInfo = getTable(schema, related);
      const fk = relationKey(table, related);
      checkColumn(info, table, fk);
      const fields = relCols.split(',').map((c) => c.trim()).filter(Boolean);
      const pairs = (fields.includes('*') ? [...relInfo.columns.keys()] : fields).map((c) => {
        checkColumn(relInfo, related, c);
        return `'${c}', r.${ident(c)}`;
      });
      out.push(
        `(SELECT json_build_object(${pairs.join(', ')}) FROM ${ident(related)} r WHERE r."id" = t.${ident(fk)}) AS ${ident(related)}`
      );
    } else if (part === '*') {
      out.push('t.*');
    } else {
      checkColumn(info, table, part);
      out.push(`t.${ident(part)}`);
    }
  }
  return out.join(', ') || 't.*';
}

// ─── Filtros ────────────────────────────────────────────────────────────
type Filter = { column: string; op: string; value?: unknown; negate?: boolean };

function buildWhere(info: TableInfo, table: string, filters: Filter[] = [], params: unknown[]) {
  const clauses: string[] = [];
  const p = (v: unknown) => {
    params.push(v);
    return `$${params.length}`;
  };
  for (const f of filters) {
    checkColumn(info, table, f.column);
    const col = `t.${ident(f.column)}`;
    let clause: string;
    switch (f.op) {
      case 'eq': clause = f.value === null ? `${col} IS NULL` : `${col} = ${p(toParam(info, f.column, f.value))}`; break;
      case 'neq': clause = f.value === null ? `${col} IS NOT NULL` : `${col} <> ${p(toParam(info, f.column, f.value))}`; break;
      case 'gt': clause = `${col} > ${p(f.value)}`; break;
      case 'gte': clause = `${col} >= ${p(f.value)}`; break;
      case 'lt': clause = `${col} < ${p(f.value)}`; break;
      case 'lte': clause = `${col} <= ${p(f.value)}`; break;
      case 'like': clause = `${col}::text LIKE ${p(f.value)}`; break;
      case 'ilike': clause = `${col}::text ILIKE ${p(f.value)}`; break;
      case 'in': {
        const list = Array.isArray(f.value) ? f.value : [];
        clause = list.length ? `${col} = ANY(${p(list)})` : 'FALSE';
        break;
      }
      case 'is': {
        const v = f.value;
        if (v !== null && v !== true && v !== false) throw new QueryError('El filtro "is" solo acepta null, true o false.');
        clause = `${col} IS ${v === null ? 'NULL' : v ? 'TRUE' : 'FALSE'}`;
        break;
      }
      default:
        throw new QueryError(`Operador de filtro no soportado: ${f.op}`);
    }
    clauses.push(f.negate ? `NOT (${clause})` : clause);
  }
  return clauses.length ? ` WHERE ${clauses.join(' AND ')}` : '';
}

// ─── Ejecución de la consulta ───────────────────────────────────────────
export interface DbRequest {
  table: string;
  action: 'select' | 'insert' | 'update' | 'upsert' | 'delete';
  columns?: string;
  filters?: Filter[];
  order?: { column: string; ascending?: boolean; nullsFirst?: boolean }[];
  limit?: number;
  values?: Record<string, unknown> | Record<string, unknown>[];
  onConflict?: string;
  returning?: boolean;
}

async function runQuery(req: DbRequest) {
  let schema = await loadSchema();
  if (!schema.has(req.table)) {
    // El esquema pudo cambiar (p. ej. se corrió db:setup después de cachearlo): releerlo una vez
    schemaCache = null;
    schema = await loadSchema();
  }
  const info = getTable(schema, req.table);
  const table = ident(req.table);
  const params: unknown[] = [];
  const sql = getSql();

  if (req.action === 'select') {
    let text = `SELECT ${buildSelectList(schema, req.table, info, req.columns)} FROM ${table} t`;
    text += buildWhere(info, req.table, req.filters, params);
    if (req.order?.length) {
      text += ' ORDER BY ' + req.order.map((o) => {
        checkColumn(info, req.table, o.column);
        const dir = o.ascending === false ? 'DESC' : 'ASC';
        const nulls = o.nullsFirst === undefined ? '' : o.nullsFirst ? ' NULLS FIRST' : ' NULLS LAST';
        return `t.${ident(o.column)} ${dir}${nulls}`;
      }).join(', ');
    }
    if (typeof req.limit === 'number') text += ` LIMIT ${Math.max(0, Math.floor(req.limit))}`;
    return sql.query(text, params);
  }

  const returning = ` RETURNING ${buildSelectList(schema, req.table, info, req.columns || '*')}`;

  if (req.action === 'insert' || req.action === 'upsert') {
    const rows = (Array.isArray(req.values) ? req.values : [req.values]).filter(Boolean) as Record<string, unknown>[];
    if (!rows.length) return [];
    const cols = [...new Set(rows.flatMap((r) => Object.keys(r)))];
    cols.forEach((c) => checkColumn(info, req.table, c));
    const valuesSql = rows.map((row) => '(' + cols.map((c) => {
      if (!(c in row) || row[c] === undefined) return 'DEFAULT';
      params.push(toParam(info, c, row[c]));
      return `$${params.length}`;
    }).join(', ') + ')').join(', ');

    let text = `INSERT INTO ${table} AS t (${cols.map(ident).join(', ')}) VALUES ${valuesSql}`;
    if (req.action === 'upsert') {
      const conflict = req.onConflict ? req.onConflict.split(',').map((c) => c.trim()) : info.primaryKey;
      conflict.forEach((c) => checkColumn(info, req.table, c));
      const updates = cols.filter((c) => !conflict.includes(c));
      text += ` ON CONFLICT (${conflict.map(ident).join(', ')}) ` +
        (updates.length ? `DO UPDATE SET ${updates.map((c) => `${ident(c)} = EXCLUDED.${ident(c)}`).join(', ')}` : 'DO NOTHING');
    }
    return sql.query(text + returning, params);
  }

  if (req.action === 'update') {
    const values = (req.values || {}) as Record<string, unknown>;
    const cols = Object.keys(values).filter((c) => values[c] !== undefined);
    if (!cols.length) return [];
    cols.forEach((c) => checkColumn(info, req.table, c));
    const set = cols.map((c) => {
      params.push(toParam(info, c, values[c]));
      return `${ident(c)} = $${params.length}`;
    }).join(', ');
    const where = buildWhere(info, req.table, req.filters, params);
    if (!where) throw new QueryError('UPDATE sin filtros no está permitido.');
    return sql.query(`UPDATE ${table} AS t SET ${set}${where}${returning}`, params);
  }

  if (req.action === 'delete') {
    const where = buildWhere(info, req.table, req.filters, params);
    if (!where) throw new QueryError('DELETE sin filtros no está permitido.');
    return sql.query(`DELETE FROM ${table} AS t${where}${returning}`, params);
  }

  throw new QueryError(`Acción no soportada: ${String(req.action)}`);
}

function errorBody(err: unknown) {
  const e = err as { message?: string; code?: string; detail?: string; hint?: string };
  return { error: { message: e?.message || 'Error desconocido', code: e?.code || 'INTERNAL', details: e?.detail || '', hint: e?.hint || '' } };
}

export async function handleDb(body: unknown): Promise<HandlerResult> {
  try {
    const req = body as DbRequest;
    if (!req || typeof req.table !== 'string' || typeof req.action !== 'string') {
      return { status: 400, body: errorBody(new QueryError('Consulta inválida.')) };
    }
    const rows = await runQuery(req);
    return { status: 200, body: { data: rows } };
  } catch (err) {
    const status = err instanceof QueryError ? 400 : 500;
    return { status, body: errorBody(err) };
  }
}

// ─── Archivos (reemplazo de Supabase Storage) ───────────────────────────
const MAX_FILE_BYTES = 4 * 1024 * 1024; // límite de cuerpo de las funciones de Vercel ≈ 4,5 MB

export async function handleUpload(body: unknown): Promise<HandlerResult> {
  try {
    const { bucket, path, contentType, base64 } = (body || {}) as Record<string, string>;
    if (!bucket || !path || !base64) return { status: 400, body: errorBody(new QueryError('Faltan datos del archivo.')) };
    if (!/^[a-z0-9_-]+$/i.test(bucket) || path.includes('..')) {
      return { status: 400, body: errorBody(new QueryError('Ruta de archivo inválida.')) };
    }
    const size = Math.floor((base64.length * 3) / 4);
    if (size > MAX_FILE_BYTES) return { status: 413, body: errorBody(new QueryError('El archivo supera los 4 MB.')) };
    const key = `${bucket}/${path}`;
    await getSql().query(
      `INSERT INTO stored_files (key, content_type, size_bytes, data)
       VALUES ($1, $2, $3, decode($4, 'base64'))
       ON CONFLICT (key) DO UPDATE SET content_type = EXCLUDED.content_type,
         size_bytes = EXCLUDED.size_bytes, data = EXCLUDED.data, created_at = now()`,
      [key, contentType || 'application/octet-stream', size, base64]
    );
    return { status: 200, body: { data: { path, key } } };
  } catch (err) {
    return { status: 500, body: errorBody(err) };
  }
}

export async function handleFile(key: string | null): Promise<HandlerResult> {
  if (!key) return { status: 400, body: { error: 'Falta el parámetro key.' } };
  try {
    const rows = await getSql().query(
      `SELECT content_type, encode(data, 'base64') AS b64 FROM stored_files WHERE key = $1`,
      [key]
    ) as { content_type: string; b64: string }[];
    if (!rows.length) return { status: 404, body: { error: 'Archivo no encontrado.' } };
    const bin = Uint8Array.from(atob(rows[0].b64), (c) => c.charCodeAt(0));
    return {
      status: 200,
      raw: bin,
      headers: { 'Content-Type': rows[0].content_type, 'Cache-Control': 'public, max-age=31536000, immutable' },
    };
  } catch (err) {
    return { status: 500, body: errorBody(err) };
  }
}
