/**
 * Cliente de datos de Travel Kit (Neon).
 *
 * Mantiene la misma forma de uso que tenía supabase-js para no reescribir las
 * pantallas:  await db.from('clients').select('*').eq('id', x).single()
 * Cada consulta se envía a la API propia (/api/db), que la valida y la ejecuta
 * en Neon. Los archivos se suben a /api/upload y se sirven desde /api/file.
 */

export interface DbError {
  message: string;
  code?: string;
  details?: string;
  hint?: string;
}

export interface DbResponse<T = any> {
  data: T;
  error: DbError | null;
}

type Action = 'select' | 'insert' | 'update' | 'upsert' | 'delete';
type Filter = { column: string; op: string; value?: unknown; negate?: boolean };

async function post<T>(url: string, payload: unknown): Promise<DbResponse<T>> {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const json = await res.json().catch(() => null);
    if (!res.ok || !json || json.error) {
      return { data: null as T, error: json?.error ?? { message: `Error ${res.status} en la API` } };
    }
    return { data: json.data as T, error: null };
  } catch (err) {
    return { data: null as T, error: { message: (err as Error).message || 'No se pudo conectar con la API' } };
  }
}

class QueryBuilder<T = any[]> implements PromiseLike<DbResponse<T>> {
  private action: Action = 'select';
  private columns?: string;
  private filters: Filter[] = [];
  private orders: { column: string; ascending?: boolean; nullsFirst?: boolean }[] = [];
  private limitCount?: number;
  private values?: unknown;
  private onConflict?: string;
  private singleMode: 'single' | 'maybe' | null = null;
  private readonly table: string;

  constructor(table: string) {
    this.table = table;
  }

  // ─── Acciones ───
  select(columns = '*') {
    // Después de insert/update/upsert/delete, select() define las columnas devueltas
    this.columns = columns;
    return this;
  }

  insert(values: object | object[]) {
    this.action = 'insert';
    this.values = values;
    return this;
  }

  upsert(values: object | object[], options?: { onConflict?: string }) {
    this.action = 'upsert';
    this.values = values;
    this.onConflict = options?.onConflict;
    return this;
  }

  update(values: object) {
    this.action = 'update';
    this.values = values;
    return this;
  }

  delete() {
    this.action = 'delete';
    return this;
  }

  // ─── Filtros ───
  private addFilter(column: string, op: string, value?: unknown, negate = false) {
    this.filters.push({ column, op, value, negate });
    return this;
  }

  eq(column: string, value: unknown) { return this.addFilter(column, 'eq', value); }
  neq(column: string, value: unknown) { return this.addFilter(column, 'neq', value); }
  gt(column: string, value: unknown) { return this.addFilter(column, 'gt', value); }
  gte(column: string, value: unknown) { return this.addFilter(column, 'gte', value); }
  lt(column: string, value: unknown) { return this.addFilter(column, 'lt', value); }
  lte(column: string, value: unknown) { return this.addFilter(column, 'lte', value); }
  like(column: string, pattern: string) { return this.addFilter(column, 'like', pattern); }
  ilike(column: string, pattern: string) { return this.addFilter(column, 'ilike', pattern); }
  in(column: string, values: unknown[]) { return this.addFilter(column, 'in', values); }
  is(column: string, value: null | boolean) { return this.addFilter(column, 'is', value); }
  not(column: string, op: string, value: unknown) { return this.addFilter(column, op, value, true); }

  // ─── Modificadores ───
  order(column: string, options?: { ascending?: boolean; nullsFirst?: boolean }) {
    this.orders.push({ column, ascending: options?.ascending, nullsFirst: options?.nullsFirst });
    return this;
  }

  limit(count: number) {
    this.limitCount = count;
    return this;
  }

  /** Devuelve una sola fila (error si no hay exactamente una). */
  single<R = any>() {
    this.singleMode = 'single';
    return this as unknown as QueryBuilder<R>;
  }

  /** Devuelve una fila o null. */
  maybeSingle<R = any>() {
    this.singleMode = 'maybe';
    return this as unknown as QueryBuilder<R>;
  }

  // ─── Ejecución ───
  private async execute(): Promise<DbResponse<T>> {
    const res = await post<any[]>('/api/db', {
      table: this.table,
      action: this.action,
      columns: this.columns,
      filters: this.filters,
      order: this.orders,
      limit: this.limitCount,
      values: this.values,
      onConflict: this.onConflict,
    });
    if (res.error) return { data: null as T, error: res.error };

    const rows = res.data || [];
    if (this.singleMode === 'single') {
      if (rows.length !== 1) {
        return {
          data: null as T,
          error: { code: 'PGRST116', message: rows.length ? 'Se esperaba una sola fila y llegaron varias' : 'No se encontró ninguna fila' },
        };
      }
      return { data: rows[0] as T, error: null };
    }
    if (this.singleMode === 'maybe') {
      if (rows.length > 1) return { data: null as T, error: { code: 'PGRST116', message: 'Se esperaba como máximo una fila' } };
      return { data: (rows[0] ?? null) as T, error: null };
    }
    return { data: rows as T, error: null };
  }

  then<R1 = DbResponse<T>, R2 = never>(
    onfulfilled?: ((value: DbResponse<T>) => R1 | PromiseLike<R1>) | null,
    onrejected?: ((reason: unknown) => R2 | PromiseLike<R2>) | null
  ): PromiseLike<R1 | R2> {
    return this.execute().then(onfulfilled, onrejected);
  }
}

// ─── Archivos ───
function fileToBase64(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1] || '');
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function bucket(name: string) {
  return {
    async upload(path: string, file: Blob): Promise<DbResponse<{ path: string } | null>> {
      try {
        const base64 = await fileToBase64(file);
        return post('/api/upload', { bucket: name, path, contentType: file.type || 'application/octet-stream', base64 });
      } catch (err) {
        return { data: null, error: { message: (err as Error).message } };
      }
    },
    getPublicUrl(path: string) {
      return { data: { publicUrl: `/api/file?key=${encodeURIComponent(`${name}/${path}`)}` } };
    },
  };
}

export const db = {
  from<T = any[]>(table: string) {
    return new QueryBuilder<T>(table);
  },
  storage: {
    from: bucket,
  },
};
