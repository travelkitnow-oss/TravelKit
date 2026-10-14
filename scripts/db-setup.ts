/**
 * Crea (o actualiza) las tablas de Travel Kit en Neon.
 * Uso:  npm run db:setup
 * Lee DATABASE_URL de .env.local o .env.
 */
import { existsSync, readFileSync } from 'node:fs';
import { neon } from '@neondatabase/serverless';

for (const file of ['.env.local', '.env']) {
  if (existsSync(file)) process.loadEnvFile(file);
}

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('Falta DATABASE_URL. Agregala en .env.local (cadena de conexión de Neon).');
  process.exit(1);
}

const sql = neon(url);
const schema = readFileSync(new URL('../db/schema.sql', import.meta.url), 'utf8');

// La API HTTP de Neon ejecuta una sentencia por llamada: separamos por ';' de fin de línea
const statements = schema
  .split('\n')
  .filter((line) => !line.trim().startsWith('--'))
  .join('\n')
  .split(/;\s*(?:\n|$)/)
  .map((s) => s.trim())
  .filter(Boolean);

console.log(`Aplicando ${statements.length} sentencias en Neon...`);
for (const statement of statements) {
  const label = statement.split('\n')[0].slice(0, 70);
  try {
    await sql.query(statement);
    console.log('  ✓', label);
  } catch (err) {
    console.error('  ✗', label, '\n   ', (err as Error).message);
    process.exit(1);
  }
}

const tables = await sql.query(
  `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY 1`
) as { table_name: string }[];
console.log(`\nListo. Tablas en la base (${tables.length}): ${tables.map((t) => t.table_name).join(', ')}`);
