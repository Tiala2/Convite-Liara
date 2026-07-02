import { readFile } from 'node:fs/promises';
import process from 'node:process';
import pg from 'pg';

const { Client } = pg;

const projectRef = process.env.SUPABASE_PROJECT_REF;
const password = process.env.SUPABASE_DB_PASSWORD;

if (!projectRef || !password) {
  console.error('Defina SUPABASE_PROJECT_REF e SUPABASE_DB_PASSWORD.');
  process.exit(1);
}

const client = new Client({
  host: `db.${projectRef}.supabase.co`,
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password,
  ssl: { rejectUnauthorized: false },
});

const files =
  process.argv.length > 2
    ? process.argv.slice(2)
    : ['supabase/schema.sql', 'supabase/seed-gifts.sql'];

try {
  await client.connect();

  for (const file of files) {
    const sql = (await readFile(file, 'utf8')).replace(/^\uFEFF/, '');
    console.log(`Aplicando ${file}...`);
    await client.query(sql);
  }

  const { rows: settings } = await client.query(
    'select baby_name, event_date, event_time, address from public.event_settings limit 1',
  );
  const { rows: gifts } = await client.query(
    "select count(*)::int as total, count(*) filter (where status = 'available')::int as available from public.gifts",
  );

  console.log('Evento:', settings[0]);
  console.log('Presentes:', gifts[0]);
} finally {
  await client.end().catch(() => undefined);
}
